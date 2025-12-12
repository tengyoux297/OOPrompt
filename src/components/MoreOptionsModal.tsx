import { useState, useEffect, useRef } from "react";
import type { Property, OOPromptObject } from "../types";
import { generateExamples } from "../api";
import { fileStorageService } from "../services/fileStorageService";

type Props = {
  isOpen: boolean;
  property: Property;
  currentOOP: OOPromptObject; // Add current OOPrompt object
  promptObjects: OOPromptObject[]; // All available prompt objects
  selectedLLM: 'openai' | 'gemini' | 'claude';
  onClose: () => void;
  onUpdateProperty: (updatedProperty: Property) => void;
  onCreateEmbeddedObject?: (propertyId: string, parentObjectId: string) => void;
  onEmbedExistingObject?: (propertyId: string, objectId: string, objectName: string) => void;
};

export function MoreOptionsModal({ isOpen, property, currentOOP, promptObjects, selectedLLM, onClose, onUpdateProperty, onCreateEmbeddedObject, onEmbedExistingObject }: Props) {
  const [activeTab, setActiveTab] = useState<"examples" | "Embed">("examples");
  const [examples, setExamples] = useState<string[]>(property.examples || []);
  const [selectedExamples, setSelectedExamples] = useState<Set<string>>(new Set(property.examples || []));
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
  const [newExample, setNewExample] = useState("");

  // Filter promptObjects to show only latest version of each unique object
  // Group by main_task + audience and keep only the most recently updated version
  const getLatestVersions = () => {
    const uniqueObjects = new Map<string, OOPromptObject>();
    
    promptObjects.forEach(obj => {
      const key = `${obj.main_task || ''}|${obj.audience || ''}`;
      
      if (!uniqueObjects.has(key) || obj.updatedAt > uniqueObjects.get(key)!.updatedAt) {
        uniqueObjects.set(key, obj);
      }
    });
    
    // Convert to array, filter out current object, and sort by most recently updated
    return Array.from(uniqueObjects.values())
      .filter(obj => obj.id !== currentOOP.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  };
  
  const latestObjects = getLatestVersions();
  
  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected examples when property changes
  useEffect(() => {
    setExamples(property.examples || []);
    setSelectedExamples(new Set(property.examples || []));
  }, [property.examples]);


  const handleGenerateExamples = async () => {
    setIsGeneratingExamples(true);
    try {
      const result = await generateExamples({
        name: property.name,
        value: typeof property.value === "string" ? property.value : property.value.refObjectName
      }, currentOOP); // Pass the current OOPrompt object
      
      // Add new examples to the list but don't select them by default
      const newExamples = [...examples, ...result.examples];
      setExamples(newExamples);
      
      // Keep existing selections, don't auto-select new examples
      // Users will need to manually select which new examples they want to keep
    } catch (error) {
      console.error("Failed to generate examples:", error);
    } finally {
      setIsGeneratingExamples(false);
    }
  };

  const handleAddExample = () => {
    if (newExample.trim()) {
      const newExampleText = newExample.trim();
      setExamples(prev => [...prev, newExampleText]);
      // Select newly added example by default
      setSelectedExamples(prev => new Set([...prev, newExampleText]));
      setNewExample("");
    }
  };

  const handleToggleExample = (example: string) => {
    setSelectedExamples(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(example)) {
        newSelected.delete(example);
      } else {
        newSelected.add(example);
      }
      return newSelected;
    });
  };

  const handleSaveExamples = () => {
    // Only keep the selected examples
    const selectedExamplesArray = Array.from(selectedExamples);
    const updatedProperty = { ...property, examples: selectedExamplesArray, updatedAt: Date.now() };
    onUpdateProperty(updatedProperty);
    onClose();
  };

  // File upload handlers
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const fileReference = await fileStorageService.uploadFile(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Update property with file reference
      const updatedProperty = { 
        ...property, 
        fileReference, 
        updatedAt: Date.now() 
      };
      onUpdateProperty(updatedProperty);
      
      console.log('=== File Uploaded Successfully ===');
      console.log('File:', fileReference);
      console.log('Updated Property:', updatedProperty);
      console.log('==================================');
      
    } catch (error) {
      console.error('File upload failed:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleRemoveFile = async () => {
    if (!property.fileReference) return;
    
    try {
      await fileStorageService.removeFile(property.fileReference.id);
      
      const updatedProperty = { 
        ...property, 
        fileReference: undefined, 
        updatedAt: Date.now() 
      };
      onUpdateProperty(updatedProperty);
      
      console.log('=== File Removed Successfully ===');
      console.log('Removed file ID:', property.fileReference.id);
      console.log('Updated Property:', updatedProperty);
      console.log('==================================');
      
    } catch (error) {
      console.error('File removal failed:', error);
      alert(`Failed to remove file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

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
        className="bg-white rounded-lg border-2 border-gray-300 shadow-lg flex flex-col"
        style={{
          width: '100%',
          maxWidth: '672px',
          maxHeight: '80vh',
          margin: '0 16px',
          overflow: 'hidden'
        }}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">More Options for "{property.name}"</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation - Fixed */}
        <div className="flex border-b border-gray-200 px-4 flex-shrink-0">
          {(["examples", "Embed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          {activeTab === "examples" && (
            <div className="space-y-3">
                {/* Generate with AI Section */}
                <div className="text-center">
                  <button
                    onClick={handleGenerateExamples}
                    disabled={isGeneratingExamples}
                    className="px-4 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {isGeneratingExamples ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Generating Examples...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">✨</span>
                        <span>Generate Examples with AI</span>
                      </div>
                    )}
                  </button>
                </div>

              {/* Selection Controls */}
              {examples.length > 0 && (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-xs text-gray-600 font-medium">
                    {selectedExamples.size} of {examples.length} examples selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedExamples(new Set(examples))}
                      disabled={selectedExamples.size === examples.length}
                      className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-green-200"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedExamples(new Set())}
                      disabled={selectedExamples.size === 0}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-gray-200"
                    >
                      Unselect All
                    </button>
                  </div>
                </div>
              )}

              {/* Add new example */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Add a new example..."
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddExample();
                  }}
                />
                <button
                  onClick={handleAddExample}
                  disabled={!newExample.trim()}
                  className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Examples list */}
              <div className="space-y-1.5">
                {examples.map((example, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between rounded-lg border p-2 cursor-pointer transition-all duration-200 ${
                      selectedExamples.has(example)
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleToggleExample(example)}
                  >
                    <span className="text-xs text-gray-900 flex-1">{example}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        selectedExamples.has(example)
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {selectedExamples.has(example) ? "Selected" : "Click to select"}
                      </span>
                    </div>
                  </div>
                ))}
                {examples.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-3">
                    No examples yet. Add some manually or generate with AI.
                  </p>
                )}
              </div>
            </div>
          )}

          {activeTab === "Embed" && (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="text-xs font-medium text-gray-900 mb-1.5">Embed OOPrompt Object</h3>
                <p className="text-xs text-gray-500">
                  Use another OOPrompt object as the value for this property to create complex, nested definitions.
                </p>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={() => {
                    if (onCreateEmbeddedObject) {
                      onCreateEmbeddedObject(property.id, currentOOP.id);
                      onClose();
                    }
                  }}
                  className="w-full text-left p-2 border-2 border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">➕</span>
                    <div>
                      <div className="text-xs font-medium text-blue-900">Create New Object</div>
                      <div className="text-xs text-blue-700">Create a new OOPrompt object to embed in this property</div>
                    </div>
                  </div>
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-white text-gray-500 text-xs">or</span>
                  </div>
                </div>
                
                {latestObjects.length > 0 ? (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-medium text-gray-900">Select Existing Object:</h4>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 border border-gray-200 rounded-lg p-2">
                      {latestObjects.map((obj) => (
                        <button
                          key={obj.id}
                          onClick={() => {
                            if (onEmbedExistingObject) {
                              onEmbedExistingObject(property.id, obj.id, obj.name || obj.main_task || 'Untitled Object');
                              onClose();
                            }
                          }}
                          className="w-full text-left p-2 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">📄</span>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-900 truncate">
                                {obj.main_task || obj.name || 'Untitled Object'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {obj.properties.length} properties
                              </div>
                              <div className="text-xs text-gray-400">
                                Last updated: {new Date(obj.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <span className="text-lg block mb-1">📝</span>
                    <p className="text-xs">No existing objects available to embed.</p>
                    <p className="text-xs mt-1">Create some objects first, then come back to embed them.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom (only for Examples tab) */}
        {activeTab === "examples" && (
          <div className="flex gap-2 p-4 border-t border-gray-200 flex-shrink-0">
            <button
              onClick={handleSaveExamples}
              disabled={selectedExamples.size === 0}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save {selectedExamples.size > 0 ? `(${selectedExamples.size})` : ''} Examples
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
