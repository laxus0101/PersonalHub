import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Search, Settings, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ search, onSearchChange }) {
  const [scrolled, setScrolled] = useState(false);
  const { dark, toggleDark } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* const mode = scrolled ? "navbar--scrolled" : "navbar--top"; */

  return (
    <nav className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${scrolled || !dark ? "border-black/15 bg-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/15 dark:bg-black/90" : "border-transparent bg-transparent"}`}>
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/Hub" className="group flex items-center gap-3">
          <span className="flex h-10 w-fit px-1 items-center justify-center rounded-xl bg-black text-lg font-black text-blue-400 shadow-[2px_2px_0px_#dc2626] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[3px_3px_0_#dc2626]">Quanta</span>
          <span className={`text-xl font-extrabold tracking-tight transition-colors ${scrolled || !dark ? "text-black dark:text-white" : "text-white"}`}>Personal<span className="text-blue-600 dark:text-blue-400">Hub</span></span>
        </Link>

        <div className="flex items-center gap-3">
          <label className={`hidden items-center gap-2 rounded-full border px-3 sm:flex ${scrolled || !dark ? "border-black/20 bg-white/80 text-black/70 dark:border-white/20 dark:bg-black/70 dark:text-white/70" : "border-white/30 bg-black/10 text-white/80"}`}>
            <Search size={14} className="shrink-0 text-red-600 dark:text-red-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search resources"
              aria-label="Search resources"
              className="w-40 bg-transparent py-2 text-xs font-semibold outline-none placeholder:text-current sm:w-52"
            />
          </label>
          <Link to="/manage" aria-label="Manage sites" title="Manage sites" className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5 ${scrolled || !dark ? "border-black/20 text-black hover:bg-blue-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10" : "border-white/30 text-white hover:bg-white/15"}`}>
            <Settings size={17} />
          </Link>
          <button type="button" onClick={toggleDark} aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all hover:-translate-y-0.5 ${scrolled || !dark ? "border-black/20 text-black hover:bg-blue-50 dark:border-white/20 dark:text-white dark:hover:bg-white/10" : "border-white/30 text-white hover:bg-white/15"}`}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </div>
    </nav>
  );
}