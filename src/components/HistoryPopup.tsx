import { useRef, useEffect, useState } from "react";
import type { OOPromptObject } from "../types";

type Props = {
  object: OOPromptObject;
  versions: OOPromptObject[];
  isOpen: boolean;
  onClose: () => void;
  onSelectVersion: (version: OOPromptObject) => void;
  position: { x: number; y: number };
};

export function HistoryPopup({ object, versions, isOpen, onClose, onSelectVersion, position }: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [calculatedPosition, setCalculatedPosition] = useState({ x: 0, y: 0 });

  // Calculate optimal position when popup opens
  useEffect(() => {
    if (isOpen && popupRef.current) {
      const popup = popupRef.current;
      const popupRect = popup.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;
      
      let x = position.x;
      let y = position.y;
      
      // Adjust horizontal position to keep popup within window bounds
      if (x + popupRect.width > windowWidth) {
        x = windowWidth - popupRect.width - 20; // 20px margin from right edge
      }
      if (x < 20) {
        x = 20; // 20px margin from left edge
      }
      
      // Adjust vertical position to keep popup fully visible
      const popupHeight = popupRect.height;
      const spaceAbove = position.y;
      const spaceBelow = windowHeight - position.y;
      
      if (spaceBelow >= popupHeight) {
        // Enough space below, position below the button
        y = position.y + 10; // 10px gap below button
      } else if (spaceAbove >= popupHeight) {
        // Enough space above, position above the button
        y = position.y - popupHeight - 10; // 10px gap above button
      } else {
        // Not enough space in either direction, center vertically
        y = Math.max(20, (windowHeight - popupHeight) / 2);
      }
      
      setCalculatedPosition({ x, y });
    }
  }, [isOpen, position]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const getVersionInfo = (version: OOPromptObject) => {
    const propertyCount = version.properties.length;
    const timeAgo = Date.now() - version.updatedAt;
    const minutes = Math.floor(timeAgo / (1000 * 60));
    const hours = Math.floor(timeAgo / (1000 * 60 * 60));
    const days = Math.floor(timeAgo / (1000 * 60 * 60 * 24));

    let timeDisplay = '';
    if (days > 0) {
      timeDisplay = `${days} day${days !== 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      timeDisplay = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      timeDisplay = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else {
      timeDisplay = 'Just now';
    }

    return { propertyCount, timeDisplay };
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-96 h-80"
      style={{
        left: calculatedPosition.x,
        top: calculatedPosition.y,
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">History Menu</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close history menu"
          >
            ×
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {versions.length} saved version{versions.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Versions List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {versions.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">
            No saved versions found
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {versions.map((version, index) => {
              const { propertyCount, timeDisplay } = getVersionInfo(version);
              const isCurrent = version.id === object.id;
              
              return (
                <button
                  key={version.id}
                  onClick={() => {
                    onSelectVersion(version);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 hover:bg-blue-50 hover:border-blue-200 ${
                    isCurrent 
                      ? 'bg-blue-50 border border-blue-200 ring-1 ring-blue-300' 
                      : 'bg-white border border-gray-100 hover:border-blue-200'
                  }`}
                  disabled={isCurrent}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          isCurrent 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {isCurrent ? 'Current' : `v${versions.length - index}`}
                        </span>
                        {isCurrent && (
                          <span className="text-xs text-blue-600 font-medium">Active</span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-900 mb-1">
                        {version.main_task || 'No main task'}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{propertyCount} propert{propertyCount !== 1 ? 'ies' : 'y'}</span>
                        <span>•</span>
                        <span>{timeDisplay}</span>
                      </div>
                      
                      <div className="text-xs text-gray-400 mt-1">
                        {formatTime(version.updatedAt)}
                      </div>
                    </div>
                    
                    {!isCurrent && (
                      <div className="ml-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 rounded-b-lg flex-shrink-0">
        <p className="text-xs text-gray-500 text-center">
          Click a version to load it
        </p>
      </div>
    </div>
  );
}
