import { createContext, useContext, useState, useEffect } from "react";
import initialSites from "../data/sites";

const SitesContext = createContext(null);

function createSiteId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSites(sites) {
  return sites.map((site) => ({
    ...site,
    id: site.id ?? createSiteId(),
  }));
}

export function SitesProvider({ children }) {
  const [sites, setSites] = useState(() => normalizeSites(initialSites));
  const [loading, setLoading] = useState(true);

  // Load sites from CSV via backend API
  useEffect(() => {
    async function fetchSites() {
      try {
        const response = await fetch("/api/sites");
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setSites(normalizeSites(data));
          }
        }
      } catch (error) {
        console.warn("Could not fetch sites from CSV API, using defaults:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSites();
  }, []);

  async function addSite(site) {
    const newSite = { ...site, id: site.id ?? createSiteId() };
    const nextSites = [...sites, newSite];
    setSites(nextSites);

    try {
      await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSite),
      });
    } catch (error) {
      console.error("Failed to save site to CSV:", error);
    }
  }

  async function updateSite(id, site) {
    const nextSites = sites.map((currentSite) =>
      currentSite.id === id ? { ...currentSite, ...site } : currentSite
    );
    setSites(nextSites);

    try {
      await fetch(`/api/sites/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(site),
      });
    } catch (error) {
      console.error("Failed to update site in CSV:", error);
    }
  }

  async function removeSite(id) {
    const nextSites = sites.filter((site) => site.id !== id);
    setSites(nextSites);

    try {
      await fetch(`/api/sites/${id}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Failed to delete site from CSV:", error);
    }
  }

  async function resetSites() {
    const defaultSites = initialSites.map((site) => ({ ...site, id: createSiteId() }));
    setSites(defaultSites);

    try {
      await fetch("/api/sites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaultSites),
      });
    } catch (error) {
      console.error("Failed to reset sites in CSV:", error);
    }
  }

  return (
    <SitesContext.Provider value={{ sites, loading, addSite, updateSite, removeSite, resetSites }}>
      {children}
    </SitesContext.Provider>
  );
}

export function useSites() {
  return useContext(SitesContext);
}
