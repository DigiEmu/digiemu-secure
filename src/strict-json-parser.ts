/**
 * Strict JSON parser with duplicate key detection
 *
 * Implements RFC 8785 / I-JSON (RFC 7493) requirement to reject duplicate
 * property names at the parsing boundary, before a lossy JSON.parse would
 * silently keep only the last occurrence.
 *
 * - Full RFC 8259 grammar (recursive descent)
 * - Duplicate detection on *decoded* property names ("a" and "\u0061" collide)
 * - "__proto__" is created as an ordinary own data property (never a prototype)
 * - Numbers are converted exactly like JSON.parse
 */

const MAX_DEPTH = 1000;

export class StrictJsonError extends Error {
  constructor(message: string, public readonly position: number) {
    super(`${message} at position ${position}`);
    this.name = 'StrictJsonError';
  }
}

interface ParseResult {
  value: unknown;
  error?: string;
}

const ESCAPES: Record<string, string> = {
  '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t'
};

const NUMBER_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;

class Parser {
  private pos = 0;

  constructor(private readonly text: string) {}

  parse(): unknown {
    const value = this.parseValue(0);
    this.skipWhitespace();
    if (this.pos < this.text.length) this.fail('Unexpected trailing data');
    return value;
  }

  private fail(message: string): never {
    throw new StrictJsonError(message, this.pos);
  }

  private skipWhitespace(): void {
    while (this.pos < this.text.length) {
      const c = this.text[this.pos];
      if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') break;
      this.pos++;
    }
  }

  private expect(literal: string): void {
    if (!this.text.startsWith(literal, this.pos)) this.fail(`Expected '${literal}'`);
    this.pos += literal.length;
  }

  private parseValue(depth: number): unknown {
    this.skipWhitespace();
    const c = this.text[this.pos];
    switch (c) {
      case '{': return this.parseObject(depth + 1);
      case '[': return this.parseArray(depth + 1);
      case '"': return this.parseString();
      case 't': this.expect('true'); return true;
      case 'f': this.expect('false'); return false;
      case 'n': this.expect('null'); return null;
      case undefined: return this.fail('Unexpected end of input');
      default: return this.parseNumber();
    }
  }

  private parseObject(depth: number): Record<string, unknown> {
    if (depth > MAX_DEPTH) this.fail('Maximum nesting depth exceeded');
    this.pos++;
    const result: Record<string, unknown> = {};
    const seen = new Set<string>();
    this.skipWhitespace();
    if (this.text[this.pos] === '}') {
      this.pos++;
      return result;
    }
    for (;;) {
      this.skipWhitespace();
      if (this.text[this.pos] !== '"') this.fail('Expected property name');
      const keyPos = this.pos;
      const key = this.parseString();
      if (seen.has(key)) {
        throw new StrictJsonError(`Duplicate property name ${JSON.stringify(key)}`, keyPos);
      }
      seen.add(key);
      this.skipWhitespace();
      this.expect(':');
      // defineProperty keeps "__proto__" as an ordinary own data property
      Object.defineProperty(result, key, {
        value: this.parseValue(depth), enumerable: true, writable: true, configurable: true
      });
      this.skipWhitespace();
      const next = this.text[this.pos++];
      if (next === '}') return result;
      if (next !== ',') { this.pos--; this.fail("Expected ',' or '}'"); }
    }
  }

  private parseArray(depth: number): unknown[] {
    if (depth > MAX_DEPTH) this.fail('Maximum nesting depth exceeded');
    this.pos++;
    const result: unknown[] = [];
    this.skipWhitespace();
    if (this.text[this.pos] === ']') {
      this.pos++;
      return result;
    }
    for (;;) {
      result.push(this.parseValue(depth));
      this.skipWhitespace();
      const next = this.text[this.pos++];
      if (next === ']') return result;
      if (next !== ',') { this.pos--; this.fail("Expected ',' or ']'"); }
    }
  }

  private parseString(): string {
    this.pos++;
    let result = '';
    let chunkStart = this.pos;
    for (;;) {
      if (this.pos >= this.text.length) this.fail('Unterminated string');
      const code = this.text.charCodeAt(this.pos);
      if (code === 0x22) {
        result += this.text.slice(chunkStart, this.pos++);
        return result;
      }
      if (code < 0x20) this.fail('Unescaped control character in string');
      if (code !== 0x5c) {
        this.pos++;
        continue;
      }
      result += this.text.slice(chunkStart, this.pos);
      const esc = this.text[this.pos + 1];
      if (esc === 'u') {
        const hex = this.text.slice(this.pos + 2, this.pos + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Invalid unicode escape');
        result += String.fromCharCode(parseInt(hex, 16));
        this.pos += 6;
      } else if (esc !== undefined && esc in ESCAPES) {
        result += ESCAPES[esc];
        this.pos += 2;
      } else {
        this.fail('Invalid escape sequence');
      }
      chunkStart = this.pos;
    }
  }

  private parseNumber(): number {
    NUMBER_RE.lastIndex = this.pos;
    const match = NUMBER_RE.exec(this.text);
    if (!match) this.fail('Unexpected token');
    this.pos += match[0].length;
    return Number(match[0]);
  }
}

/**
 * Parse JSON text strictly. Throws StrictJsonError on malformed input
 * or duplicate property names.
 */
export function parseStrictJson(text: string): unknown {
  return new Parser(text).parse();
}

/**
 * Detect duplicate property names in JSON string
 */
export function detectDuplicateKeys(jsonString: string): { hasDuplicates: boolean; error?: string } {
  try {
    parseStrictJson(jsonString);
    return { hasDuplicates: false };
  } catch (error) {
    if (error instanceof StrictJsonError && error.message.startsWith('Duplicate property name')) {
      return { hasDuplicates: true, error: error.message };
    }
    return { hasDuplicates: false };
  }
}

/**
 * Strict JSON parse that rejects duplicate keys
 */
export function strictJsonParse(text: string): ParseResult {
  try {
    return { value: parseStrictJson(text) };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : String(error) };
  }
}
