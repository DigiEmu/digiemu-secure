/**
 * RFC 8785-compliant JSON canonicalization
 * 
 * Implements JSON Canonicalization Scheme (JCS) per RFC 8785:
 * - UTF-16 code unit property sorting
 * - Lone surrogate rejection
 * - NaN and Infinity rejection
 * - __proto__ preservation
 * - Recursive object sorting
 * - Array order preservation
 */

interface ValidationError {
  valid: false;
  error: string;
  path: string;
}

interface ValidationSuccess {
  valid: true;
}

type ValidationResult = ValidationError | ValidationSuccess;

/**
 * Validate input per RFC 8785 requirements
 */
function validateInput(value: unknown, path = ''): ValidationResult {
  // Check for NaN or Infinity (RFC 8785 Section 3.2.2.3)
  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return { valid: false, error: 'NaN not permitted per RFC 8785', path };
    }
    if (!Number.isFinite(value)) {
      return { valid: false, error: 'Infinity not permitted per RFC 8785', path };
    }
  }
  
  // Check for lone surrogates in strings (RFC 8785 Section 3.2.2.2)
  if (typeof value === 'string') {
    for (let i = 0; i < value.length; i++) {
      const codeUnit = value.charCodeAt(i);
      if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF) {
        // High surrogate
        if (i === value.length - 1) {
          return { valid: false, error: 'Lone high surrogate at end of string', path };
        }
        const nextCodeUnit = value.charCodeAt(i + 1);
        if (nextCodeUnit < 0xDC00 || nextCodeUnit > 0xDFFF) {
          return { valid: false, error: 'Lone high surrogate not followed by low surrogate', path };
        }
      }
      if (codeUnit >= 0xDC00 && codeUnit <= 0xDFFF) {
        // Low surrogate
        if (i === 0) {
          return { valid: false, error: 'Lone low surrogate at start of string', path };
        }
        const prevCodeUnit = value.charCodeAt(i - 1);
        if (prevCodeUnit < 0xD800 || prevCodeUnit > 0xDBFF) {
          return { valid: false, error: 'Lone low surrogate not preceded by high surrogate', path };
        }
      }
    }
  }
  
  // Recursively validate objects and arrays
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const result = validateInput(value[i], `${path}[${i}]`);
      if (!result.valid) return result;
    }
  }
  
  if (value && typeof value === 'object') {
    // Use Reflect.ownKeys to include __proto__ and other non-enumerable properties
    const keys = Reflect.ownKeys(value) as (string | symbol)[];
    for (const key of keys) {
      if (typeof key === 'string') {
        const keyResult = validateInput(key, `${path}.${key}`);
        if (!keyResult.valid) return keyResult;
        const valueResult = validateInput((value as Record<string, unknown>)[key], `${path}.${key}`);
        if (!valueResult.valid) return valueResult;
      }
    }
  }
  
  return { valid: true };
}

/**
 * UTF-16 code unit comparison per RFC 8785 Section 3.2.3
 * Compares strings as arrays of UTF-16 code units, treating them as unsigned integers
 */
function compareUtf16CodeUnits(a: string, b: string): number {
  const minLen = Math.min(a.length, b.length);
  
  for (let i = 0; i < minLen; i++) {
    const aCode = a.charCodeAt(i);
    const bCode = b.charCodeAt(i);
    
    if (aCode !== bCode) {
      // Treat as unsigned integers per RFC 8785
      // Use unsigned 32-bit comparison
      return (aCode & 0xFFFF) - (bCode & 0xFFFF);
    }
  }
  
  // If all compared characters are equal, shorter string comes first
  return a.length - b.length;
}

/**
 * Get all own property keys including __proto__
 * Uses Object.getOwnPropertyNames to get all own properties
 * Note: JavaScript may reorder integer-index properties during object construction
 * This is a known limitation of the JavaScript object model
 */
function getAllOwnKeys(obj: object): string[] {
  return Object.getOwnPropertyNames(obj)
    .sort(compareUtf16CodeUnits);
}

/**
 * Serialize string per RFC 8785 Section 3.2.2.2
 * Handles control characters, escapes, and Unicode
 */
function serializeString(str: string): string {
  let result = '"';
  
  for (let i = 0; i < str.length; i++) {
    const codeUnit = str.charCodeAt(i);
    
    // Control characters (U+0000 through U+001F)
    if (codeUnit >= 0x0000 && codeUnit <= 0x001F) {
      const controlChars: { [key: number]: string } = {
        0x0008: '\\b',
        0x0009: '\\t',
        0x000A: '\\n',
        0x000C: '\\f',
        0x000D: '\\r'
      };
      
      if (controlChars[codeUnit]) {
        result += controlChars[codeUnit];
      } else {
        result += '\\u' + codeUnit.toString(16).padStart(4, '0');
      }
    }
    // Quote and backslash
    else if (codeUnit === 0x0022) {
      result += '\\"';
    }
    else if (codeUnit === 0x005C) {
      result += '\\\\';
    }
    // All other characters serialized as-is
    else {
      result += str[i];
    }
  }
  
  result += '"';
  return result;
}

/**
 * Serialize number per RFC 8785 Section 3.2.2.3
 * Uses JSON.stringify which follows ECMA-262 Section 7.1.12.1
 */
function serializeNumber(num: number): string {
  return JSON.stringify(num);
}

/**
 * Canonicalize value recursively
 */
function canonicalize(value: unknown): string {
  // Validate input first
  const validation = validateInput(value);
  if (!validation.valid) {
    throw new Error(`${validation.error} at ${validation.path}`);
  }
  
  // Null
  if (value === null) {
    return 'null';
  }
  
  // Boolean
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  
  // Number
  if (typeof value === 'number') {
    return serializeNumber(value);
  }
  
  // String
  if (typeof value === 'string') {
    return serializeString(value);
  }
  
  // Array
  if (Array.isArray(value)) {
    const elements = value.map(canonicalize);
    return '[' + elements.join(',') + ']';
  }
  
  // Object
  if (value && typeof value === 'object') {
    const keys = getAllOwnKeys(value);
    const members = keys.map(key => {
      const serializedKey = serializeString(key);
      const serializedValue = canonicalize((value as Record<string, unknown>)[key]);
      return serializedKey + ':' + serializedValue;
    });
    return '{' + members.join(',') + '}';
  }
  
 throw new Error(`Unsupported type: ${typeof value}`);
}

/**
 * Main canonicalization function
 * 
 * @param value - The value to canonicalize
 * @returns RFC 8785-compliant canonical JSON string
 */
export function canonicalJson(value: unknown): string {
  return canonicalize(value);
}
