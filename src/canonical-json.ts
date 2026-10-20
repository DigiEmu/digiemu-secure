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
 *
 * Members are serialized directly in sorted order (no intermediate object is
 * rebuilt), so JavaScript's integer-index property ordering ("1" < "2" < "10")
 * cannot leak into the output.
 */

/**
 * UTF-16 code unit comparison per RFC 8785 Section 3.2.3
 * Compares strings as arrays of UTF-16 code units, treating them as unsigned integers
 */
export function compareUtf16CodeUnits(a: string, b: string): number {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    const diff = a.charCodeAt(i) - b.charCodeAt(i);
    if (diff !== 0) return diff;
  }
  // If all compared characters are equal, shorter string comes first
  return a.length - b.length;
}

/**
 * Serialize string per RFC 8785 Section 3.2.2.2
 * Handles control characters, escapes, and Unicode; rejects lone surrogates
 */
function serializeString(str: string, path: string): string {
  let result = '"';
  for (let i = 0; i < str.length; i++) {
    const codeUnit = str.charCodeAt(i);
    if (codeUnit >= 0xD800 && codeUnit <= 0xDBFF) {
      const next = str.charCodeAt(i + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) {
        throw new Error(`Lone high surrogate not permitted per RFC 8785 at ${path}`);
      }
      result += str[i] + str[i + 1];
      i++;
    } else if (codeUnit >= 0xDC00 && codeUnit <= 0xDFFF) {
      throw new Error(`Lone low surrogate not permitted per RFC 8785 at ${path}`);
    } else if (codeUnit < 0x20) {
      switch (codeUnit) {
        case 0x08: result += '\\b'; break;
        case 0x09: result += '\\t'; break;
        case 0x0A: result += '\\n'; break;
        case 0x0C: result += '\\f'; break;
        case 0x0D: result += '\\r'; break;
        default: result += '\\u' + codeUnit.toString(16).padStart(4, '0');
      }
    } else if (codeUnit === 0x22) {
      result += '\\"';
    } else if (codeUnit === 0x5C) {
      result += '\\\\';
    } else {
      result += str[i];
    }
  }
  return result + '"';
}

/**
 * Serialize number per RFC 8785 Section 3.2.2.3
 * ECMAScript Number::toString (via JSON.stringify, which also maps -0 to 0)
 */
function serializeNumber(num: number, path: string): string {
  if (Number.isNaN(num)) throw new Error(`NaN not permitted per RFC 8785 at ${path}`);
  if (!Number.isFinite(num)) throw new Error(`Infinity not permitted per RFC 8785 at ${path}`);
  return JSON.stringify(num);
}

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function canonicalize(value: unknown, path: string): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'boolean': return value ? 'true' : 'false';
    case 'number': return serializeNumber(value, path);
    case 'string': return serializeString(value, path);
    case 'object': break;
    default: throw new Error(`Unsupported type ${typeof value} at ${path || '$'}`);
  }

  if (Array.isArray(value)) {
    const elements: string[] = [];
    for (let i = 0; i < value.length; i++) {
      elements.push(canonicalize(value[i], `${path}[${i}]`));
    }
    return '[' + elements.join(',') + ']';
  }

  if (!isPlainObject(value)) {
    throw new Error(`Unsupported non-plain object at ${path || '$'}`);
  }

  // Own enumerable string keys; includes a "__proto__" own data property
  const record = value as Record<string, unknown>;
  const members = Object.keys(record).sort(compareUtf16CodeUnits).map(key => {
    const memberPath = `${path}.${key}`;
    return serializeString(key, memberPath) + ':' + canonicalize(record[key], memberPath);
  });
  return '{' + members.join(',') + '}';
}

/**
 * Main canonicalization function
 * 
 * @param value - The value to canonicalize (JSON data model only)
 * @returns RFC 8785-compliant canonical JSON string
 */
export function canonicalJson(value: unknown): string {
  return canonicalize(value, '');
}
