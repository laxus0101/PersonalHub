export default function Button({ text = "Visit", Link, className="", onClick }) {
    const buttonContent = (
        <>
            <span
                className="absolute inset-y-0 right-0 w-0 bg-[#e65e5e] transition-all duration-300 ease-in-out group-hover:w-full"
            ></span>

            <span
                className="relative z-10 pr-1 font-sans text-sm font-black tracking-wider text-white transition-colors duration-300 group-hover:text-white"
            >
                {text}
            </span>

            <span
                className="relative z-10 flex h-full w-12 items-center justify-center bg-[#e65e5e] text-black"
            >
                <svg
                    className="h-5 w-5 -rotate-45 transition-transform duration-300 ease-in-out group-hover:rotate-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                    ></path>
                </svg>
            </span>
        </>
    );

    return (
        onClick
            ? <button type="button" onClick={onClick} className={`group relative flex h-10 max-w-screen items-center justify-between overflow-hidden border-4 border-black bg-black pl-1 pr-0 ${className}`}>{buttonContent}</button>
            : <a href={Link} target="_blank" rel="noopener noreferrer" className={`group relative flex h-10 max-w-screen items-center justify-between overflow-hidden border-4 border-black bg-black pl-1 pr-0 ${className}`}>{buttonContent}</a>
    );
}