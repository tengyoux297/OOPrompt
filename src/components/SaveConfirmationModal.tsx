

type Props = {
  isOpen: boolean;
  onSaveAndContinue: () => void;
  onContinueWithoutSaving: () => void;
  onCancel: () => void;
  objectName: string;
  actionDescription: string;
};

export function SaveConfirmationModal({ 
  isOpen, 
  onSaveAndContinue, 
  onContinueWithoutSaving, 
  onCancel, 
  objectName,
  actionDescription 
}: Props) {
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
        zIndex: 10000
      }}
    >
      <div 
        className="modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '480px',
          margin: '0 16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.732 0L3.1 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Unsaved Changes Detected
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              You have unsaved changes in <strong>"{objectName}"</strong>. 
              {actionDescription && (
                <span> Before {actionDescription}, would you like to save your current progress?</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onContinueWithoutSaving}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            Continue Without Saving
          </button>
          <button
            onClick={onSaveAndContinue}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Save and Continue
          </button>
        </div>
      </div>
    </div>
  );
}
