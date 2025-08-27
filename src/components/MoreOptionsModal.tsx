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
  const [activeTab, setActiveTab] = useState<"examples" | "Embed" | "reference">("examples");
  const [examples, setExamples] = useState<string[]>(property.examples || []);
  const [selectedExamples, setSelectedExamples] = useState<Set<string>>(new Set(property.examples || []));
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
  const [newExample, setNewExample] = useState("");
  
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

  // Auto-switch to examples tab if reference tab is hidden for Gemini/Claude
  useEffect(() => {
    if (activeTab === "reference" && (selectedLLM === 'gemini' || selectedLLM === 'claude')) {
      setActiveTab("examples");
    }
  }, [selectedLLM, activeTab]);

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
        className="modal-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          width: '100%',
          maxWidth: '672px',
          maxHeight: '80vh',
          margin: '0 16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">More Options for "{property.name}"</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-4">
          {(["examples", "Embed", "reference"] as const)
            .filter(tab => {
              // Hide "reference" tab for Gemini and Claude since they don't support file processing
              if (tab === "reference" && (selectedLLM === 'gemini' || selectedLLM === 'claude')) {
                return false;
              }
              return true;
            })
            .map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {activeTab === "examples" && (
            <div className="space-y-4">
                {/* Generate with AI Section */}
                <div className="text-center">
                  <button
                    onClick={handleGenerateExamples}
                    disabled={isGeneratingExamples}
                    className="px-6 py-3 bg-blue-600 text-white text-base rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium shadow-sm hover:shadow-md"
                  >
                    {isGeneratingExamples ? (
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Generating Examples...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-lg">✨</span>
                        <span>Generate Examples with AI</span>
                      </div>
                    )}
                  </button>
                </div>

              {/* Selection Controls */}
              {examples.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-600 font-medium">
                    {selectedExamples.size} of {examples.length} examples selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedExamples(new Set(examples))}
                      disabled={selectedExamples.size === examples.length}
                      className="px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-green-200"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedExamples(new Set())}
                      disabled={selectedExamples.size === 0}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium border border-gray-200"
                    >
                      Unselect All
                    </button>
                  </div>
                </div>
              )}

              {/* Add new example */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Add a new example..."
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddExample();
                  }}
                />
                <button
                  onClick={handleAddExample}
                  disabled={!newExample.trim()}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  Add
                </button>
              </div>

              {/* Examples list */}
              <div className="space-y-2">
                {examples.map((example, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedExamples.has(example)
                        ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                        : "bg-gray-50 border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => handleToggleExample(example)}
                  >
                    <span className="text-sm text-gray-900 flex-1">{example}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
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
                  <p className="text-gray-500 text-sm text-center py-4">
                    No examples yet. Add some manually or generate with AI.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSaveExamples}
                  disabled={selectedExamples.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save {selectedExamples.size > 0 ? `(${selectedExamples.size})` : ''} Examples
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activeTab === "Embed" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-md font-medium text-gray-900 mb-2">Embed OOPrompt Object</h3>
                <p className="text-gray-500 text-sm">
                  Use another OOPrompt object as the value for this property to create complex, nested definitions.
                </p>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    if (onCreateEmbeddedObject) {
                      onCreateEmbeddedObject(property.id, currentOOP.id);
                      onClose();
                    }
                  }}
                  className="w-full text-left p-4 border-2 border-blue-200 bg-blue-50 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">➕</span>
                    <div>
                      <div className="font-medium text-blue-900">Create New Object</div>
                      <div className="text-sm text-blue-700">Create a new OOPrompt object to embed in this property</div>
                    </div>
                  </div>
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or</span>
                  </div>
                </div>
                
                {promptObjects.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Select Existing Object:</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2">
                      {promptObjects.filter(obj => obj.id !== currentOOP.id).map((obj) => (
                        <button
                          key={obj.id}
                          onClick={() => {
                            if (onEmbedExistingObject) {
                              onEmbedExistingObject(property.id, obj.id, obj.name || obj.main_task || 'Untitled Object');
                              onClose();
                            }
                          }}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">📄</span>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 truncate">
                                {obj.name || obj.main_task || 'Untitled Object'}
                              </div>
                              <div className="text-sm text-gray-500 truncate">
                                {obj.main_task} • {obj.properties.length} properties
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
                  <div className="text-center py-6 text-gray-500">
                    <span className="text-2xl block mb-2">📝</span>
                    <p className="text-sm">No existing objects available to embed.</p>
                    <p className="text-xs mt-1">Create some objects first, then come back to embed them.</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {activeTab === "reference" && (
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Upload Reference</h3>
              <p className="text-gray-500 text-sm">
                Upload a file or document to reference for this property.
              </p>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.svg"
                className="hidden"
              />
              
              {/* File upload area */}
              {!property.fileReference ? (
                <div 
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-gray-500">
                    <div className="text-lg mb-2">📁</div>
                    <div className="text-sm">
                      {dragActive ? 'Drop file here' : 'Drag and drop files here, or click to browse'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Supports: PDF, DOC, TXT, Images</div>
                  </div>
                  
                  {isUploading ? (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-gray-600">Uploading... {uploadProgress}%</div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      Browse Files
                    </button>
                  )}
                </div>
              ) : (
                /* File display and management */
                <div className="border border-gray-200 rounded-xl p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 text-xl">📎</span>
                      <div>
                        <div className="font-medium text-green-800">{property.fileReference.fileName}</div>
                        <div className="text-sm text-green-600">
                          {(property.fileReference.fileSize / 1024).toFixed(1)} KB • {property.fileReference.fileType}
                        </div>
                        <div className="text-xs text-green-500">
                          Uploaded: {new Date(property.fileReference.uploadTime).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fileStorageService.downloadFile(property.fileReference!)}
                        className="text-xs text-green-600 hover:text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-100 transition-colors"
                        title="Download file"
                      >
                        ⬇️ Download
                      </button>
                      <button
                        onClick={handleRemoveFile}
                        className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-100 transition-colors"
                        title="Remove file"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-900 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
