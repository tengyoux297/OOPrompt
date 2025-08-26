

type Position = "left" | "right";

export function BookmarkHandle({
  isOpen,
  onToggle,
  position = "right",
  className = ""
}: {
  isOpen: boolean;
  onToggle: () => void;
  position?: Position;
  className?: string;
}) {
  // base geometry (bookmark tab)
  const base =
    "h-16 w-10 flex items-center justify-center " +
    "transition shadow-xs focus-visible:outline-none " +
    "focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2";

  // placement + shape based on position
  const closedPos = position === "left" 
    ? "fixed left-0 top-1/2 -translate-y-1/2 rounded-r-2xl"
    : "fixed right-0 top-1/2 -translate-y-1/2 rounded-l-2xl";
  
  const openPos = position === "left"
    ? "absolute -right-10 top-1/2 -translate-y-1/2 rounded-r-2xl"
    : "absolute -left-10 top-1/2 -translate-y-1/2 rounded-l-2xl";

  // visual skins - constant blue color
  const closedSkin =
    "bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-inset ring-black/5 border border-white/60";
  const openSkin =
    "bg-blue-600 hover:bg-blue-700 text-white ring-1 ring-inset ring-black/5 border border-white/60";

  // chevron: direction depends on position
  const chevron = position === "left"
    ? "h-5 w-5 stroke-current transition-transform " + (isOpen ? "rotate-180" : "")
    : "h-5 w-5 stroke-current transition-transform " + (isOpen ? "" : "rotate-180");

  return (
    <button
      aria-label={isOpen ? "Close panel" : "Open panel"}
      title={isOpen ? "Close panel" : "Open panel"}
      onClick={onToggle}
      className={[
        base,
        isOpen ? openPos : closedPos,
        isOpen ? openSkin : closedSkin,
        className,
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" className={chevron} fill="none" strokeWidth="2">
        <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
