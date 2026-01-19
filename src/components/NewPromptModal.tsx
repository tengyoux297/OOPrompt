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
      
      // Convert to OOPromptObject format
      // PropertyData extends Property, so we can use it directly after adding missing fields
      const oopObject: OOPromptObject = {
        id: 'root',
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
        tabsOrder: extractedData.tabsOrder || ['root'],
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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New Prompt</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter your raw prompt text
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Type or paste your prompt here. We'll extract the key properties and structure it for you.
              </p>
              <textarea
                ref={textareaRef}
                value={rawPrompt}
                onChange={(e) => setRawPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Example: Write a blog post about sustainable living for eco-conscious millennials. Use a friendly, informative tone. Include practical tips and real-world examples. Keep it around 1000 words..."
                rows={8}
                className="oop-newprompt-textarea w-full min-h-[10rem] px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                disabled={isExtracting}
              />
              <p className="text-xs text-gray-400 mt-2">
                Press Ctrl+Enter (or Cmd+Enter on Mac) to extract properties
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isExtracting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!rawPrompt.trim() || isExtracting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isExtracting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Initiating OOPrompt object...</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>Extract Properties</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

