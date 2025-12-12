import { useState, useEffect } from "react";
import type { 
  ObjectModifierEnvelope, 
  ConflictItem, 
  JsonPatchOp,
  Property,
  Emphasis
} from "../types";
import type { OOPromptObject } from "../types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentOOP: OOPromptObject;
  onApplyPatches: (patches: JsonPatchOp[]) => void;
  onError?: (title: string, message: string) => void;
};

type RequestType = "conflict_check" | "more_possible_properties" | "modify_language";

// Helper function to format property names for display
function formatPropertyName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => {
      // Handle common abbreviations and technical terms
             const commonAbbr = {
         'id': 'ID',
         'url': 'URL',
         'api': 'API',
         'ui': 'UI',
         'ux': 'UX',
         'ai': 'AI',
         'llm': 'LLM',
         'gpt': 'GPT',
         'html': 'HTML',
         'css': 'CSS',
         'js': 'JavaScript',
         'json': 'JSON',
         'xml': 'XML',
         'sql': 'SQL',
         'db': 'Database',
         'dbms': 'DBMS',
         'http': 'HTTP',
         'https': 'HTTPS',
         'ftp': 'FTP',
         'ssh': 'SSH',
         'tcp': 'TCP',
         'udp': 'UDP',
         'ip': 'IP',
         'dns': 'DNS',
         'ssl': 'SSL',
         'tls': 'TLS',
         'oauth': 'OAuth',
         'jwt': 'JWT',
         'rss': 'RSS',
         'sdk': 'SDK',
         'cli': 'CLI',
         'gui': 'GUI',
         'cpu': 'CPU',
         'gpu': 'GPU',
         'ram': 'RAM',
         'rom': 'ROM',
         'hdd': 'HDD',
         'ssd': 'SSD',
         'usb': 'USB',
         'hdmi': 'HDMI',
         'wifi': 'WiFi',
         'bluetooth': 'Bluetooth',
         'gps': 'GPS',
         'nfc': 'NFC',
         'qr': 'QR',
         'pdf': 'PDF',
         'doc': 'Document',
         'txt': 'Text',
         'img': 'Image',
         'pic': 'Picture',
         'vid': 'Video',
         'aud': 'Audio',
         'mp3': 'MP3',
         'mp4': 'MP4',
         'avi': 'AVI',
         'jpg': 'JPEG',
         'jpeg': 'JPEG',
         'png': 'PNG',
         'gif': 'GIF',
         'svg': 'SVG',
         'zip': 'ZIP',
         'rar': 'RAR',
         'tar': 'TAR',
         'gz': 'GZIP',
         '7z': '7-Zip'
       };
      
      const lowerWord = word.toLowerCase();
      if (commonAbbr[lowerWord as keyof typeof commonAbbr]) {
        return commonAbbr[lowerWord as keyof typeof commonAbbr];
      }
      
      // Handle camelCase
      if (/^[a-z][a-zA-Z]*$/.test(word)) {
        return word.replace(/([A-Z])/g, ' $1').trim();
      }
      
      // Handle PascalCase
      if (/^[A-Z][a-zA-Z]*$/.test(word)) {
        return word.replace(/([A-Z])/g, ' $1').trim();
      }
      
      // Handle snake_case and kebab-case
      if (word.includes('_') || word.includes('-')) {
        return word.replace(/[_-]/g, ' ');
      }
      
      // Default: capitalize first letter, lowercase rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}

export function ObjectModifierModal({ 
  isOpen, 
  onClose, 
  currentOOP, 
  onApplyPatches,
  onError 
}: Props) {
  const [activeTab, setActiveTab] = useState<RequestType>("conflict_check");
  const [isLoading, setIsLoading] = useState(false);
  const [envelope, setEnvelope] = useState<ObjectModifierEnvelope | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      // Don't reset envelope when reopening - keep the analysis results
      // Only reset if this is a fresh open (no envelope from previous session)
      if (!envelope) {
        setSelectedItems(new Set());
        setCursor(null);
        setActiveTab("conflict_check");
      }
    }
  }, [isOpen, envelope]);

  // Debug selectedItems changes
  useEffect(() => {
    console.log(`🔄 selectedItems changed:`, Array.from(selectedItems));
  }, [selectedItems]);

  const handleAnalyze = async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    try {
      const { llmService } = await import("../services/llmService");
      const result = await llmService.analyzeObjectModifier(
        currentOOP,
        activeTab,
        cursor || undefined
      );
      
      console.log(`🔍 Setting envelope with suggestedProperties:`, result.suggestedProperties?.map(p => ({ suggestionId: p.suggestionId, name: p.name })));
      setEnvelope(result);
      setCursor(result.summary.cursor);
    } catch (error) {
      console.error("Object modifier analysis failed:", error);
      if (onError) {
        onError(
          "Analysis Failed", 
          `Failed to analyze ${activeTab}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (newTab: RequestType) => {
    if (newTab !== activeTab) {
      // Check if there are unsaved changes
      const hasUnsavedChanges = selectedItems.size > 0 || envelope !== null;
      
      if (hasUnsavedChanges) {
        // Show confirmation dialog
        const tabName = newTab === "conflict_check" ? "Check Conflicts" : 
                       newTab === "more_possible_properties" ? "Suggest Properties" : 
                       "Improve Wording";
        
        const changeDetails = [];
        if (selectedItems.size > 0) {
          changeDetails.push(`${selectedItems.size} selected item(s)`);
        }
        if (envelope !== null) {
          changeDetails.push("analysis results");
        }
        
        const confirmed = window.confirm(
          `⚠️ Unsaved Changes Detected\n\n` +
          `You have: ${changeDetails.join(" and ")}\n\n` +
          `Switching to "${tabName}" will remove these changes.\n\n` +
          `• Click "OK" to continue and lose changes\n` +
          `• Click "Cancel" to stay on current tab\n\n` +
          `Do you want to continue?`
        );
        
        if (!confirmed) {
          return; // Don't switch tabs
        }
      }
      
      setActiveTab(newTab);
      // Reset envelope and cursor when switching tabs
      setEnvelope(null);
      setSelectedItems(new Set());
      setCursor(null);
      
      // Clear any previous error state
      console.log(`Switched to ${newTab} tab - resetting analysis state`);
    }
  };

  const handleLoadMore = async () => {
    if (!cursor) return;
    await handleAnalyze();
  };

  const handleApplyPatches = () => {
    console.log(`🚀 handleApplyPatches called`);
    console.log(`🚀 envelope exists:`, !!envelope);
    console.log(`🚀 selectedItems:`, Array.from(selectedItems));
    
    if (!envelope) {
      console.log(`❌ No envelope, returning`);
      return;
    }

    const patches: JsonPatchOp[] = [];
    
          // Collect patches from selected items
      selectedItems.forEach(itemId => {
        console.log(`🔄 Processing selected item: ${itemId}`);
        
        // Skip conflict resolution property selection items (they contain ':' but are not suggested properties)
        if (itemId.includes(':') && !itemId.startsWith('suggested:')) {
          console.log(`⏩ Skipping conflict property selection item: ${itemId}`);
          return;
        }
      
      switch (activeTab) {
        case "conflict_check":
          const conflict = envelope.conflicts?.find(c => c.conflictId === itemId);
          console.log(`🔍 Found conflict for ${itemId}:`, conflict?.title);
          
          if (conflict) {
            if (conflict.category === "duplicate_name") {
              console.log(`🔄 Processing duplicate_name conflict`);
              
              // For duplicate name conflicts, find which property the user selected to keep
              const selectedPropertyId = Array.from(selectedItems)
                .find(id => id.startsWith(`${conflict.conflictId}:`))
                ?.split(':')[1];
              
              console.log(`🎯 Selected property ID: ${selectedPropertyId}`);
              
              if (selectedPropertyId) {
                // Generate patches to remove conflicting properties except the selected one
                const patchesToRemove = generateDuplicateResolutionPatches(conflict, currentOOP, selectedPropertyId);
                console.log(`📝 Generated ${patchesToRemove.length} patches for duplicate resolution`);
                patches.push(...patchesToRemove);
              } else {
                console.log(`❌ No selected property found for conflict ${conflict.conflictId}`);
              }
            } else if (conflict.suggestedResolutions?.[0]?.patch) {
              console.log(`🔄 Processing other conflict type with suggested resolution`);
              // For other conflicts, use the suggested resolution
              patches.push(...conflict.suggestedResolutions[0].patch);
            }
          } else {
            console.log(`❌ No conflict found for itemId: ${itemId}`);
          }
          break;
          
        case "more_possible_properties":
          console.log(`🔍 Looking for property with itemId: ${itemId}`);
          console.log(`🔍 Available suggestedProperties:`, envelope.suggestedProperties?.map(p => ({ suggestionId: p.suggestionId, name: p.name })));
          
          // Try to find property by exact suggestionId match first
          let property = envelope.suggestedProperties?.find(p => p.suggestionId === itemId);
          
          // If not found and itemId starts with 'suggested:', try to find by property name
          if (!property && itemId.startsWith('suggested:')) {
            const propertyName = itemId.split(':')[1];
            console.log(`🔍 Trying to find property by name: ${propertyName}`);
            property = envelope.suggestedProperties?.find(p => p.name.toLowerCase() === propertyName.toLowerCase());
          }
          
          console.log(`🔍 Found property:`, property);
          if (property) {
            if (property.patch && property.patch.length > 0) {
              // Use the AI-provided patches if available
              console.log(`🔄 Using AI-provided patches for property: ${property.name}`);
              patches.push(...property.patch);
            } else {
              // Generate patches manually if AI didn't provide them
              console.log(`🔄 Generating patches manually for property: ${property.name}`);
              const newProperty: Property = {
                id: `p${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: property.name,
                value: property.valueTemplate?.placeholder || property.valueTemplate?.example || "Value to be filled",
                action: "normal" as Emphasis,
                source: "ai-suggested",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              
              // Create an "add" patch to add the new property
              const addPatch: JsonPatchOp = {
                op: "add",
                path: "/properties/-",
                value: newProperty
              };
              
              console.log(`📝 Generated add patch for property:`, addPatch);
              patches.push(addPatch);
            }
          }
          break;
          
        case "modify_language":
          const modification = envelope.languageModifications?.find(m => m.modId === itemId);
          if (modification?.patch) {
            patches.push(...modification.patch);
          }
          break;
      }
    });

    console.log(`📊 Total patches collected: ${patches.length}`);
    console.log(`📝 Patches:`, patches);

    if (patches.length > 0) {
      console.log(`🎯 ObjectModifierModal: About to apply ${patches.length} patches`);
      console.log(`🎯 ObjectModifierModal: Patches to apply:`, JSON.stringify(patches, null, 2));
      console.log(`🎯 ObjectModifierModal: Current object state before patches:`, JSON.stringify(currentOOP, null, 2));
      console.log(`🎯 ObjectModifierModal: Current object has ${currentOOP.properties.length} properties`);
      
      // Log the properties that should be removed
      patches.forEach((patch, index) => {
        if (patch.op === 'remove' && patch.path.startsWith('/properties/')) {
          const targetIndex = parseInt(patch.path.split('/')[2]);
          const propertyToRemove = currentOOP.properties[targetIndex];
          console.log(`🎯 Patch ${index} will remove property at index ${targetIndex}:`, propertyToRemove);
        }
      });
      
      onApplyPatches(patches);
      
      console.log(`🎯 ObjectModifierModal: Patches sent to parent component`);
      
      // Reset the menu after applying patches - clear analysis results and selections
      console.log(`🔄 Resetting AI suggestion menu after applying patches`);
      setEnvelope(null);
      setSelectedItems(new Set());
      setCursor(null);
      setActiveTab("conflict_check");
      
      onClose();
    } else {
      console.log(`❌ No patches to apply!`);
    }
  };

  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleDuplicatePropertySelection = (conflictId: string, propertyId: string) => {
    const newSelected = new Set(selectedItems);
    
    // Remove any existing selections for this conflict
    Array.from(newSelected).forEach(id => {
      if (id.startsWith(`${conflictId}:`)) {
        newSelected.delete(id);
      }
    });
    
    // Add the selected property
    newSelected.add(`${conflictId}:${propertyId}`);
    
    // Also add the conflict itself to indicate it's been resolved
    newSelected.add(conflictId);
    
    setSelectedItems(newSelected);
    
    console.log(`🎯 Selected property ${propertyId} to keep for conflict ${conflictId}`);
    console.log(`🎯 Updated selectedItems:`, Array.from(newSelected));
    console.log(`🎯 Apply button count should be:`, getSelectedItemsCount());
  };

  // Count actual conflicts that can be applied (not individual property selections)
  const getSelectedItemsCount = () => {
    if (!envelope) return 0;
    
    let count = 0;
    
    console.log(`🔍 getSelectedItemsCount: activeTab=${activeTab}, selectedItems=`, Array.from(selectedItems));
    
    // Count selected conflicts
    if (activeTab === "conflict_check" && envelope.conflicts) {
      envelope.conflicts.forEach(conflict => {
        if (selectedItems.has(conflict.conflictId)) {
          console.log(`🔍 Found selected conflict: ${conflict.conflictId}`);
          count++;
        }
      });
    }
    
    // Count selected suggested properties
    if (activeTab === "more_possible_properties" && envelope.suggestedProperties) {
      envelope.suggestedProperties.forEach(property => {
        if (selectedItems.has(property.suggestionId)) {
          count++;
        }
      });
    }
    
    // Count selected language modifications
    if (activeTab === "modify_language" && envelope.languageModifications) {
      envelope.languageModifications.forEach(modification => {
        if (selectedItems.has(modification.modId)) {
          count++;
        }
      });
    }
    
    console.log(`🔍 getSelectedItemsCount returning: ${count}`);
    return count;
  };

  const renderConflicts = () => {
    console.log(`🔍 renderConflicts: envelope exists:`, !!envelope);
    console.log(`🔍 renderConflicts: envelope.conflicts:`, envelope?.conflicts);
    console.log(`🔍 renderConflicts: conflicts count:`, envelope?.conflicts?.length || 0);
    
    if (!envelope?.conflicts) return null;

    const grouped = {
      errors: envelope.conflicts.filter(c => c.severity === "error"),
      warnings: envelope.conflicts.filter(c => c.severity === "warning"),
      infos: envelope.conflicts.filter(c => c.severity === "info")
    };

    return (
      <div className="space-y-4">
                      {grouped.errors.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-700 mb-1.5">🚨 Errors ({grouped.errors.length})</h4>
                  <div className="space-y-2">
                    {grouped.errors.map(conflict => (
                      <ConflictCard 
                        key={conflict.conflictId}
                        conflict={conflict}
                        currentOOP={currentOOP}
                        selectedItems={selectedItems}
                        isSelected={selectedItems.has(conflict.conflictId)}
                        onToggle={() => handleItemToggle(conflict.conflictId)}
                        onDuplicatePropertySelection={handleDuplicatePropertySelection}
                      />
                    ))}
                  </div>
                </div>
              )}
        
        {grouped.warnings.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-yellow-700 mb-1.5">⚠️ Warnings ({grouped.warnings.length})</h4>
            <div className="space-y-2">
              {grouped.warnings.map(conflict => (
                <ConflictCard 
                  key={conflict.conflictId}
                  conflict={conflict}
                  currentOOP={currentOOP}
                  selectedItems={selectedItems}
                  isSelected={selectedItems.has(conflict.conflictId)}
                  onToggle={() => handleItemToggle(conflict.conflictId)}
                  onDuplicatePropertySelection={handleDuplicatePropertySelection}
                />
              ))}
            </div>
          </div>
        )}
        
        {grouped.infos.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-blue-700 mb-1.5">ℹ️ Info ({grouped.infos.length})</h4>
            <div className="space-y-2">
              {grouped.infos.map(conflict => (
                <ConflictCard 
                  key={conflict.conflictId}
                  conflict={conflict}
                  currentOOP={currentOOP}
                  selectedItems={selectedItems}
                  isSelected={selectedItems.has(conflict.conflictId)}
                  onToggle={() => handleItemToggle(conflict.conflictId)}
                  onDuplicatePropertySelection={handleDuplicatePropertySelection}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSuggestedProperties = () => {
    if (!envelope?.suggestedProperties) return null;

    return (
      <div className="space-y-2">
        {envelope.suggestedProperties.map(property => (
                     <div 
             key={property.suggestionId}
             className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
               selectedItems.has(property.suggestionId)
                 ? "border-blue-500 bg-blue-50"
                 : "border-gray-200 hover:border-gray-300"
             }`}
             onClick={() => handleItemToggle(property.suggestionId)}
           >
             <div className="flex items-start gap-3">
               <div className="flex-1 min-w-0">
                 <div className="flex items-start gap-2 mb-1.5">
                   <div className="flex-1 min-w-0">
                     <div className="text-xs font-semibold text-gray-900 break-words leading-tight">
                       {formatPropertyName(property.name)}
                     </div>
                   </div>
                   <div className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full flex-shrink-0">
                     AI Suggested
                   </div>
                 </div>
                 <div className="text-xs text-gray-700 mb-1.5 leading-relaxed break-words">{property.rationale}</div>
                 {property.valueTemplate && (
                   <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                     <div className="text-xs font-medium text-blue-800 mb-0.5">💡 Suggested Value Format:</div>
                     <div className="text-xs text-blue-700 space-y-0.5">
                       {property.valueTemplate.type === "string" && (
                         <div>• <strong>Text input</strong> - Enter any words or sentences</div>
                       )}
                       {property.valueTemplate.type === "number" && (
                         <div>• <strong>Number input</strong> - Enter a numeric value</div>
                       )}
                       {property.valueTemplate.type === "enum" && (
                         <div>• <strong>Choose from options</strong> - Select one of the available choices</div>
                       )}
                       {property.valueTemplate.type === "json" && (
                         <div>• <strong>Structured data</strong> - Enter in a specific format</div>
                       )}
                       
                       {property.valueTemplate.placeholder && (
                         <div>• <strong>Suggested:</strong> "{property.valueTemplate.placeholder}"</div>
                       )}
                       {property.valueTemplate.example && (
                         <div>• <strong>Example:</strong> "{property.valueTemplate.example}"</div>
                       )}
                       {property.valueTemplate.enumValues && property.valueTemplate.enumValues.length > 0 && (
                         <div>• <strong>Available options:</strong> {property.valueTemplate.enumValues.join(", ")}</div>
                       )}
                     </div>
                   </div>
                 )}
               </div>
               <div className="flex flex-col items-end gap-2 flex-shrink-0">
                 <div className="text-center">
                   <div className="text-xs text-gray-500 mb-0.5">AI Confidence</div>
                   <div className="flex items-center gap-1">
                     <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full transition-all duration-300"
                         style={{ width: `${Math.round(property.confidence * 100)}%` }}
                       ></div>
                     </div>
                     <span className="text-xs font-medium text-gray-700">
                       {Math.round(property.confidence * 100)}%
                     </span>
                   </div>
                 </div>
                 <input
                   type="checkbox"
                   checked={selectedItems.has(property.suggestionId)}
                   onChange={() => handleItemToggle(property.suggestionId)}
                   className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                 />
               </div>
             </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLanguageModifications = () => {
    if (!envelope?.languageModifications) return null;

    return (
      <div className="space-y-2">
        {envelope.languageModifications.map(modification => (
          <div 
            key={modification.modId}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedItems.has(modification.modId)
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handleItemToggle(modification.modId)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium text-xs">
                  {/* Show property name if changing name, otherwise show value change */}
                  {modification.current.name && modification.proposed.name && modification.current.name !== modification.proposed.name ? (
                    <span><span className="text-gray-600">Name:</span> "{modification.current.name}" → "{modification.proposed.name}"</span>
                  ) : modification.current.value && modification.proposed.value && modification.current.value !== modification.proposed.value ? (
                    <span><span className="text-gray-600">Value:</span> "{modification.current.value}" → "{modification.proposed.value}"</span>
                  ) : (
                    <span>Property modification</span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-1">{modification.rationale}</div>
              </div>
              <div className="flex items-center gap-2 ml-3">
                <div className="text-xs text-gray-500">
                  {Math.round(modification.confidence * 100)}% confidence
                </div>
                <input
                  type="checkbox"
                  checked={selectedItems.has(modification.modId)}
                  onChange={() => handleItemToggle(modification.modId)}
                  className="w-4 h-4 text-blue-600"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
             {/* Modal */}
               <div className="relative bg-white rounded-lg border-2 border-gray-300 shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
         
         {/* Floating Apply Button removed to avoid overlap with fixed actions section */}
        {/* Header - Fixed height */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">AI Object Analysis</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
          
                     {/* Tab Navigation */}
           <div className="flex gap-2 mt-3">
             {(["conflict_check", "more_possible_properties", "modify_language"] as const).map((tab) => (
               <button
                 key={tab}
                 onClick={() => handleTabChange(tab)}
                 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors relative ${
                   activeTab === tab
                     ? "bg-blue-600 text-white"
                     : "bg-white text-gray-600 hover:bg-gray-100"
                 }`}
               >
                 {tab === "conflict_check" && "🔍 Check Conflicts"}
                 {tab === "more_possible_properties" && "➕ Suggest Properties"}
                 {tab === "modify_language" && "✏️ Improve Wording"}
                 
                 {/* Show indicator if current tab has unsaved changes */}
                 {activeTab === tab && (selectedItems.size > 0 || envelope !== null) && (
                   <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></span>
                 )}
               </button>
             ))}
           </div>
           
           {/* Unsaved changes warning */}
           {(selectedItems.size > 0 || envelope !== null) && (
             <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
               <div className="flex items-center gap-2 text-orange-700">
                 <span className="text-xs">⚠️</span>
                 <div className="text-xs">
                   <div>
                     {selectedItems.size > 0 
                       ? `You have ${selectedItems.size} item(s) selected. ` 
                       : "You have analysis results. "
                     }
                     Remember to apply changes before switching tabs.
                   </div>
                   {selectedItems.size > 0 && (
                     <div className="mt-1 text-orange-600">
                       💡 Tip: Click "Apply Selected" to save your changes
                     </div>
                   )}
                 </div>
               </div>
             </div>
           )}
        </div>
        
                {/* Content - Scrollable with fixed height */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {!envelope ? (
            <div className="text-center py-6">
              <p className="text-xs text-gray-600 mb-3">
                Click "Analyze" to get AI-powered analysis of your OOPrompt object.
              </p>
              <button
                onClick={handleAnalyze}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {isLoading ? "Analyzing..." : "Analyze"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{envelope.summary.total}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{envelope.summary.errors}</div>
                    <div className="text-xs text-gray-600">Errors</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-yellow-600">{envelope.summary.warnings}</div>
                    <div className="text-xs text-gray-600">Warnings</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{envelope.summary.infos}</div>
                    <div className="text-xs text-gray-600">Info</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {envelope.summary.hasMore ? "Yes" : "No"}
                    </div>
                    <div className="text-xs text-gray-600">More Available</div>
                  </div>
                </div>
              </div>

              {/* Content based on active tab - removed outer scrollbar to prevent double scrolling */}
              <div className="pr-2">
                {activeTab === "conflict_check" && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-3">🔍 Conflict Analysis</h4>
                    {renderConflicts()}
                  </div>
                )}
                                 {activeTab === "more_possible_properties" && (
                   <div>
                     <h4 className="text-xs font-semibold text-gray-900 mb-3">➕ Property Suggestions</h4>
                     
                     {/* Helpful Instructions */}
                     <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                       <div className="flex items-start gap-2">
                         <div className="text-blue-600 text-sm">💡</div>
                         <div className="text-xs text-blue-800">
                           <div className="font-medium mb-1.5">How to use AI Property Suggestions:</div>
                           <ul className="space-y-0.5 text-blue-700">
                             <li>• <strong>Review</strong> each suggested property and its explanation</li>
                             <li>• <strong>Check</strong> the suggested value format to understand what to enter</li>
                             <li>• <strong>Select</strong> properties you want to add by checking the boxes</li>
                             <li>• <strong>Click "Apply Selected"</strong> to add them to your prompt</li>
                           </ul>
                         </div>
                       </div>
                     </div>
                     
                     {renderSuggestedProperties()}
                   </div>
                 )}
                {activeTab === "modify_language" && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-3">✏️ Language Improvements</h4>
                    {renderLanguageModifications()}
                  </div>
                )}
              </div>

              {/* Load More */}
              {envelope.summary.hasMore && cursor && (
                <div className="text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    {isLoading ? "Loading..." : "Load More"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Actions - Always visible when there are results, with better positioning */}
        {envelope && (
          <div className={`px-4 py-3 flex justify-between items-center border-t border-gray-200 flex-shrink-0 transition-colors duration-200 ${
            getSelectedItemsCount() > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="text-xs text-gray-600">
              {getSelectedItemsCount() > 0 ? `${getSelectedItemsCount()} item(s) selected` : "No items selected"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 text-xs font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyPatches}
                disabled={getSelectedItemsCount() === 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                ✅ Apply Selected ({getSelectedItemsCount()})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to generate patches for duplicate name resolution
function generateDuplicateResolutionPatches(conflict: ConflictItem, currentOOP: OOPromptObject, selectedPropertyId: string): JsonPatchOp[] {
  if (conflict.category !== "duplicate_name") {
    return [];
  }

  console.log(`🔧 Generating duplicate resolution patches for conflict: ${conflict.title}`);
  
  // Find all properties with the duplicate name
  let duplicateName = "";
  
  console.log(`🔍 Conflict title: "${conflict.title}"`);
  console.log(`🔍 Conflict description: "${conflict.description}"`);
  console.log(`🔍 Properties involved IDs:`, conflict.propertiesInvolved);
  
  // Start with properties involved approach since it's most reliable
  if (conflict.propertiesInvolved.length > 0) {
    const involvedProperties = currentOOP.properties.filter(p => 
      conflict.propertiesInvolved.includes(p.id)
    );
    
    console.log(`🔍 All involved properties:`, involvedProperties.map(p => ({ id: p.id, name: p.name, value: p.value })));
    
    if (involvedProperties.length > 0) {
      // Find the most common name among involved properties
      const nameCounts = involvedProperties.reduce((acc, prop) => {
        acc[prop.name] = (acc[prop.name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`🔍 Name counts from involved properties:`, nameCounts);
      
      const mostCommonName = Object.entries(nameCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0];
      
      if (mostCommonName) {
        duplicateName = mostCommonName;
        console.log(`🔍 Using most common name from involved properties: "${mostCommonName}"`);
      }
    }
  }
  
  // Fallback to pattern matching if properties involved approach failed
  if (!duplicateName) {
    console.log(`🔍 Trying pattern matching fallback...`);
    
    const patterns = [
      /duplicate.*?name.*?["'](.+?)["']/i,
      /duplicate.*?["'](.+?)["']/i,
      /["'](.+?)["'].*?duplicate/i,
      /duplicate.*?name.*?(\w+)/i
    ];
    
    for (const pattern of patterns) {
      const match = conflict.title.match(pattern);
      if (match && match[1]) {
        duplicateName = match[1].trim();
        console.log(`🔍 Pattern matched: "${duplicateName}"`);
        break;
      }
    }
    
    // If no pattern matched, try to find it in the description
    if (!duplicateName && conflict.description) {
      const descMatch = conflict.description.match(/["'](.+?)["']/);
      if (descMatch && descMatch[1]) {
        duplicateName = descMatch[1].trim();
        console.log(`🔍 Description match: "${duplicateName}"`);
      }
    }
  }
  
  console.log(`🔧 Extracted duplicate name: "${duplicateName}"`);
  console.log(`🔧 Looking for properties with name: "${duplicateName}"`);
  
  const duplicateProperties = currentOOP.properties.filter(p => 
    p.name.toLowerCase() === duplicateName.toLowerCase()
  );
  
  console.log(`🔧 Found ${duplicateProperties.length} duplicate properties:`, duplicateProperties.map(p => ({ id: p.id, name: p.name, value: p.value })));
  
  if (duplicateProperties.length <= 1) {
    console.log(`🔧 No duplicates found, returning empty patches`);
    return [];
  }
  
  // Keep the selected property, remove all others
  const propertiesToRemove = duplicateProperties.filter(p => p.id !== selectedPropertyId);
  console.log(`🔧 User selected property "${selectedPropertyId}" to keep`);
  console.log(`🔧 Will remove ${propertiesToRemove.length} duplicate properties:`, propertiesToRemove.map(p => ({ id: p.id, name: p.name })));
  
  // Generate remove patches for the duplicate properties
  const patches: JsonPatchOp[] = [];
  
  // Sort by index in descending order to avoid index shifting issues
  const sortedToRemove = propertiesToRemove
    .map(p => ({ property: p, index: currentOOP.properties.findIndex(prop => prop.id === p.id) }))
    .sort((a, b) => b.index - a.index);
  
  console.log(`🔧 Sorted properties to remove (descending index):`, sortedToRemove.map(({ property, index }) => ({ name: property.name, index })));
  
  sortedToRemove.forEach(({ property, index }) => {
    if (index !== -1) {
      const patch = {
        op: "remove" as const,
        path: `/properties/${index}`,
        value: undefined
      };
      patches.push(patch);
      console.log(`🔧 Generated remove patch for property "${property.name}" at index ${index}:`, patch);
    } else {
      console.log(`❌ Could not find index for property "${property.name}" with ID "${property.id}"`);
    }
  });
  
  console.log(`🔧 Generated ${patches.length} remove patches:`, patches);
  console.log(`🔧 Final patches array:`, JSON.stringify(patches, null, 2));
  return patches;
}

// Helper component for conflict display
function ConflictCard({ 
  conflict, 
  currentOOP,
  selectedItems,
  isSelected, 
  onToggle,
  onDuplicatePropertySelection
}: { 
  conflict: ConflictItem; 
  currentOOP: OOPromptObject;
  selectedItems: Set<string>;
  isSelected: boolean; 
  onToggle: () => void; 
  onDuplicatePropertySelection: (conflictId: string, propertyId: string) => void;
}) {
  return (
    <div 
      className={`p-3 border rounded-lg transition-colors ${
        conflict.category === "duplicate_name" 
          ? (isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200")
          : (isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 cursor-pointer")
      }`}
      onClick={conflict.category === "duplicate_name" ? undefined : onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium text-xs">{conflict.title}</div>
          <div className="text-xs text-gray-600 mt-1">{conflict.description}</div>
          {/* Hide property IDs from user display - they're technical implementation details */}
          <div className="text-xs text-gray-500 mt-1">
            {conflict.rationale}
          </div>
          
          {/* Show conflicting properties as clickable buttons for duplicate name conflicts */}
          {conflict.category === "duplicate_name" && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="font-medium text-yellow-800 mb-1.5 text-xs">🔍 Select Property to Keep:</div>
              <div className="text-yellow-700 text-xs mb-2">
                Click on the property you want to keep - others will be automatically removed
              </div>
              <div className="grid gap-2">
                {conflict.propertiesInvolved.map((propId) => {
                  const prop = currentOOP.properties.find(p => p.id === propId);
                  if (!prop) return null;
                  
                  const isPropertySelected = selectedItems.has(`${conflict.conflictId}:${propId}`);
                  
                  return (
                    <button
                      key={propId}
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent parent ConflictCard click
                        console.log(`🖱️ Property button clicked: ${propId} for conflict ${conflict.conflictId}`);
                        console.log(`🖱️ Before click - isPropertySelected: ${isPropertySelected}`);
                        onDuplicatePropertySelection(conflict.conflictId, propId);
                      }}
                      className={`w-full p-2 text-left rounded border-2 transition-all ${
                        isPropertySelected
                          ? 'border-green-500 bg-green-50 text-green-800 shadow-lg ring-2 ring-green-200'
                          : 'border-yellow-300 bg-white hover:border-yellow-400 hover:bg-yellow-50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-xs">{prop.name}</div>
                          {prop.value && typeof prop.value === 'string' && (
                            <div className="text-xs text-gray-600 mt-0.5">"{prop.value}"</div>
                          )}
                          {prop.action && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              Emphasis: {prop.action}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isPropertySelected && (
                            <span className="text-green-600 text-sm">✅</span>
                          )}
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            isPropertySelected ? 'bg-green-500' : 'bg-yellow-400'
                          }`}></span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedItems.has(conflict.conflictId) && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  ✅ Property selected for keeping - others will be removed
                </div>
                )}
            </div>
          )}
        </div>
        {/* Only show checkbox for non-duplicate conflicts */}
        {conflict.category !== "duplicate_name" && (
          <div className="flex items-center gap-2 ml-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              className="w-4 h-4 text-blue-600"
            />
          </div>
        )}
      </div>
    </div>
  );
}
