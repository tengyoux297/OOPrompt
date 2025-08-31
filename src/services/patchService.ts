import type { JsonPatchOp, OOPromptObject, Property, SuggestedPropertyItem } from "../types";

export class PatchService {
  /**
   * Applies JSON patches to an OOPrompt object
   * Handles the special idx(<id>) syntax for property references
   */
  static applyPatches(obj: OOPromptObject, patches: JsonPatchOp[]): OOPromptObject {
    console.log("🔧 PatchService: Starting patch application");
    console.log("🔧 Object ID:", obj.id);
    console.log("🔧 Object properties count:", obj.properties.length);
    console.log("🔧 Property IDs in object:", obj.properties.map(p => p.id));
    console.log("🔧 Patches to apply:", JSON.stringify(patches, null, 2));
    
    let result = { ...obj };
    
    for (let i = 0; i < patches.length; i++) {
      const patch = patches[i];
      try {
        console.log(`🔧 Applying patch ${i + 1}/${patches.length}:`, patch);
        const beforeApply = JSON.stringify(result);
        result = this.applyPatch(result, patch);
        const afterApply = JSON.stringify(result);
        
        if (beforeApply !== afterApply) {
          console.log(`✅ Patch ${i + 1} applied successfully - object changed`);
        } else {
          console.log(`⚠️ Patch ${i + 1} applied but no change detected`);
        }
      } catch (error) {
        console.error(`❌ Failed to apply patch ${patch.op} ${patch.path}:`, error);
        throw new Error(`Patch application failed: ${patch.op} ${patch.path}`);
      }
    }
    
    console.log("🔧 Final result:", JSON.stringify(result, null, 2));
    console.log("🔧 Patch application complete");
    return result;
  }

  /**
   * Applies a single JSON patch operation
   */
  private static applyPatch(obj: OOPromptObject, patch: JsonPatchOp): OOPromptObject {
    const { op, path, value } = patch;
    
    // Handle special idx(<id>) syntax for property references
    const resolvedPath = this.resolvePropertyPath(obj, path);
    
    switch (op) {
      case "add":
        return this.addValue(obj, resolvedPath, value);
      case "remove":
        return this.removeValue(obj, resolvedPath);
      case "replace":
        return this.replaceValue(obj, resolvedPath, value);
      case "test":
        if (!this.testValue(obj, resolvedPath, value)) {
          throw new Error(`Test failed for path: ${path}`);
        }
        return obj;
      default:
        throw new Error(`Unknown patch operation: ${op}`);
    }
  }

  /**
   * Resolves property paths that use idx(<id>) syntax
   * Converts them to actual array indices
   */
  private static resolvePropertyPath(obj: OOPromptObject, path: string): string {
    console.log(`🔍 ResolvePropertyPath: path="${path}"`);
    console.log(`🔍 Available properties:`, obj.properties.map(p => ({ id: p.id, name: p.name })));
    
    // Handle idx(<id>) syntax for properties array
    if (path.includes("idx(")) {
      return path.replace(/idx\(([^)]+)\)/g, (_match, propertyId) => {
        console.log(`🔍 Looking for property ID: "${propertyId}"`);
        let index = obj.properties.findIndex(p => p.id === propertyId);
        console.log(`🔍 Found at index: ${index}`);
        
        if (index === -1) {
          console.warn(`🔍 Property with ID "${propertyId}" not found, trying fallback strategies...`);
          
          // Fallback 1: Try to match by property name if the ID looks like "suggested:name"
          if (propertyId.startsWith('suggested:')) {
            const suggestedName = propertyId.split(':')[1];
            console.log(`🔍 Fallback 1: Looking for property name "${suggestedName}"`);
            console.log(`🔍 Available property names:`, obj.properties.map(p => `"${p.name}"`));
            
            index = obj.properties.findIndex(p => p.name.toLowerCase() === suggestedName.toLowerCase());
            if (index !== -1) {
              console.log(`🔍 Fallback 1: Found property by name "${suggestedName}" at index ${index}`);
              return index.toString();
            } else {
              console.log(`🔍 Fallback 1: No exact match for "${suggestedName}"`);
              
              // Try partial name matching
              const partialMatch = obj.properties.findIndex(p => 
                p.name.toLowerCase().includes(suggestedName.toLowerCase()) ||
                suggestedName.toLowerCase().includes(p.name.toLowerCase())
              );
              if (partialMatch !== -1) {
                console.log(`🔍 Fallback 1b: Found partial name match "${obj.properties[partialMatch].name}" at index ${partialMatch}`);
                return partialMatch.toString();
              }
            }
          }
          
          // Fallback 1b: For wording suggestions, try to infer property name from the context
          // Check if this is a path like "/properties/idx(p...)/name" or "/properties/idx(p...)/value"
          const pathContext = path.split('/');
          const targetField = pathContext[pathContext.length - 1]; // 'name' or 'value'
          if (targetField === 'name' || targetField === 'value') {
            // For wording suggestions, we often know the property name from the modification context
            // Try to match by examining similar property names or common fields
            console.log(`🔍 Fallback 1b: Looking for properties that could be modified for field "${targetField}"`);
            
            // If we have only one property, it's likely the target
            if (obj.properties.length === 1) {
              console.log(`🔍 Fallback 1b: Only one property available, using it (index 0)`);
              return "0";
            }
            
            // If we have exactly one property with a name that could be a wording target
            const wordingCandidates = obj.properties.filter(p => 
              p.name && p.name.length > 0 && 
              !p.name.startsWith('_') && // Exclude technical properties
              p.source === 'user' // Prefer user-created properties
            );
            
            if (wordingCandidates.length === 1) {
              const candidateIndex = obj.properties.findIndex(p => p.id === wordingCandidates[0].id);
              console.log(`🔍 Fallback 1b: Found single wording candidate "${wordingCandidates[0].name}" at index ${candidateIndex}`);
              return candidateIndex.toString();
            }
          }
          
          // Fallback 2: Try to match by partial ID (in case there are timestamp differences)
          if (propertyId.startsWith('p')) {
            const baseId = propertyId.substring(0, 8); // Use first 8 characters for partial matching
            index = obj.properties.findIndex(p => p.id.startsWith(baseId));
            if (index !== -1) {
              console.log(`🔍 Fallback 2: Found property by partial ID "${baseId}" at index ${index}`);
              return index.toString();
            }
          }
          
          // Fallback 3: For debugging, try more aggressive partial matching
          if (propertyId.startsWith('p') && propertyId.length > 10) {
            // Try different prefix lengths - start with longer prefixes for better accuracy
            for (let prefixLen = Math.min(12, propertyId.length); prefixLen >= 6; prefixLen--) {
              const prefix = propertyId.substring(0, prefixLen);
              index = obj.properties.findIndex(p => p.id.startsWith(prefix));
              if (index !== -1) {
                console.log(`🔍 Fallback 3: Found property by prefix "${prefix}" (length ${prefixLen}) at index ${index}`);
                return index.toString();
              }
              console.log(`🔍 Fallback 3: No match for prefix "${prefix}"`);
            }
          }
          
          // Final fallback: For wording suggestions, use the first user property if available
          if (path.includes('/name') || path.includes('/value')) {
            const userProperties = obj.properties.filter(p => p.source === 'user');
            if (userProperties.length > 0) {
              const finalIndex = obj.properties.findIndex(p => p.id === userProperties[0].id);
              console.warn(`🔍 Final fallback: Using first user property "${userProperties[0].name}" at index ${finalIndex}`);
              return finalIndex.toString();
            }
            
            // Last resort: use first property
            if (obj.properties.length > 0) {
              console.warn(`🔍 Last resort: Using first available property at index 0`);
              return "0";
            }
          }
          
          console.error(`🔍 All fallback strategies failed. Property with ID "${propertyId}" not found in properties:`, obj.properties);
          throw new Error(`Property with ID ${propertyId} not found`);
        }
        
        console.log(`🔍 Resolved idx(${propertyId}) to index ${index}`);
        return index.toString();
      });
    }
    
    console.log(`🔍 No idx() found, returning original path: "${path}"`);
    return path;
  }



  /**
   * Adds a value at the specified path
   */
  private static addValue(obj: OOPromptObject, path: string, value: any): OOPromptObject {
    const pathParts = path.split('/').filter(Boolean);
    const result = { ...obj };
    
    console.log(`PatchService: Adding value at path: ${path}`);
    console.log(`PatchService: Path parts:`, pathParts);
    console.log(`PatchService: Value to add:`, value);
    
    if (pathParts.length === 0) {
      // Root level add
      return { ...obj, ...value };
    }
    
    let current: any = result;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      console.log(`PatchService: Processing part ${i}: ${part}, current:`, current);
      
      // Path is already resolved at the applyPatch level, no need to resolve again
      const resolvedPart = part;
      
      if (resolvedPart === 'properties' && current.properties) {
        current = current.properties;
      } else if (!isNaN(Number(resolvedPart)) && Array.isArray(current)) {
        current = current[Number(resolvedPart)];
      } else {
        current = current[resolvedPart];
      }
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    console.log(`PatchService: Last part: ${lastPart}, current:`, current);
    
    // Handle special case: adding to the end of an array with "-" index
    if (lastPart === '-' && Array.isArray(current)) {
      console.log(`PatchService: Adding to end of array, current length: ${current.length}`);
      current.push(value);
      console.log(`PatchService: New array length: ${current.length}`);
    } else if (lastPart === 'properties' && Array.isArray(current.properties)) {
      current.properties = [...current.properties, value];
    } else if (!isNaN(Number(lastPart)) && Array.isArray(current)) {
      current[Number(lastPart)] = value;
    } else if (lastPart === '-' && current && typeof current === 'object' && current.properties && Array.isArray(current.properties)) {
      // Special case: /properties/- means add to properties array
      console.log(`PatchService: Adding to properties array, current properties length: ${current.properties.length}`);
      current.properties.push(value);
      console.log(`PatchService: New properties length: ${current.properties.length}`);
    } else {
      // If we can't determine how to add the value, throw a helpful error
      console.error(`PatchService: Cannot add value at path: ${path}`);
      console.error(`PatchService: Current object structure:`, current);
      console.error(`PatchService: Last part: ${lastPart}`);
      throw new Error(`Cannot add value at path: ${path} - invalid target`);
    }
    
    return result;
  }

  /**
   * Removes a value at the specified path
   */
  private static removeValue(obj: OOPromptObject, path: string): OOPromptObject {
    const pathParts = path.split('/').filter(Boolean);
    
    console.log(`🗑️ RemoveValue: path=${path}, pathParts=`, pathParts);
    
    // For simple property removal, handle directly
    if (pathParts.length === 2 && pathParts[0] === 'properties' && !isNaN(Number(pathParts[1]))) {
      const index = Number(pathParts[1]);
      
      console.log(`🗑️ RemoveValue: Direct property removal - index=${index}`);
      
      if (index >= 0 && index < obj.properties.length) {
        const result = { ...obj };
        result.properties = [
          ...obj.properties.slice(0, index),
          ...obj.properties.slice(index + 1)
        ];
        
        console.log(`🗑️ RemoveValue: Removed property at index ${index}`);
        console.log(`🗑️ RemoveValue: Properties count: ${obj.properties.length} → ${result.properties.length}`);
        
        return result;
      } else {
        throw new Error(`Property index ${index} out of bounds`);
      }
    }
    
    // Fallback to general path traversal for other cases
    const result = { ...obj };
    let current: any = result;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      console.log(`🗑️ RemoveValue: navigating part ${i}: ${part}`);
      
      if (part === 'properties' && current.properties) {
        current.properties = [...current.properties];
        current = current.properties;
        console.log(`🗑️ RemoveValue: entered properties array, length=${current.length}`);
      } else if (!isNaN(Number(part)) && Array.isArray(current)) {
        const index = Number(part);
        current[index] = { ...current[index] };
        current = current[index];
        console.log(`🗑️ RemoveValue: accessed array index ${index}`);
      } else {
        current[part] = { ...current[part] };
        current = current[part];
        console.log(`🗑️ RemoveValue: accessed object property ${part}`);
      }
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    console.log(`🗑️ RemoveValue: removing lastPart=${lastPart}`);
    
    if (!isNaN(Number(lastPart)) && Array.isArray(current)) {
      // For array removal, create a new array without the specified index
      const index = Number(lastPart);
      const newArray = [
        ...current.slice(0, index),
        ...current.slice(index + 1)
      ];
      
      // Find the parent object and update it
      const parentPath = pathParts.slice(0, -1);
      let parent = result;
      let parentCurrent: any = parent;
      
      for (let i = 0; i < parentPath.length - 1; i++) {
        const part = parentPath[i];
        if (part === 'properties' && parentCurrent.properties) {
          parentCurrent.properties = [...parentCurrent.properties];
          parentCurrent = parentCurrent.properties;
        } else if (!isNaN(Number(part)) && Array.isArray(parentCurrent)) {
          const idx = Number(part);
          parentCurrent[idx] = { ...parentCurrent[idx] };
          parentCurrent = parentCurrent[idx];
        } else {
          parentCurrent[part] = { ...parentCurrent[part] };
          parentCurrent = parentCurrent[part];
        }
      }
      
      const lastParentPart = parentPath[parentPath.length - 1];
      if (lastParentPart === 'properties') {
        parentCurrent.properties = newArray;
      } else if (!isNaN(Number(lastParentPart))) {
        parentCurrent[Number(lastParentPart)] = newArray;
      } else {
        parentCurrent[lastParentPart] = newArray;
      }
      
      console.log(`🗑️ RemoveValue: Removed array element at index ${index}`);
    } else {
      delete current[lastPart];
      console.log(`🗑️ RemoveValue: Deleted object property ${lastPart}`);
    }
    
    console.log(`🗑️ RemoveValue: final result=`, result);
    return result;
  }

  /**
   * Replaces a value at the specified path
   */
  private static replaceValue(obj: OOPromptObject, path: string, value: any): OOPromptObject {
    const pathParts = path.split('/').filter(Boolean);
    
    console.log(`📝 ReplaceValue: path=${path}, pathParts=`, pathParts, `value=`, value);
    
    // For simple property modifications, handle directly
    if (pathParts.length === 3 && pathParts[0] === 'properties' && !isNaN(Number(pathParts[1]))) {
      const index = Number(pathParts[1]);
      const propertyField = pathParts[2];
      
      console.log(`📝 ReplaceValue: Direct property modification - index=${index}, field=${propertyField}`);
      
      if (index >= 0 && index < obj.properties.length) {
        const result = { ...obj };
        result.properties = [...obj.properties];
        result.properties[index] = { ...obj.properties[index] };
        (result.properties[index] as any)[propertyField] = value;
        
        console.log(`📝 ReplaceValue: Modified property ${index}.${propertyField} =`, value);
        console.log(`📝 ReplaceValue: Updated property:`, result.properties[index]);
        
        return result;
      } else {
        throw new Error(`Property index ${index} out of bounds`);
      }
    }
    
    // Fallback to general path traversal for other cases
    const result = { ...obj };
    let current: any = result;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      console.log(`📝 ReplaceValue: navigating part ${i}: ${part}, current=`, current);
      
      if (part === 'properties' && current.properties) {
        current.properties = [...current.properties];
        current = current.properties;
        console.log(`📝 ReplaceValue: entered properties array, length=${current.length}`);
      } else if (!isNaN(Number(part)) && Array.isArray(current)) {
        const index = Number(part);
        current[index] = { ...current[index] };
        current = current[index];
        console.log(`📝 ReplaceValue: accessed array index ${index}`);
      } else {
        current[part] = { ...current[part] };
        current = current[part];
        console.log(`📝 ReplaceValue: accessed object property ${part}`);
      }
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    console.log(`📝 ReplaceValue: setting lastPart=${lastPart} to value=`, value);
    current[lastPart] = value;
    
    console.log(`📝 ReplaceValue: final result=`, result);
    return result;
  }

  /**
   * Tests if a value exists at the specified path
   */
  private static testValue(obj: OOPromptObject, path: string, expectedValue: any): boolean {
    const pathParts = path.split('/').filter(Boolean);
    
    let current: any = obj;
    for (const part of pathParts) {
      // Path is already resolved at the applyPatch level, no need to resolve again
      const resolvedPart = part;
      
      if (resolvedPart === 'properties' && current.properties) {
        current = current.properties;
      } else if (!isNaN(Number(resolvedPart)) && Array.isArray(current)) {
        current = current[Number(resolvedPart)];
      } else {
        current = current[resolvedPart];
      }
      
      if (current === undefined) {
        return false;
      }
    }
    
    return JSON.stringify(current) === JSON.stringify(expectedValue);
  }

  /**
   * Creates a new property with the given template
   */
  static createPropertyFromTemplate(
    template: SuggestedPropertyItem,
    _existingProperties: Property[]
  ): Property {
    const newId = `p${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let value = "";
    if (template.valueTemplate) {
      switch (template.valueTemplate.type) {
        case "string":
          value = template.valueTemplate.placeholder || "";
          break;
        case "number":
          value = template.valueTemplate.example || "0";
          break;
        case "enum":
          value = template.valueTemplate.enumValues?.[0] || "";
          break;
        case "json":
          value = template.valueTemplate.example || "{}";
          break;
        default:
          value = "";
      }
    }
    
    return {
      id: newId,
      name: template.name,
      value,
              action: "normal",
      source: "ai-suggested",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Validates that patches can be applied to the object
   */
  static validatePatches(obj: OOPromptObject, patches: JsonPatchOp[]): string[] {
    const errors: string[] = [];
    
    for (const patch of patches) {
      try {
        // Test if the patch can be applied
        if (patch.op === "test") {
          this.testValue(obj, patch.path, patch.value);
        } else if (patch.op === "add" || patch.op === "replace") {
          // Check if the path is valid
          this.validatePath(obj, patch.path);
        }
      } catch (error) {
        errors.push(`Patch ${patch.op} ${patch.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    return errors;
  }

  /**
   * Validates that a path is valid for the given object
   */
  private static validatePath(obj: OOPromptObject, path: string): void {
    console.log(`🔍 ValidatePath: Validating path: ${path}`);
    
    // First resolve the path (handle idx() syntax)
    const resolvedPath = this.resolvePropertyPath(obj, path);
    console.log(`🔍 ValidatePath: Resolved path: ${resolvedPath}`);
    
    const pathParts = resolvedPath.split('/').filter(Boolean);
    
    let current: any = obj;
    for (const part of pathParts) {
      console.log(`🔍 ValidatePath: Processing part: ${part}, current type: ${Array.isArray(current) ? 'array' : typeof current}`);
      
      if (part === 'properties' && current.properties) {
        current = current.properties;
      } else if (part === '-' && Array.isArray(current)) {
        // "-" is valid for arrays (means "add to end")
        console.log(`🔍 ValidatePath: Found array append indicator (-), continuing`);
        continue;
      } else if (!isNaN(Number(part)) && Array.isArray(current)) {
        const index = Number(part);
        if (index < 0 || index > current.length) {
          throw new Error(`Array index ${index} out of bounds`);
        }
        current = current[index];
      } else if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        console.log(`🔍 ValidatePath: Invalid part "${part}" in resolved path "${resolvedPath}"`);
        console.log(`🔍 ValidatePath: Current object keys:`, current && typeof current === 'object' ? Object.keys(current) : 'not an object');
        throw new Error(`Invalid path: ${path} (resolved to: ${resolvedPath})`);
      }
    }
    
    console.log(`🔍 ValidatePath: Path validation successful`);
  }
}
