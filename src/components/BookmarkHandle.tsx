

type AttachTo = "viewport-right" | "panel-left";

export function BookmarkHandle({
  open,
  attachTo,
  onClick,
  className = ""
}: {
  open: boolean;
  attachTo: AttachTo;
  onClick: () => void;
  className?: string;
}) {
  // base geometry (bookmark tab)
  const base =
    "h-16 w-10 flex items-center justify-center " +
    "transition shadow-xs focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

  // placement + shape
  const closedPos =
    "fixed right-0 top-1/2 -translate-y-1/2 rounded-l-2xl";
  const openPos =
    "absolute -left-10 top-1/2 -translate-y-1/2 rounded-l-2xl";

  // visual skins - constant blue color
  const closedSkin =
    "bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-inset ring-black/5 border border-white/60";
  const openSkin =
    "bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-inset ring-black/5 border border-white/60";

  // chevron: we draw a right chevron and rotate when closed needs ◀
  const chevron =
    "h-5 w-5 stroke-current transition-transform " +
    (open ? "" : "rotate-180");

  return (
    <button
      aria-label={open ? "Close OOPrompt panel" : "Open OOPrompt panel"}
      title={open ? "Close panel" : "Open panel"}
      onClick={onClick}
      className={[
        base,
        attachTo === "viewport-right" ? closedPos : openPos,
        attachTo === "viewport-right" ? closedSkin : openSkin,
        className,
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" className={chevron} fill="none" strokeWidth="2">
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
