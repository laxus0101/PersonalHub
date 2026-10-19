import { useTheme } from "../context/ThemeContext"
import Button from "./ui/Button";
import {
    getLocalHtmlId,
    isLegacyLocalFileLink,
    isLocalHtmlLink,
    openLocalHtmlFile,
} from "../utils/localHtmlFiles";

export default function Card({ Name = "None", Link, Type, msg }) {
    useTheme()
    const isLocalHtml = isLocalHtmlLink(Link);
    const isLegacyLocalFile = isLegacyLocalFileLink(Link);

    async function handleOpenLocalHtml() {
        try {
            await openLocalHtmlFile(getLocalHtmlId(Link));
        } catch (error) {
            window.alert(`No se pudo abrir el archivo HTML: ${error.message}`);
        }
    }

    function handleLegacyLocalFile() {
        window.alert("El navegador bloquea las rutas file://. Edita este sitio y vuelve a seleccionar el archivo HTML desde tu equipo.");
    }

    const gradient = {
        "Quanta sites": "bg-gradient-to-br from-cyan-400/80 via-sky-500/60 to-slate-950/90",
        "Projects": "bg-gradient-to-br from-indigo-400/80 via-blue-500/60 to-slate-950/90",
        "Others": "bg-gradient-to-br from-fuchsia-400/80 via-violet-500/60 to-slate-950/90",
    }
    return (
        <div className="
            group/card relative h-32 max-w-dvw cursor-pointer overflow-hidden rounded-2xl border border-white/20
            bg-slate-900 shadow-[0_14px_32px_rgba(15,23,42,0.18)] transition-all duration-300
            hover:-translate-y-1 hover:shadow-[0_20px_38px_rgba(15,23,42,0.25)]
            ">
            {/* background */}
            <div className="absolute inset-0 transition-transform duration-500 group-hover/card:scale-105">
                {/* fondo */}
                <div className={`absolute inset-0 ${gradient[Type]}`} />
                {/* Overlay oscuro */}
                <div className="absolute inset-0 bg-slate-950/35 transition-colors duration-300 group-hover/card:bg-slate-950/50" />
                {/* Capa Glass */}
                <div className="absolute inset-0 border border-white/10 backdrop-blur-[1px]" />
                {/* Texto */}
                <div className="absolute inset-x-0 top-0 z-10 flex min-h-full items-center justify-center overflow-hidden px-7 pb-10 text-center text-xl font-extrabold leading-tight text-white text-shadow-2xs text-shadow-slate-950 transition-all duration-300 group-hover/card:items-start group-hover/card:pt-7">
                    {Name}
                </div>
            </div>

            <div className="absolute bottom-0 left-0 flex w-full translate-y-full items-center gap-3 border-t border-white/15 bg-slate-950/80 p-3 opacity-0 backdrop-blur-md transition-all duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100">
                    <p className="w-full whitespace-normal wrap-break-word px-1 text-xs leading-4 text-stone-100">{msg}</p>
                <Button
                    className="shrink-0"
                    text={isLocalHtml ? "Open" : isLegacyLocalFile ? "Re-select" : "Visit"}
                    Link={Link}
                    onClick={isLocalHtml ? handleOpenLocalHtml : isLegacyLocalFile ? handleLegacyLocalFile : undefined}
                />
            </div>
        </div>
    );
}
