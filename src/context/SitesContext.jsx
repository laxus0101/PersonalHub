import { createContext, useContext, useState } from "react";
import initialSites from "../data/sites";

const STORAGE_KEY = "quantahub-sites";
const SitesContext = createContext(null);

function createSiteId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSites(sites) {
  return sites.map((site) => ({ ...site, id: site.id ?? createSiteId() }));
}

function getStoredSites() {
  try {
    const savedSites = localStorage.getItem(STORAGE_KEY);
    return savedSites ? normalizeSites(JSON.parse(savedSites)) : normalizeSites(initialSites);
  } catch {
    return normalizeSites(initialSites);
  }
}

export function SitesProvider({ children }) {
  const [sites, setSites] = useState(getStoredSites);

  function saveSites(nextSites) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSites));
    setSites(nextSites);
  }

  function addSite(site) {
    saveSites([...sites, { ...site, id: site.id ?? createSiteId() }]);
  }

  function updateSite(id, site) {
    saveSites(sites.map((currentSite) => (
      currentSite.id === id ? { ...currentSite, ...site } : currentSite
    )));
  }

  function removeSite(id) {
    saveSites(sites.filter((site) => site.id !== id));
  }

  function resetSites() {
    saveSites(initialSites.map((site) => ({ ...site, id: createSiteId() })));
  }

  return (
    <SitesContext.Provider value={{ sites, addSite, updateSite, removeSite, resetSites }}>
      {children}
    </SitesContext.Provider>
  );
}

export function useSites() {
  return useContext(SitesContext);
}
