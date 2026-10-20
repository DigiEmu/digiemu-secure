/**
 * Strict JSON parser with duplicate key detection
 * 
 * Implements RFC 8785 requirement to reject duplicate property names
 * at the parsing boundary (before lossy JSON.parse processing).
 * 
 * Uses a simple state machine to scan JSON for duplicate object keys
 * without fully parsing the structure.
 */

interface ParseResult {
  value: unknown;
  error?: string;
}

/**
 * Detect duplicate property names in JSON string
 * 
 * Scans the JSON string using a state machine to find duplicate
 * object property names before JSON.parse collapses them.
 */
export function detectDuplicateKeys(jsonString: string): { hasDuplicates: boolean; error?: string } {
  const state = {
    inString: false,
    escapeNext: false,
    inObject: false,
    depth: 0,
    currentKey: '',
    seenKeys: new Map<number, Set<string>>(), // depth -> set of keys
    position: 0
  };
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    state.position = i;
    
    if (state.escapeNext) {
      state.escapeNext = false;
      if (state.inString) {
        state.currentKey += char;
      }
      continue;
    }
    
    if (char === '\\') {
      state.escapeNext = true;
      if (state.inString) {
        state.currentKey += char;
      }
      continue;
    }
    
    if (char === '"') {
      if (state.inString) {
        // End of string
        if (state.inObject && state.depth > 0) {
          // Check if this is a property key (followed by :)
          // Look ahead for colon
          let j = i + 1;
          while (j < jsonString.length && jsonString[j].trim() === '') j++;
          if (j < jsonString.length && jsonString[j] === ':') {
            // This is a property key
            const keysAtDepth = state.seenKeys.get(state.depth) || new Set();
            if (keysAtDepth.has(state.currentKey)) {
              return { 
                hasDuplicates: true, 
                error: `Duplicate property name "${state.currentKey}" at position ${i}` 
              };
            }
            keysAtDepth.add(state.currentKey);
            state.seenKeys.set(state.depth, keysAtDepth);
          }
        }
        state.currentKey = '';
      } else {
        // Start of string
      }
      state.inString = !state.inString;
      continue;
    }
    
    if (state.inString) {
      state.currentKey += char;
      continue;
    }
    
    // Outside string - track structure
    if (char === '{') {
      state.inObject = true;
      state.depth++;
      state.seenKeys.set(state.depth, new Set());
    } else if (char === '}') {
      state.inObject = state.depth > 1; // Check if still in parent object
      state.depth--;
      state.seenKeys.delete(state.depth);
    } else if (char === '[') {
      state.inObject = false;
      state.depth++;
    } else if (char === ']') {
      state.depth--;
    }
  }
  
  return { hasDuplicates: false };
}

/**
 * Strict JSON parse that rejects duplicate keys
 */
export function strictJsonParse(text: string): ParseResult {
  // First check for duplicates
  const duplicateCheck = detectDuplicateKeys(text);
  if (duplicateCheck.hasDuplicates) {
    return { value: null, error: duplicateCheck.error };
  }
  
  // Parse with standard JSON.parse
  try {
    const value = JSON.parse(text);
    return { value };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : String(error) };
  }
}
