const DATABASE_NAME = "quantahub-local-files";
const STORE_NAME = "html-files";
const LOCAL_HTML_PREFIX = "local-html:";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function withStore(mode, operation) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const request = operation(transaction.objectStore(STORE_NAME));

    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

export function isLocalHtmlLink(link) {
  return link?.startsWith(LOCAL_HTML_PREFIX) ?? false;
}

export function isLegacyLocalFileLink(link) {
  return /^file:/i.test(link ?? "");
}

export function getLocalHtmlId(link) {
  return isLocalHtmlLink(link) ? link.slice(LOCAL_HTML_PREFIX.length) : null;
}

export function createLocalHtmlLink(id) {
  return `${LOCAL_HTML_PREFIX}${id}`;
}

export function saveLocalHtmlFile(id, file) {
  return withStore("readwrite", (store) => store.put({
    id,
    blob: file,
    name: file.name,
  }));
}

export function deleteLocalHtmlFile(id) {
  return withStore("readwrite", (store) => store.delete(id));
}

export function clearLocalHtmlFiles() {
  return withStore("readwrite", (store) => store.clear());
}

export async function openLocalHtmlFile(id) {
  const tab = window.open("about:blank", "_blank");
  if (!tab) {
    throw new Error("Permite las ventanas emergentes para abrir el archivo HTML.");
  }

  tab.opener = null;

  try {
    const record = await withStore("readonly", (store) => store.get(id));
    if (!record) throw new Error("No se encontró el archivo HTML guardado.");

    tab.location.replace(URL.createObjectURL(record.blob));
  } catch (error) {
    tab.close();
    throw error;
  }
}
