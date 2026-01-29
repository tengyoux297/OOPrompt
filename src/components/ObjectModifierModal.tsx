import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [activeTab, setActiveTab] = useState<RequestType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [envelope, setEnvelope] = useState<ObjectModifierEnvelope | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCardExpanded = useCallback((id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Clear suggestions whenever modal closes
  useEffect(() => {
    if (!isOpen) {
      console.log('🔄 Modal closed, clearing all suggestions');
      setEnvelope(null);
      setSelectedItems(new Set());
      setCursor(null);
      setExpandedCards(new Set());
    }
  }, [isOpen]);

  // Reset state when modal opens (no tab selected initially)
  useEffect(() => {
    if (isOpen) {
      setSelectedItems(new Set());
      setCursor(null);
      setEnvelope(null);
      setActiveTab(null);
      setExpandedCards(new Set());
    }
  }, [isOpen]);

  // Debug selectedItems changes
  useEffect(() => {
    console.log(`🔄 selectedItems changed:`, Array.from(selectedItems));
  }, [selectedItems]);

  const handleAnalyze = async (overrideTab?: RequestType | null) => {
    if (!isOpen) return;
    const tab = overrideTab ?? activeTab;
    if (tab == null) return;

    setIsLoading(true);
    try {
      const { llmService } = await import("../services/llmService");
      const result = await llmService.analyzeObjectModifier(
        currentOOP,
        tab,
        overrideTab ? undefined : cursor || undefined
      );

      console.log(`🔍 Setting envelope with suggestedProperties:`, result.suggestedProperties?.map(p => ({ suggestionId: p.suggestionId, name: p.name })));
      setEnvelope(result);
      setCursor(result.summary.cursor);
      setExpandedCards(new Set());
    } catch (error) {
      console.error("Object modifier analysis failed:", error);
      if (onError) {
        onError(
          "Analysis Failed",
          `Failed to analyze ${tab}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAndRun = async (tab: RequestType) => {
    setActiveTab(tab);
    setEnvelope(null);
    setSelectedItems(new Set());
    setCursor(null);
    await handleAnalyze(tab);
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
        
        // Skip duplicate-name conflict property selection items (format: conflictId:propertyId where conflictId already contains ':')
        // But allow: conflict:..., mod:..., suggested:..., sugg:..., sp_suggested:... (these are valid item IDs)
        // Note: sp_suggested: is a prefix used for suggested properties
        if (itemId.includes(':') && 
            !itemId.startsWith('suggested:') && 
            !itemId.startsWith('sugg:') && 
            !itemId.startsWith('sp_suggested:') &&
            !itemId.startsWith('mod:') && 
            !itemId.startsWith('conflict:')) {
          console.log(`⏩ Skipping conflict property selection item: ${itemId}`);
          return;
        }
      
      switch (activeTab) {
        case "conflict_check": {
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
        }
          
        case "more_possible_properties": {
          console.log(`🔍 Looking for property with itemId: ${itemId}`);
          console.log(`🔍 Available suggestedProperties:`, envelope.suggestedProperties?.map(p => ({ suggestionId: p.suggestionId, name: p.name })));
          
          // Normalize itemId by removing sp_ prefix if present
          let normalizedItemId = itemId;
          if (itemId.startsWith('sp_suggested:')) {
            normalizedItemId = itemId.replace(/^sp_/, '');
            console.log(`🔍 Normalized itemId from ${itemId} to ${normalizedItemId}`);
          }
          
          // Try to find property by exact suggestionId match first (with normalized ID)
          let property = envelope.suggestedProperties?.find(p => p.suggestionId === normalizedItemId || p.suggestionId === itemId);
          
          // If not found and itemId starts with 'suggested:', 'sugg:', or 'sp_suggested:', try to find by property name
          if (!property && (itemId.startsWith('suggested:') || itemId.startsWith('sugg:') || itemId.startsWith('sp_suggested:'))) {
            // Extract property name from itemId (remove prefix)
            const propertyName = normalizedItemId.split(':').slice(1).join(':'); // Handle multiple colons
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
                value: property.valueTemplate?.example || property.valueTemplate?.placeholder || "Value to be filled",
                emphasis: "normal" as Emphasis,
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
          } else {
            console.error(`❌ Property not found for itemId: ${itemId} (normalized: ${normalizedItemId})`);
            console.error(`❌ Available suggestionIds:`, envelope.suggestedProperties?.map(p => p.suggestionId));
          }
          break;
        }
          
        case "modify_language": {
          console.log(`🔍 Looking for modification with itemId: ${itemId}`);
          console.log(`🔍 Available modifications:`, envelope.languageModifications?.map(m => ({ modId: m.modId, targetId: m.targetId })));
          
          const modification = envelope.languageModifications?.find(m => m.modId === itemId);
          console.log(`🔍 Found modification:`, modification);
          
          if (modification) {
            if (modification.patch && modification.patch.length > 0) {
              console.log(`📝 Adding ${modification.patch.length} patches from AI`);
              patches.push(...modification.patch);
            } else {
              // Generate patches manually if AI didn't provide them
              console.log(`🔄 AI didn't provide patches, generating manually`);
              console.log(`🔄 modification.targetId:`, modification.targetId);
              console.log(`🔄 modification.current:`, modification.current);
              console.log(`🔄 modification.proposed:`, modification.proposed);
              
              // Find the property by targetId
              const propertyIndex = currentOOP.properties.findIndex(p => p.id === modification.targetId);
              console.log(`🔄 propertyIndex:`, propertyIndex);
              
              if (propertyIndex === -1) {
                console.error(`❌ Property with ID "${modification.targetId}" not found`);
                console.error(`❌ Available property IDs:`, currentOOP.properties.map(p => p.id));
              } else {
                const actualProperty = currentOOP.properties[propertyIndex];
                console.log(`✅ Found property:`, { name: actualProperty.name, value: actualProperty.value });
                
                let patchesGeneratedCount = 0;
                
                // Generate replace patches for name and/or value changes
                if (modification.proposed.name !== undefined && actualProperty.name !== modification.proposed.name) {
                  const namePatch = {
                    op: "replace" as const,
                    path: `/properties/${propertyIndex}/name`,
                    value: modification.proposed.name
                  };
                  patches.push(namePatch);
                  patchesGeneratedCount++;
                  console.log(`📝 Generated name patch:`, namePatch);
                }
                
                if (modification.proposed.value !== undefined) {
                  const currentValue = typeof actualProperty.value === 'string' ? actualProperty.value : '';
                  if (currentValue !== modification.proposed.value) {
                    const valuePatch = {
                      op: "replace" as const,
                      path: `/properties/${propertyIndex}/value`,
                      value: modification.proposed.value
                    };
                    patches.push(valuePatch);
                    patchesGeneratedCount++;
                    console.log(`📝 Generated value patch:`, valuePatch);
                  }
                }
                
                // Update timestamp if we generated any patches
                if (patchesGeneratedCount > 0) {
                  patches.push({
                    op: "replace",
                    path: `/properties/${propertyIndex}/updatedAt`,
                    value: Date.now()
                  });
                  console.log(`✅ Generated ${patchesGeneratedCount + 1} total patches`);
                } else {
                  console.warn(`⚠️ No patches generated - values appear unchanged`);
                }
              }
            }
          } else {
            console.warn(`⚠️ Modification ${itemId} not found in envelope`);
            console.warn(`⚠️ envelope.languageModifications:`, envelope.languageModifications);
          }
          break;
        }
      }
    });

    console.log(`📊 Total patches collected: ${patches.length}`);
    console.log(`📝 Patches:`, patches);
    console.log(`📊 Active tab: ${activeTab}`);
    console.log(`📊 Selected items:`, Array.from(selectedItems));

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
      console.log(`❌ Active tab: ${activeTab}`);
      console.log(`❌ Selected items:`, Array.from(selectedItems));
      console.log(`❌ Envelope has:`, {
        conflicts: envelope.conflicts?.length || 0,
        suggestedProperties: envelope.suggestedProperties?.length || 0,
        languageModifications: envelope.languageModifications?.length || 0
      });
      
      // Show error to user
      if (onError) {
        onError(
          "No Changes Selected",
          `No patches were generated from the selected items. Please ensure you have selected items and they contain valid patches.`
        );
      }
    }
  };

  const handleItemToggle = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
  }, []);

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
    
    if (!envelope?.conflicts || envelope.conflicts.length === 0) {
      return (
        <p className="text-sm text-gray-500 py-4">No conflicts found.</p>
      );
    }

    const grouped = {
      errors: envelope.conflicts.filter(c => c.severity === "error"),
      warnings: envelope.conflicts.filter(c => c.severity === "warning"),
      infos: envelope.conflicts.filter(c => c.severity === "info")
    };

    return (
      <div className="space-y-4">
                      {grouped.errors.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-2">🚨 Errors ({grouped.errors.length})</h4>
                  <div className="space-y-3">
                    {grouped.errors.map(conflict => (
                      <ConflictCard 
                        key={conflict.conflictId}
                        conflict={conflict}
                        currentOOP={currentOOP}
                        selectedItems={selectedItems}
                        isSelected={selectedItems.has(conflict.conflictId)}
                        isExpanded={expandedCards.has(conflict.conflictId)}
                        onToggle={() => handleItemToggle(conflict.conflictId)}
                        onToggleExpand={() => toggleCardExpanded(conflict.conflictId)}
                        onDuplicatePropertySelection={handleDuplicatePropertySelection}
                      />
                    ))}
                  </div>
                </div>
              )}
        
        {grouped.warnings.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-yellow-700 uppercase tracking-wide mb-2">⚠️ Warnings ({grouped.warnings.length})</h4>
            <div className="space-y-3">
              {grouped.warnings.map(conflict => (
                <ConflictCard 
                  key={conflict.conflictId}
                  conflict={conflict}
                  currentOOP={currentOOP}
                  selectedItems={selectedItems}
                  isSelected={selectedItems.has(conflict.conflictId)}
                  isExpanded={expandedCards.has(conflict.conflictId)}
                  onToggle={() => handleItemToggle(conflict.conflictId)}
                  onToggleExpand={() => toggleCardExpanded(conflict.conflictId)}
                  onDuplicatePropertySelection={handleDuplicatePropertySelection}
                />
              ))}
            </div>
          </div>
        )}
        
        {grouped.infos.length > 0 && (
          <div>
            <h4 className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-2">ℹ️ Info ({grouped.infos.length})</h4>
            <div className="space-y-3">
              {grouped.infos.map(conflict => (
                <ConflictCard 
                  key={conflict.conflictId}
                  conflict={conflict}
                  currentOOP={currentOOP}
                  selectedItems={selectedItems}
                  isSelected={selectedItems.has(conflict.conflictId)}
                  isExpanded={expandedCards.has(conflict.conflictId)}
                  onToggle={() => handleItemToggle(conflict.conflictId)}
                  onToggleExpand={() => toggleCardExpanded(conflict.conflictId)}
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
    if (!envelope?.suggestedProperties || envelope.suggestedProperties.length === 0) {
      return (
        <p className="text-sm text-gray-500 py-4">No property suggestions.</p>
      );
    }

    return (
      <div className="space-y-2">
        {envelope.suggestedProperties.map(property => {
          const id = property.suggestionId;
          const isExpanded = expandedCards.has(id);
          const isSelected = selectedItems.has(property.suggestionId) || selectedItems.has(`sp_${property.suggestionId}`);
          return (
            <div 
              key={property.suggestionId}
              className={`border rounded-lg transition-all duration-200 ${
                isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
            >
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                onClick={() => toggleCardExpanded(id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCardExpanded(id); } }}
              >
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 break-words">
                    {formatPropertyName(property.name)}
                  </span>
                  <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[11px] font-medium rounded-full flex-shrink-0">
                    AI Suggested
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[11px] text-gray-400">{Math.round(property.confidence * 100)}%</span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleItemToggle(selectedItems.has(`sp_${property.suggestionId}`) ? `sp_${property.suggestionId}` : property.suggestionId)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    aria-label="Select to apply"
                  />
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-100 space-y-2">
                  <p className="text-xs text-gray-600 leading-relaxed pt-2">{property.rationale}</p>
                  {property.valueTemplate && (
                    <div className="pt-2 border-t border-blue-100">
                      <div className="text-[11px] font-medium text-blue-600 uppercase tracking-wide mb-1">Suggested value format</div>
                      <div className="text-xs text-blue-800/90 space-y-0.5">
                        {property.valueTemplate.type === "string" && <div>• <strong>Text input</strong> — Enter any words or sentences</div>}
                        {property.valueTemplate.type === "number" && <div>• <strong>Number input</strong> — Enter a numeric value</div>}
                        {property.valueTemplate.type === "enum" && <div>• <strong>Choose from options</strong> — Select one of the available choices</div>}
                        {property.valueTemplate.type === "json" && <div>• <strong>Structured data</strong> — Enter in a specific format</div>}
                        {property.valueTemplate.placeholder && <div>• <strong>Suggested:</strong> "{property.valueTemplate.placeholder}"</div>}
                        {property.valueTemplate.example && <div>• <strong>Example:</strong> "{property.valueTemplate.example}"</div>}
                        {property.valueTemplate.enumValues && property.valueTemplate.enumValues.length > 0 && (
                          <div>• <strong>Available options:</strong> {property.valueTemplate.enumValues.join(", ")}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderLanguageModifications = () => {
    if (!envelope?.languageModifications || envelope.languageModifications.length === 0) {
      return (
        <p className="text-sm text-gray-500 py-4">No wording improvements suggested.</p>
      );
    }

    return (
      <div className="space-y-2">
        {envelope.languageModifications.map(modification => {
          const isExpanded = expandedCards.has(modification.modId);
          return (
            <div 
              key={modification.modId}
              className={`border rounded-lg transition-colors ${
                selectedItems.has(modification.modId)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-200"
              }`}
            >
              <div
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                onClick={() => toggleCardExpanded(modification.modId)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCardExpanded(modification.modId); } }}
              >
                <div className="flex-1 min-w-0 text-sm font-semibold text-gray-900 leading-snug">
                  {modification.current.name && modification.proposed.name && modification.current.name !== modification.proposed.name ? (
                    <>
                      <span className="line-through text-gray-500">"{modification.current.name}"</span>
                      <span className="mx-1.5 text-gray-400">→</span>
                      <span className="text-blue-700">"{modification.proposed.name}"</span>
                    </>
                  ) : modification.current.value && modification.proposed.value && modification.current.value !== modification.proposed.value ? (
                    <>
                      <span className="line-through text-gray-500">"{modification.current.value}"</span>
                      <span className="mx-1.5 text-gray-400">→</span>
                      <span className="text-blue-700">"{modification.proposed.value}"</span>
                    </>
                  ) : (
                    <span>Property modification</span>
                  )}
                </div>
                <span className="text-[11px] text-gray-400 flex-shrink-0">
                  {Math.round(modification.confidence * 100)}%
                </span>
                <input
                  type="checkbox"
                  checked={selectedItems.has(modification.modId)}
                  onChange={() => handleItemToggle(modification.modId)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-blue-600 flex-shrink-0 cursor-pointer"
                  aria-label="Select to apply"
                />
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-100">
                  <p className="text-xs text-gray-600 leading-relaxed pt-2">{modification.rationale}</p>
                </div>
              )}
            </div>
          );
        })}
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
      
             {/* Modal — compact when only buttons; large when showing results */}
               <div className={`relative bg-white rounded-lg border-2 border-gray-300 shadow-lg mx-4 flex flex-col ${
                 envelope ? "w-full max-w-4xl max-h-[90vh]" : "w-full max-w-sm"
               }`}>
         
         {/* Floating Apply Button removed to avoid overlap with fixed actions section */}
        {/* Header */}
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
        </div>

        {/* Three action buttons: vertical when no results; horizontal at top when results exist */}
        <div className={`flex-shrink-0 px-4 ${envelope ? "py-3 border-b border-gray-200 bg-gray-50/50" : "py-8"}`}>
          <div className={envelope ? "flex flex-row flex-wrap justify-center gap-2" : "flex flex-col gap-3 items-stretch max-w-xs mx-auto"}>
            {(["conflict_check", "more_possible_properties", "modify_language"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleSelectAndRun(tab)}
                disabled={isLoading}
                className={`rounded-lg font-medium transition-colors relative inline-flex items-center justify-center gap-2 ${
                  envelope ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
                } ${
                  activeTab === tab
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                } ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {isLoading && activeTab === tab ? (
                  <svg className="animate-spin h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    {tab === "conflict_check" && "🔍"}
                    {tab === "more_possible_properties" && "➕"}
                    {tab === "modify_language" && "✏️"}
                  </>
                )}
                {tab === "conflict_check" && "Check Conflicts"}
                {tab === "more_possible_properties" && "Suggest Properties"}
                {tab === "modify_language" && "Improve Wording"}
                {activeTab === tab && envelope && (selectedItems.size > 0 || envelope !== null) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content — scrollable when results exist; minimal when only buttons */}
        <div className={envelope ? "flex-1 overflow-y-auto p-4 min-h-0" : "flex-shrink-0"}>
          {envelope ? (
            <div className="space-y-3">
              {/* Content based on active tab */}
              <div className="pr-2">
                {activeTab === "conflict_check" && (
                  <div>
                    {renderConflicts()}
                  </div>
                )}
                                 {activeTab === "more_possible_properties" && (
                   <div>
                     {renderSuggestedProperties()}
                   </div>
                 )}
                {activeTab === "modify_language" && (
                  <div>
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
          ) : null}
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

// Helper component for conflict display — concise by default; click row to expand; only checkbox (or property choice) selects
function ConflictCard({ 
  conflict, 
  currentOOP,
  selectedItems,
  isSelected, 
  isExpanded,
  onToggle,
  onToggleExpand,
  onDuplicatePropertySelection
}: { 
  conflict: ConflictItem; 
  currentOOP: OOPromptObject;
  selectedItems: Set<string>;
  isSelected: boolean; 
  isExpanded: boolean;
  onToggle: () => void; 
  onToggleExpand: () => void;
  onDuplicatePropertySelection: (conflictId: string, propertyId: string) => void;
}) {
  return (
    <div 
      className={`border rounded-lg transition-colors ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
      }`}
    >
      <div
        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleExpand(); } }}
      >
        <div className="flex-1 min-w-0 text-sm font-semibold text-gray-900">{conflict.title}</div>
        {conflict.category !== "duplicate_name" && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle()}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 text-blue-600 flex-shrink-0 cursor-pointer"
            aria-label="Select to apply"
          />
        )}
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 space-y-1.5">
          <div className="text-xs text-gray-600 leading-relaxed pt-2">{conflict.description}</div>
          {conflict.rationale && (
            <p className="text-[11px] text-gray-500 leading-relaxed">{conflict.rationale}</p>
          )}
          {conflict.category === "duplicate_name" && (
            <div className="mt-2 p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-[11px] font-semibold text-yellow-800 uppercase tracking-wide mb-1">Select property to keep</div>
              <div className="text-yellow-700 text-xs mb-2">
                Click on the property you want to keep — others will be removed
              </div>
              <div className="grid gap-2">
                {conflict.propertiesInvolved.map((propId) => {
                  const prop = currentOOP.properties.find(p => p.id === propId);
                  if (!prop) return null;
                  const isPropertySelected = selectedItems.has(`${conflict.conflictId}:${propId}`);
                  return (
                    <button
                      key={propId}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
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
                          {prop.emphasis && (
                            <div className="text-xs text-gray-500 mt-0.5">Emphasis: {prop.emphasis}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isPropertySelected && <span className="text-green-600 text-sm">✅</span>}
                          <span className={`w-2.5 h-2.5 rounded-full ${isPropertySelected ? 'bg-green-500' : 'bg-yellow-400'}`} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedItems.has(conflict.conflictId) && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  ✅ Property selected for keeping — others will be removed
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
