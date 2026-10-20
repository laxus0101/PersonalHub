import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Puerto configurable por variable de entorno o 3000 por defecto
const PORT = process.env.PORT || 3000;
const BASE = path.join(__dirname, "dist");
const CSV_PATH = path.join(__dirname, "data", "sites.csv");

// --- Helpers para CSV (/api/sites) ---
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentVal = "";
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
      } else if (char === ",") {
        currentRow.push(currentVal);
        currentVal = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = "";
      } else if (char === "\n") {
        currentRow.push(currentVal);
        rows.push(currentRow);
        currentRow = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal !== "" || currentRow.length > 0) {
    currentRow.push(currentVal);
    rows.push(currentRow);
  }

  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const data = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 1 && !row[0].trim()) continue;
    const item = {};
    headers.forEach((header, idx) => {
      item[header] = row[idx] !== undefined ? row[idx].trim() : "";
    });
    data.push(item);
  }

  return data;
}

function escapeCSVField(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function stringifyCSV(items, headers = ["id", "name", "url", "msg", "type", "fileName"]) {
  const lines = [headers.join(",")];
  for (const item of items) {
    const row = headers.map((header) => escapeCSVField(item[header] ?? ""));
    lines.push(row.join(","));
  }
  return lines.join("\n") + "\n";
}

function readSites() {
  if (!fs.existsSync(CSV_PATH)) {
    return [];
  }
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  return parseCSV(content);
}

function writeSites(sites) {
  const dir = path.dirname(CSV_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const csvContent = stringifyCSV(sites);
  fs.writeFileSync(CSV_PATH, csvContent, "utf-8");
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

// Diccionario MIME types para servir el frontend de React (dist)
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // 1. ENDPOINTS DE LA API DE QUANTAHUB (/api/sites)
  if (pathname === "/api/sites" || pathname.startsWith("/api/sites/")) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    try {
      // GET /api/sites
      if (req.method === "GET") {
        const sites = readSites();
        res.writeHead(200);
        res.end(JSON.stringify(sites));
        return;
      }

      // POST /api/sites
      if (req.method === "POST") {
        const body = await parseBody(req);
        const sites = readSites();
        const newSite = {
          id: body.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: body.name || "",
          url: body.url || "",
          msg: body.msg || "",
          type: body.type || "Quanta sites",
          fileName: body.fileName || "",
        };
        sites.push(newSite);
        writeSites(sites);
        res.writeHead(201);
        res.end(JSON.stringify(newSite));
        return;
      }

      // PUT /api/sites/:id o PUT /api/sites (bulk)
      if (req.method === "PUT") {
        const body = await parseBody(req);
        const pathParts = pathname.split("/").filter(Boolean);
        const targetId = pathParts[2];

        if (targetId) {
          let sites = readSites();
          let updated = null;
          sites = sites.map((site) => {
            if (String(site.id) === String(targetId)) {
              updated = { ...site, ...body, id: site.id };
              return updated;
            }
            return site;
          });
          writeSites(sites);
          res.writeHead(200);
          res.end(JSON.stringify(updated || { message: "Site updated" }));
          return;
        } else if (Array.isArray(body)) {
          writeSites(body);
          res.writeHead(200);
          res.end(JSON.stringify(body));
          return;
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Invalid PUT payload" }));
          return;
        }
      }

      // DELETE /api/sites/:id
      if (req.method === "DELETE") {
        const pathParts = pathname.split("/").filter(Boolean);
        const targetId = pathParts[2];

        if (!targetId) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "Missing site ID" }));
          return;
        }

        let sites = readSites();
        sites = sites.filter((site) => String(site.id) !== String(targetId));
        writeSites(sites);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      res.writeHead(405);
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    } catch (err) {
      console.error("Error en /api/sites:", err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 2. SERVIDOR DE ARCHIVOS ESTÁTICOS (React / dist)
  const cleanUrl = pathname;
  let filePath = path.join(BASE, cleanUrl === "/" ? "index.html" : cleanUrl);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Fallback a index.html (Soporte SPA para React Router al recargar / navegar)
      fs.readFile(path.join(BASE, "index.html"), (err2, content2) => {
        if (err2) {
          res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Error loading index.html. Asegúrate de ejecutar 'npm run build' primero.");
        } else {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(content2);
        }
      });
    } else {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = mimeTypes[ext] || "application/octet-stream";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor QuantaHub corriendo en http://0.0.0.0:${PORT}`);
});


