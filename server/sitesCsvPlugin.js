import fs from 'node:fs';
import path from 'node:path';

function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentVal);
        currentVal = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      } else if (char === '\n') {
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map(h => h.trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && !row[0].trim()) continue; // skip blank line
    const item = {};
    headers.forEach((header, idx) => {
      item[header] = row[idx] !== undefined ? row[idx].trim() : '';
    });
    data.push(item);
  }

  return data;
}

function escapeCSVField(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function stringifyCSV(items, headers = ['id', 'name', 'url', 'msg', 'type', 'fileName']) {
  const lines = [headers.join(',')];
  for (const item of items) {
    const row = headers.map(header => escapeCSVField(item[header] ?? ''));
    lines.push(row.join(','));
  }
  return lines.join('\n') + '\n';
}

export function sitesCsvPlugin() {
  const csvPath = path.resolve(process.cwd(), 'data/sites.csv');

  const setupMiddleware = (server) => {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/sites')) {
        return next();
      }

      const url = new URL(req.url, `http://${req.headers.host}`);

      // Helper to read CSV
      const readSites = () => {
        if (!fs.existsSync(csvPath)) {
          return [];
        }
        const content = fs.readFileSync(csvPath, 'utf-8');
        return parseCSV(content);
      };

      // Helper to write CSV
      const writeSites = (sites) => {
        const dir = path.dirname(csvPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const csvContent = stringifyCSV(sites);
        fs.writeFileSync(csvPath, csvContent, 'utf-8');
      };

      // Helper to parse JSON body
      const getBody = () => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (err) {
            reject(err);
          }
        });
        req.on('error', reject);
      });

      // 1. GET /api/sites
      if (req.method === 'GET') {
        try {
          const sites = readSites();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sites));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // 2. POST /api/sites (Add site)
      if (req.method === 'POST') {
        try {
          const body = await getBody();
          const sites = readSites();
          const newSite = {
            id: body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: body.name || '',
            url: body.url || '',
            msg: body.msg || '',
            type: body.type || 'Quanta sites',
            fileName: body.fileName || '',
          };
          sites.push(newSite);
          writeSites(sites);
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 201;
          res.end(JSON.stringify(newSite));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // 3. PUT /api/sites (Bulk save or reset) or PUT /api/sites/:id
      if (req.method === 'PUT') {
        try {
          const body = await getBody();
          const pathParts = url.pathname.split('/').filter(Boolean);
          const targetId = pathParts[2]; // /api/sites/:id

          if (targetId) {
            let sites = readSites();
            let updated = null;
            sites = sites.map(site => {
              if (String(site.id) === String(targetId)) {
                updated = { ...site, ...body, id: site.id };
                return updated;
              }
              return site;
            });
            writeSites(sites);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(updated || { message: 'Site updated' }));
          } else if (Array.isArray(body)) {
            // Full replace / reset
            writeSites(body);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(body));
          } else {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid PUT payload' }));
          }
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // 4. DELETE /api/sites/:id
      if (req.method === 'DELETE') {
        try {
          const pathParts = url.pathname.split('/').filter(Boolean);
          const targetId = pathParts[2];

          if (!targetId) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Missing site ID' }));
            return;
          }

          let sites = readSites();
          sites = sites.filter(site => String(site.id) !== String(targetId));
          writeSites(sites);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      next();
    });
  };

  return {
    name: 'vite-plugin-sites-csv',
    configureServer: setupMiddleware,
    configurePreviewServer: setupMiddleware,
  };
}
