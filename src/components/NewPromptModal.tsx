import { useState, useRef, useEffect } from 'react';
import { llmService } from '../services/llmService';
import type { OOPromptObject } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onExtract: (oopObject: OOPromptObject) => void;
  onError?: (title: string, message: string) => void;
}

export function NewPromptModal({ isOpen, onClose, onExtract, onError }: Props) {
  const [rawPrompt, setRawPrompt] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!rawPrompt.trim()) {
      return;
    }

    setIsExtracting(true);
    try {
      console.log('=== Extracting properties from raw prompt ===');
      console.log('Raw prompt:', rawPrompt.trim());
      
      // Extract properties using the assistant
      const extractedData = await llmService.extractPropertiesWithAssistant(rawPrompt.trim());
      
      console.log('=== Extraction result ===');
      console.log('Extracted data:', extractedData);
      
      // Convert to OOPromptObject format; use a unique id so this draft never matches a previous object
      const uniqueId = `extract_${Date.now()}`;
      const oopObject: OOPromptObject = {
        id: uniqueId,
        name: extractedData.name || '',
        main_task: extractedData.main_task || rawPrompt.trim().substring(0, 100),
        audience: extractedData.audience || '',
        properties: extractedData.properties.map((prop, index) => ({
          ...prop,
          id: prop.id || `p${Date.now()}_${index}`,
          emphasis: prop.emphasis || 'normal' as const,
          source: prop.source || 'ai-extracted' as const,
          createdAt: prop.createdAt || Date.now(),
          updatedAt: prop.updatedAt || Date.now(),
        })),
        tabsOrder: extractedData.tabsOrder || [uniqueId],
        log: extractedData.log || [],
        createdAt: extractedData.createdAt || Date.now(),
        updatedAt: extractedData.updatedAt || Date.now(),
      };
      
      console.log('=== Converted OOP Object ===');
      console.log('OOP Object:', oopObject);
      
      // Call the callback with the extracted object
      onExtract(oopObject);
      
      // Reset and close
      setRawPrompt('');
      onClose();
      
    } catch (error) {
      console.error('Failed to extract properties:', error);
      if (onError) {
        onError(
          'Extraction Failed',
          error instanceof Error ? error.message : 'Failed to extract properties from your prompt. Please try again.'
        );
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[75vh] flex flex-col">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">New Prompt</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          <label className="block text-sm font-medium text-gray-800 mb-1.5">Raw prompt</label>
          <textarea
            ref={textareaRef}
            value={rawPrompt}
            onChange={(e) => setRawPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste or type your prompt…"
            rows={6}
            className="oop-newprompt-textarea w-full min-h-[8rem] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
            disabled={isExtracting}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-200 flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            disabled={isExtracting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rawPrompt.trim() || isExtracting}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isExtracting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Extracting…</span>
              </>
            ) : (
              <span>Extract</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

