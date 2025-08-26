type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

export function LeftBookmarkHandle({ isOpen, onToggle }: Props) {
  const closedPos = "left-0 top-1/2 -translate-y-1/2";
  const openPos = "-right-10 top-1/2 -translate-y-1/2";

  return (
    <button
      onClick={onToggle}
      className={`fixed z-50 w-10 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-r-2xl shadow-lg transition-all duration-300 hover:shadow-xl ${isOpen ? openPos : closedPos}`}
      title={isOpen ? "Hide Object Panel" : "Show Object Panel"}
    >
      <div className="flex items-center justify-center h-full">
        <svg 
          className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </div>
    </button>
  );
}
