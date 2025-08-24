import type { Conflict } from "../types";

type Props = {
  isOpen: boolean;
  conflict: Conflict;
  onResolve: (resolution: "keepA" | "keepB" | "merge") => void;
  onClose: () => void;
};

export function ConflictResolveModal({ isOpen, conflict, onResolve, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div 
        className="modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '576px',
          margin: '0 16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-onLight">Resolve Conflict</h2>
          <button
            onClick={onClose}
            className="text-text-onLight/60 hover:text-text-onLight/80 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-text-onLight/60 mb-3">
            <strong>Conflict:</strong> {conflict.reason}
          </p>
          
          <div className="space-y-3">
            <div className="border border-divider rounded-xl p-3 bg-panel">
              <div className="text-sm font-medium text-text-onLight mb-1">Option A</div>
              <div className="text-sm text-text-onLight/80">{conflict.valueA}</div>
            </div>
            
            <div className="border border-divider rounded-xl p-3 bg-panel">
              <div className="text-sm font-medium text-text-onLight mb-1">Option B</div>
              <div className="text-sm text-text-onLight/80">{conflict.valueB}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onResolve("keepA")}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-3 py-2 transition-colors"
          >
            Keep Option A
          </button>
          <button
            onClick={() => onResolve("keepB")}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-3 py-2 transition-colors"
          >
            Keep Option B
          </button>
          <button
            onClick={() => onResolve("merge")}
            className="flex-1 bg-brand-600 hover:bg-brand-700 text-white rounded-xl px-3 py-2 transition-colors"
          >
            Merge Text
          </button>
        </div>
      </div>
    </div>
  );
}
