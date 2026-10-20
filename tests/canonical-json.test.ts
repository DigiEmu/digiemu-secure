/**
 * DigiEmu Secure RFC 8785 Canonicalization Tests
 *
 * - Official RFC 8785 test vectors (cyberphone/json-canonicalization testdata,
 *   RFC 8785 Section 3.2.3 sorting example, Appendix B number samples)
 * - Integer-index property ordering
 * - __proto__ preservation
 * - Strict duplicate-key detection at JSON input boundaries
 * - Backward compatibility with legacy canonicalization and existing Ed25519 signatures
 *
 * Tests: JCS-001 through JCS-012
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { createPublicKey, verify } from 'node:crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { canonicalJson } from '../src/canonical-json.js';
import { parseStrictJson, strictJsonParse, detectDuplicateKeys, StrictJsonError } from '../src/strict-json-parser.js';
import { sha256Hex } from '../src/hash-utils.js';
import { BundleVerifier } from '../src/bundle-verifier.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXAMPLES = path.join(ROOT, 'examples');

/**
 * Pre-RFC 8785 canonicalization (as shipped before 2118ac5), kept for compatibility checks
 */
function legacyCanonicalJson(value: unknown): string {
  const sortDeep = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sortDeep);
    if (v && typeof v === 'object') {
      const input = v as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      for (const key of Object.keys(input).sort()) output[key] = sortDeep(input[key]);
      return output;
    }
    return v;
  };
  return JSON.stringify(sortDeep(value));
}

function jcs(text: string): string {
  return canonicalJson(parseStrictJson(text));
}

function listJsonFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsonFiles(full);
    return entry.name.endsWith('.json') ? [full] : [];
  });
}

function doubleFromHex(hex: string): number {
  return Buffer.from(hex, 'hex').readDoubleBE(0);
}

function ed25519KeyFromRaw(base64: string) {
  const x = Buffer.from(base64, 'base64').toString('base64url');
  return createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x }, format: 'jwk' });
}

// ============================================
// Official RFC 8785 test vectors
// ============================================

const RFC8785_VECTORS: Array<{ name: string; input: string; expected: string }> = [
  {
    name: 'arrays.json',
    input: String.raw`[
      56,
      {
        "d": true,
        "10": null,
        "1": [ ]
      }
    ]`,
    expected: String.raw`[56,{"1":[],"10":null,"d":true}]`
  },
  {
    name: 'french.json',
    input: String.raw`{
      "peach": "This sorting order",
      "p\u00e9ch\u00e9": "is wrong according to French",
      "p\u00eache": "but canonicalization MUST",
      "sin":   "ignore locale"
    }`,
    expected: '{"peach":"This sorting order","p\u00e9ch\u00e9":"is wrong according to French","p\u00eache":"but canonicalization MUST","sin":"ignore locale"}'
  },
  {
    name: 'structures.json',
    input: String.raw`{
      "1": {"f": {"f": "hi","F": 5} ,"\n": 56.0},
      "10": { },
      "": "empty",
      "a": { },
      "111": [ {"e": "yes","E": "no" } ],
      "A": { }
    }`,
    expected: String.raw`{"":"empty","1":{"\n":56,"f":{"F":5,"f":"hi"}},"10":{},"111":[{"E":"no","e":"yes"}],"A":{},"a":{}}`
  },
  {
    name: 'unicode.json',
    input: String.raw`{
      "Unnormalized Unicode":"A\u030a"
    }`,
    expected: '{"Unnormalized Unicode":"A\u030a"}'
  },
  {
    name: 'values.json',
    input: String.raw`{
      "numbers": [333333333.33333329, 1E30, 4.50, 2e-3, 0.000000000000000000000000001],
      "string": "\u20ac$\u000F\u000aA'\u0042\u0022\u005c\\\"\/",
      "literals": [null, true, false]
    }`,
    expected: String.raw`{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"string":"` +
      '\u20ac' + String.raw`$\u000f\nA'B\"\\\\\"/"}`
  },
  {
    name: 'weird.json',
    input: String.raw`{
      "\u20ac": "Euro Sign",
      "\r": "Carriage Return",
      "\u000a": "Newline",
      "1": "One",
      "\u0080": "Control\u007f",
      "\ud83d\ude02": "Smiley",
      "\u00f6": "Latin Small Letter O With Diaeresis",
      "\ufb33": "Hebrew Letter Dalet With Dagesh",
      "</script>": "Browser Challenge"
    }`,
    expected: String.raw`{"\n":"Newline","\r":"Carriage Return","1":"One","</script>":"Browser Challenge",` +
      '"\u0080":"Control\u007f","\u00f6":"Latin Small Letter O With Diaeresis","\u20ac":"Euro Sign",' +
      '"\ud83d\ude02":"Smiley","\ufb33":"Hebrew Letter Dalet With Dagesh"}'
  },
  {
    name: 'RFC 8785 Section 3.2.3 sorting example',
    input: String.raw`{
      "\u20ac": "Euro Sign",
      "\r": "Carriage Return",
      "\ufb33": "Hebrew Letter Dalet With Dagesh",
      "1": "One",
      "\ud83d\ude00": "Emoji: Grinning Face",
      "\u0080": "Control",
      "\u00f6": "Latin Small Letter O With Diaeresis"
    }`,
    expected: String.raw`{"\r":"Carriage Return","1":"One",` +
      '"\u0080":"Control","\u00f6":"Latin Small Letter O With Diaeresis","\u20ac":"Euro Sign",' +
      '"\ud83d\ude00":"Emoji: Grinning Face","\ufb33":"Hebrew Letter Dalet With Dagesh"}'
  }
];

// RFC 8785 Appendix B: IEEE-754 bit pattern -> canonical number
const NUMBER_VECTORS: Array<[string, string]> = [
  ['0000000000000000', '0'],
  ['8000000000000000', '0'],
  ['0000000000000001', '5e-324'],
  ['8000000000000001', '-5e-324'],
  ['7fefffffffffffff', '1.7976931348623157e+308'],
  ['ffefffffffffffff', '-1.7976931348623157e+308'],
  ['4340000000000000', '9007199254740992'],
  ['c340000000000000', '-9007199254740992'],
  ['4430000000000000', '295147905179352830000'],
  ['44b52d02c7e14af5', '9.999999999999997e+22'],
  ['44b52d02c7e14af6', '1e+23'],
  ['44b52d02c7e14af7', '1.0000000000000001e+23'],
  ['444b1ae4d6e2ef4e', '999999999999999700000'],
  ['444b1ae4d6e2ef4f', '999999999999999900000'],
  ['444b1ae4d6e2ef50', '1e+21'],
  ['3eb0c6f7a0b5ed8c', '9.999999999999997e-7'],
  ['3eb0c6f7a0b5ed8d', '0.000001'],
  ['41b3de4355555553', '333333333.3333332'],
  ['41b3de4355555554', '333333333.33333325'],
  ['41b3de4355555555', '333333333.3333333'],
  ['41b3de4355555556', '333333333.3333334'],
  ['41b3de4355555557', '333333333.33333343'],
  ['becbf647612f3696', '-0.0000033333333333333333'],
  ['43143ff3c1cb0959', '1424953923781206.2']
];

describe('RFC 8785 canonicalization', () => {

  it('JCS-001: official RFC 8785 test vectors produce byte-identical output', () => {
    for (const vector of RFC8785_VECTORS) {
      const actual = jcs(vector.input);
      assert.strictEqual(actual, vector.expected, `Vector ${vector.name}`);
      assert.deepStrictEqual(Buffer.from(actual, 'utf8'), Buffer.from(vector.expected, 'utf8'), `UTF-8 bytes ${vector.name}`);
    }
  });

  it('JCS-002: RFC 8785 Appendix B number serialization samples', () => {
    for (const [hex, expected] of NUMBER_VECTORS) {
      assert.strictEqual(canonicalJson(doubleFromHex(hex)), expected, `IEEE-754 0x${hex}`);
    }
    assert.throws(() => canonicalJson(doubleFromHex('7fffffffffffffff')), /NaN/);
    assert.throws(() => canonicalJson(doubleFromHex('7ff0000000000000')), /Infinity/);
    assert.throws(() => canonicalJson(doubleFromHex('fff0000000000000')), /Infinity/);
  });

  it('JCS-003: integer-index property names are ordered by UTF-16 code units, not numerically', () => {
    const value = parseStrictJson('{"10":"a","9":"b","2":"c","1":"d","b":1,"":0," ":2,"-1":3,"01":4}');
    // JavaScript enumerates integer-like keys numerically: 1, 2, 9, 10, ...
    assert.deepStrictEqual(Object.keys(value as object).slice(0, 4), ['1', '2', '9', '10']);
    assert.strictEqual(
      canonicalJson(value),
      '{"":0," ":2,"-1":3,"01":4,"1":"d","10":"a","2":"c","9":"b","b":1}'
    );
    // Legacy implementation leaked engine ordering into the signed bytes
    assert.notStrictEqual(legacyCanonicalJson(value), canonicalJson(value));

    // Same result independent of insertion order
    const reversed = parseStrictJson('{"01":4,"-1":3," ":2,"":0,"b":1,"1":"d","2":"c","9":"b","10":"a"}');
    assert.strictEqual(canonicalJson(reversed), canonicalJson(value));

    // Nested objects inside arrays
    assert.strictEqual(jcs('[{"100":1,"20":2,"3":3}]'), '[{"100":1,"20":2,"3":3}]');
  });

  it('JCS-004: __proto__ is preserved as an ordinary JSON property', () => {
    const text = '{"b":1,"__proto__":{"polluted":true},"a":2}';
    const value = parseStrictJson(text) as Record<string, unknown>;

    assert.ok(Object.prototype.hasOwnProperty.call(value, '__proto__'), '__proto__ must be an own property');
    assert.strictEqual(Object.getPrototypeOf(value), Object.prototype, 'prototype must not change');
    assert.strictEqual(({} as Record<string, unknown>).polluted, undefined, 'Object.prototype must not be polluted');
    assert.strictEqual(canonicalJson(value), '{"__proto__":{"polluted":true},"a":2,"b":1}');

    // Matches JSON.parse semantics (CreateDataProperty) for __proto__
    assert.strictEqual(canonicalJson(JSON.parse(text)), canonicalJson(value));

    // Nested and primitive-valued __proto__ members
    assert.strictEqual(jcs('{"x":{"__proto__":null}}'), '{"x":{"__proto__":null}}');
    assert.strictEqual(jcs('[{"__proto__":[1,2]}]'), '[{"__proto__":[1,2]}]');

    // Null-prototype objects are valid JSON objects
    const bare = Object.create(null);
    bare.z = 1;
    bare.a = 2;
    assert.strictEqual(canonicalJson(bare), '{"a":2,"z":1}');
  });

  it('JCS-005: values outside the I-JSON data model are rejected', () => {
    assert.throws(() => canonicalJson({ a: NaN }), /NaN not permitted per RFC 8785 at \.a/);
    assert.throws(() => canonicalJson([Infinity]), /Infinity/);
    assert.throws(() => canonicalJson({ s: '\ud800' }), /Lone high surrogate/);
    assert.throws(() => canonicalJson('a\ud800b'), /Lone high surrogate/);
    assert.throws(() => canonicalJson('\udc00'), /Lone low surrogate/);
    assert.throws(() => canonicalJson({ ['\udfff']: 1 }), /Lone low surrogate/);
    assert.throws(() => jcs('{"k":"\\ud83d"}'), /Lone high surrogate/);
    assert.throws(() => canonicalJson({ a: undefined }), /Unsupported type undefined/);
    assert.throws(() => canonicalJson([1, , 3]), /Unsupported type undefined/);
    assert.throws(() => canonicalJson({ f: () => 1 }), /Unsupported type function/);
    assert.throws(() => canonicalJson(BigInt(1)), /Unsupported type bigint/);
    assert.throws(() => canonicalJson(Symbol('x')), /Unsupported type symbol/);
    assert.throws(() => canonicalJson(new Date(0)), /Unsupported non-plain object/);
    assert.throws(() => canonicalJson(new Map()), /Unsupported non-plain object/);

    // Valid surrogate pairs and escapes are kept literal
    assert.strictEqual(canonicalJson('\ud83d\ude00'), '"\ud83d\ude00"');
    assert.strictEqual(canonicalJson('\u0000\u001f\u007f/'), '"\\u0000\\u001f\u007f/"');
    assert.strictEqual(canonicalJson(-0), '0');
  });
});

// ============================================
// Strict JSON input boundary
// ============================================

describe('Strict JSON parser', () => {

  it('JCS-006: duplicate property names are rejected', () => {
    assert.throws(() => parseStrictJson('{"a":1,"a":2}'), /Duplicate property name "a" at position 7/);
    assert.throws(() => parseStrictJson('{"a":1,"\\u0061":2}'), /Duplicate property name "a"/, 'escaped equivalent');
    assert.throws(() => parseStrictJson('{"x":{"b":1,"c":[{"d":1,"d":2}]}}'), /Duplicate property name "d"/, 'nested in array');
    assert.throws(() => parseStrictJson('{"__proto__":1,"__proto__":2}'), /Duplicate property name "__proto__"/);
    assert.throws(() => parseStrictJson('{"o":{},"p":{"q":1},"o":3}'), /Duplicate property name "o"/, 'after nested objects');
    assert.throws(() => parseStrictJson('{"a\\"b":1,"a\\"b":2}'), /Duplicate property name/, 'escaped quotes');
    assert.throws(() => parseStrictJson('{"\\ud83d\\ude00":1,"\ud83d\ude00":2}'), /Duplicate property name/, 'escaped surrogate pair');

    // Same names in different objects are not duplicates
    assert.deepStrictEqual(parseStrictJson('[{"a":1},{"a":2},{"x":{"a":3}}]'), [{ a: 1 }, { a: 2 }, { x: { a: 3 } }]);
    assert.deepStrictEqual(parseStrictJson('{"a":{"a":{"a":1}}}'), { a: { a: { a: 1 } } });
    // Duplicate-looking string values are fine
    assert.deepStrictEqual(parseStrictJson('{"a":"a","b":"a"}'), { a: 'a', b: 'a' });

    assert.deepStrictEqual(detectDuplicateKeys('{"a":1,"a":2}').hasDuplicates, true);
    assert.deepStrictEqual(detectDuplicateKeys('{"a":1,"b":{"a":2}}').hasDuplicates, false);
    assert.match(strictJsonParse('{"k":0,"k":0}').error ?? '', /Duplicate property name "k"/);
  });

  it('JCS-007: malformed JSON is rejected', () => {
    const invalid = [
      '', ' ', '{', '[1,]', '{"a":1,}', '{a:1}', "{'a':1}", '01', '1.', '.5', '+1', '0x10', 'NaN',
      'Infinity', '"\t"', '"\\x"', '"\\u12"', '{"a" 1}', '[1 2]', 'tru', 'nul', '{} {}', '"abc',
      '\ufeff{}', '[1]]', '{"a":1}}'
    ];
    for (const text of invalid) {
      assert.throws(() => parseStrictJson(text), StrictJsonError, `Should reject ${JSON.stringify(text)}`);
      assert.throws(() => JSON.parse(text), SyntaxError, `JSON.parse should also reject ${JSON.stringify(text)}`);
    }
    assert.throws(() => parseStrictJson('['.repeat(1001) + ']'.repeat(1001)), /Maximum nesting depth/);
    assert.deepStrictEqual(parseStrictJson('['.repeat(1000) + ']'.repeat(1000)) !== undefined, true);
  });

  it('JCS-008: valid JSON parses identically to JSON.parse', () => {
    const samples = [
      'null', 'true', 'false', '0', '-0', '1e400', '-1.5E-3', '123456789012345678901234567890', '"\\/\\b\\f\\n\\r\\t\\u00e9"',
      ' \r\n\t{ "a" : [ 1 , { } , [ ] , "" ] } \n', '{"":""}', '[[[[]]]]'
    ];
    for (const text of samples) {
      assert.deepStrictEqual(parseStrictJson(text), JSON.parse(text), `Sample ${JSON.stringify(text)}`);
    }
    assert.ok(Object.is(parseStrictJson('-0'), -0));
    for (const file of listJsonFiles(EXAMPLES)) {
      const text = fs.readFileSync(file, 'utf-8');
      assert.deepStrictEqual(parseStrictJson(text), JSON.parse(text), path.relative(ROOT, file));
    }
  });

  it('JCS-009: bundle verifier rejects duplicate keys at the file boundary (SEC-001)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'digiemu-jcs-'));
    try {
      const valid = fs.readFileSync(path.join(EXAMPLES, 'valid-bundle.json'), 'utf-8');
      // Inject a shadowing duplicate into canonical_snapshot (JSON.parse would keep the last value)
      const tampered = valid.replace('"triage_level": "YELLOW",', '"triage_level": "YELLOW",\n    "triage_level": "GREEN",');
      assert.notStrictEqual(tampered, valid);
      const bundlePath = path.join(dir, 'duplicate.json');
      fs.writeFileSync(bundlePath, tampered);

      const result = new BundleVerifier().verifyBundle(bundlePath);
      assert.strictEqual(result.outcome, 'SECURE_FAIL');
      assert.strictEqual(result.failure_codes[0]?.code, 'SEC-001');
      assert.match(result.failure_codes[0]?.description ?? '', /Duplicate property name "triage_level"/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ============================================
// Backward compatibility and signatures
// ============================================

describe('Backward compatibility', () => {

  it('JCS-010: RFC 8785 output equals legacy output for all example artifacts', () => {
    const files = listJsonFiles(EXAMPLES);
    assert.ok(files.length >= 10, 'Expected example artifacts');
    for (const file of files) {
      const doc = parseStrictJson(fs.readFileSync(file, 'utf-8')) as Record<string, unknown>;
      const rel = path.relative(ROOT, file);
      assert.strictEqual(canonicalJson(doc), legacyCanonicalJson(doc), rel);
      for (const key of ['canonical_snapshot', 'canonicalSnapshot']) {
        if (doc && typeof doc === 'object' && key in doc) {
          assert.strictEqual(canonicalJson(doc[key]), legacyCanonicalJson(doc[key]), `${rel} ${key}`);
        }
      }
    }
  });

  it('JCS-011: existing Ed25519 signatures verify with RFC 8785 canonicalization', () => {
    // Evidence bundle: Ed25519 over SHA-256(canonical snapshot)
    const bundle = parseStrictJson(fs.readFileSync(path.join(EXAMPLES, 'valid-bundle.json'), 'utf-8')) as any;
    const hash = sha256Hex(canonicalJson(bundle.canonical_snapshot));
    assert.strictEqual(hash, bundle.snapshot_hash.value, 'snapshot hash unchanged');
    assert.ok(verify(
      null,
      Buffer.from(hash, 'hex'),
      ed25519KeyFromRaw(bundle.signed_receipt.signature.public_key),
      Buffer.from(bundle.signed_receipt.signature.signature_value, 'hex')
    ), 'valid-bundle.json Ed25519 signature');

    // Secure receipt: Ed25519 over canonical unsigned receipt
    const receipt = parseStrictJson(fs.readFileSync(path.join(EXAMPLES, 'secure-receipt.signed.example.json'), 'utf-8')) as any;
    const { signature, ...unsigned } = receipt;
    const publicKey = createPublicKey(fs.readFileSync(path.join(EXAMPLES, 'test-public-key.pem'), 'utf-8'));
    assert.ok(verify(null, Buffer.from(canonicalJson(unsigned)), publicKey, Buffer.from(signature.value, 'base64')),
      'secure-receipt.signed.example.json Ed25519 signature');

    // Any modification must break the signature
    unsigned.receipt_id = `${unsigned.receipt_id}-x`;
    assert.ok(!verify(null, Buffer.from(canonicalJson(unsigned)), publicKey, Buffer.from(signature.value, 'base64')));
  });

  it('JCS-012: legacy example bundles keep their verification outcomes', () => {
    const verifier = new BundleVerifier();
    const valid = verifier.verifyBundle(path.join(EXAMPLES, 'valid-bundle.json'));
    assert.strictEqual(valid.outcome, 'SECURE_PASS', JSON.stringify(valid.failure_codes));

    const tampered = verifier.verifyBundle(path.join(EXAMPLES, 'tampered-bundle.json'));
    assert.strictEqual(tampered.outcome, 'SECURE_FAIL');
    assert.ok(tampered.failure_codes.some(fc => fc.code === 'SEC-004'));

    const invalid = verifier.verifyBundle(path.join(EXAMPLES, 'invalid-bundle.json'));
    assert.strictEqual(invalid.outcome, 'SECURE_FAIL');
  });
});
