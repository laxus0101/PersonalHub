import { useState } from "react";
import { ArrowLeft, Pencil, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useSites } from "../context/SitesContext";
import {
  clearLocalHtmlFiles,
  createLocalHtmlLink,
  deleteLocalHtmlFile,
  getLocalHtmlId,
  isLegacyLocalFileLink,
  isLocalHtmlLink,
  saveLocalHtmlFile,
} from "../utils/localHtmlFiles";

const emptyForm = {
  name: "",
  url: "",
  msg: "",
  type: "Quanta sites",
  localFileId: "",
  fileName: "",
};

const siteTypes = ["Quanta sites", "Projects", "Others"];

export default function ManageSitesPage() {
  const { sites, addSite, updateSite, removeSite, resetSites } = useSites();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [urlError, setUrlError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
    if (name === "url") {
      setUrlError("");
      if (value) {
        setForm((currentForm) => ({ ...currentForm, localFileId: "", fileName: "" }));
        setSelectedFile(null);
      }
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    if (file && !/\.html?$/i.test(file.name)) {
      setSelectedFile(null);
      setUrlError("Selecciona un archivo con extensión .html o .htm.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
    setUrlError("");
    if (file) {
      setForm((currentForm) => ({ ...currentForm, url: "", fileName: file.name }));
    }
  }

  function startEditing(site) {
    setEditingId(site.id);
    const localFileId = getLocalHtmlId(site.url) ?? "";
    const needsLocalFileReselection = isLegacyLocalFileLink(site.url);
    setForm({
      name: site.name,
      url: localFileId || needsLocalFileReselection ? "" : site.url,
      msg: site.msg,
      type: site.type,
      localFileId,
      fileName: site.fileName ?? (needsLocalFileReselection ? decodeURIComponent(site.url.split("/").pop()) : ""),
    });
    setSelectedFile(null);
    setUrlError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(emptyForm);
    setSelectedFile(null);
    setUrlError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const enteredUrl = form.url.trim();
    let localFileId = form.localFileId;
    let url = enteredUrl;

    if (selectedFile) {
      if (!localFileId) {
        localFileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      }
      url = createLocalHtmlLink(localFileId);
    } else if (localFileId) {
      url = createLocalHtmlLink(localFileId);
    } else {
      try {
        const parsedUrl = new URL(enteredUrl);
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          setUrlError("Ingresa una URL http(s) o selecciona un archivo HTML.");
          return;
        }
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        setUrlError("Ingresa una URL válida o selecciona un archivo HTML.");
        return;
      }
    }

    const site = {
      name: form.name.trim(),
      url,
      msg: form.msg.trim(),
      type: form.type,
      ...(localFileId ? { fileName: selectedFile?.name ?? form.fileName } : {}),
    };

    if (!site.name) return;

    const isNewLocalFile = Boolean(selectedFile && !form.localFileId);
    try {
      if (selectedFile) await saveLocalHtmlFile(localFileId, selectedFile);

      if (editingId) {
        updateSite(editingId, site);
        const previousSite = sites.find((currentSite) => currentSite.id === editingId);
        const previousFileId = getLocalHtmlId(previousSite?.url);
        if (previousFileId && previousFileId !== localFileId) {
          await deleteLocalHtmlFile(previousFileId);
        }
      } else {
        addSite(site);
      }
      cancelEditing();
    } catch (error) {
      let message = `No se pudo guardar el sitio o el archivo: ${error.message}`;
      if (isNewLocalFile) {
        try {
          await deleteLocalHtmlFile(localFileId);
        } catch (cleanupError) {
          message += ` No se pudo limpiar el archivo temporal: ${cleanupError.message}`;
        }
      }
      setUrlError(message);
    }
  }

  function handleRemove(site) {
    if (window.confirm(`Remove "${site.name}"?`)) {
      const localFileId = getLocalHtmlId(site.url);
      try {
        removeSite(site.id);
        if (localFileId) {
          deleteLocalHtmlFile(localFileId).catch((error) => {
            window.alert(`El sitio se eliminó, pero no se pudo borrar su archivo guardado: ${error.message}`);
          });
        }
      } catch (error) {
        window.alert(`No se pudo eliminar el sitio: ${error.message}`);
      }
    }
  }

  async function handleReset() {
    if (window.confirm("Restore the original sites? Your current changes will be removed.")) {
      try {
        resetSites();
        await clearLocalHtmlFiles();
        cancelEditing();
      } catch (error) {
        window.alert(`No se pudieron restaurar los sitios: ${error.message}`);
      }
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-slate-100 px-4 pb-16 pt-28 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Link to="/Hub" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition hover:text-cyan-500 dark:text-cyan-300">
                <ArrowLeft size={16} /> Back to hub
              </Link>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Manage sites</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Add, update, or remove shortcuts from your hub.</p>
            </div>
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-red-500 dark:hover:text-red-400">
              <RotateCcw size={16} /> Restore defaults
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-extrabold">{editingId ? "Edit site" : "Add a site"}</h2>
              {editingId && (
                <button type="button" onClick={cancelEditing} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white">
                  <X size={16} /> Cancel
                </button>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold">Name
                <input required name="name" value={form.name} onChange={handleChange} placeholder="e.g. Quanta HR" className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950" />
              </label>
              <label className="text-sm font-semibold">URL
                <input type="text" name="url" value={form.url} onChange={handleChange} placeholder="https://example.com" aria-invalid={Boolean(urlError)} aria-describedby={urlError ? "url-error" : "url-hint"} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950" />
                {!urlError && <span id="url-hint" className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">Para sitios web, ingresa una URL. Para HTML local, selecciona el archivo abajo.</span>}
              </label>
              <label className="text-sm font-semibold">Archivo HTML local
                <input type="file" accept=".html,.htm,text/html" onChange={handleFileChange} aria-invalid={Boolean(urlError)} aria-describedby={urlError ? "url-error" : "file-hint"} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-normal outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white dark:border-slate-700 dark:bg-slate-950" />
                <span id={urlError ? "url-error" : "file-hint"} className={`mt-1 block text-xs font-normal ${urlError ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {urlError || (form.fileName ? `Archivo guardado: ${form.fileName}` : "El archivo se guarda en este navegador para abrirlo después.")}
                </span>
              </label>
              <label className="text-sm font-semibold">Category
                <select name="type" value={form.type} onChange={handleChange} className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950">
                  {siteTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="text-sm font-semibold">Description
                <input name="msg" value={form.msg} onChange={handleChange} placeholder="What is this site for?" className="mt-2 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-normal outline-none transition focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950" />
              </label>
            </div>
            <button type="submit" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-500">
              {editingId ? <Save size={16} /> : <Plus size={16} />}
              {editingId ? "Save changes" : "Add site"}
            </button>
          </form>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Current sites</h2>
              <span className="text-sm text-slate-500 dark:text-slate-400">{sites.length} total</span>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              {sites.map((site) => (
                <div key={site.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4 last:border-b-0 dark:border-slate-800 sm:px-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{site.name}</h3>
                      <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">{site.type}</span>
                    </div>
                    <p className="mt-1 max-w-2xl truncate text-sm text-slate-500 dark:text-slate-400">
                      {isLocalHtmlLink(site.url) ? `Archivo HTML: ${site.fileName}` : site.url}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" onClick={() => startEditing(site)} aria-label={`Edit ${site.name}`} className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:border-cyan-500 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-cyan-300"><Pencil size={16} /></button>
                    <button type="button" onClick={() => handleRemove(site)} aria-label={`Remove ${site.name}`} className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:border-red-500 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
