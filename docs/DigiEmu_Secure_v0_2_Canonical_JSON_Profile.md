# DigiEmu Secure v0.2 Canonical JSON Profile

This document defines the canonical JSON serialization profile used for deterministic signing and verification of secure receipts in DigiEmu Secure v0.2.

> **Status (updated 2026-10-29): EXPERIMENTAL / TECHNICAL REVIEW — NOT PRODUCTION READY.**
>
> This profile describes the implementation on branch `fix/rfc8785-canonicalization` (`src/canonical-json.ts`, `src/strict-json-parser.ts`). Earlier versions of this document specified UTF-8 byte-wise key ordering and did not specify input validation; those statements were inaccurate for the current implementation and have been corrected below.

## Purpose

Canonical JSON ensures that the same logical data always produces the same byte-for-byte serialization. This is critical for cryptographic signatures: the signature must verify correctly regardless of when or where the verification occurs.

## Scope and Conformance

The implementation follows the **JSON Canonicalization Scheme (JCS), [RFC 8785](https://datatracker.ietf.org/doc/html/rfc8785)**, for inputs within the I-JSON data model ([RFC 7493](https://datatracker.ietf.org/doc/html/rfc7493)).

Conformance evidence in this repository (`tests/canonical-json.test.ts`):

- RFC 8785 reference test vectors (`arrays`, `french`, `structures`, `unicode`, `values`, `weird`) and the RFC 8785 §3.2.3 sorting example produce byte-identical output (JCS-001).
- RFC 8785 Appendix B number serialization samples (JCS-002).

These vectors are embedded copies. The full RFC 8785 cross-language number corpus has **not** been run, and no cross-language (Go, .NET) conformance runner exists yet.

## Two Distinct Stages: Parsing and Canonicalization

Canonicalization is performed in two separate stages with different responsibilities.

| Stage | Function | Input → Output | Responsibility |
|---|---|---|---|
| Strict parsing | `parseStrictJson(text)` (`src/strict-json-parser.ts`) | JSON text → JavaScript value | RFC 8259 syntax, **duplicate property names**, nesting depth |
| Canonicalization | `canonicalJson(value)` (`src/canonical-json.ts`) | JavaScript value → canonical JSON string | Key ordering, number and string serialization, rejection of values outside the JSON data model |

**Important:** `canonicalJson` operates on already-parsed JavaScript values. It **cannot detect duplicate property names**, because a JavaScript object cannot hold duplicates. If text is parsed with `JSON.parse` (or any lenient parser), duplicates are silently collapsed (last value wins) *before* canonicalization. Duplicate-key rejection is only guaranteed where `parseStrictJson` is used.

`parseStrictJson` is used at these input boundaries: bundle file loading (bundle verifier), CLI `sign` and `bundle create` snapshot input, HTTP API request bodies, issuer registry and trust-anchor files, and the receipt sign/verify example scripts.

## Canonicalization Rules

### 1. Stable UTF-8 Encoding

All strings MUST be encoded as UTF-8 without a Byte Order Mark (BOM).

- No UTF-16 or other encodings
- No leading BOM (`EF BB BF`)
- Unicode characters MUST NOT be escaped unless required by JSON syntax

The canonical string is hashed or signed as its UTF-8 byte encoding. Input text with a leading BOM is rejected by `parseStrictJson`.

### 2. Key Ordering (UTF-16 Code Units)

Object property names MUST be sorted in ascending order by their **UTF-16 code units**, compared as unsigned 16-bit integers (RFC 8785 §3.2.3). Sorting is locale-independent and is applied recursively to nested objects.

```json
// Before canonicalization
{"z": 1, "a": 2, "m": 3}

// After canonicalization
{"a":2,"m":3,"z":1}
```

Notes:

- *Correction (2026-10-29):* Earlier versions of this profile stated that keys are sorted by their UTF-8 byte representation. That was incorrect. UTF-16 and UTF-8 ordering differ when keys contain characters in U+E000–U+FFFF together with characters above U+FFFF (for example, `"\ud83d\ude00"` sorts before `"\ufb33"` under UTF-16 ordering, but after it under UTF-8 byte ordering).
- Integer-like property names are sorted as strings, not numerically: `{"10":1,"9":2,"":3}` canonicalizes to `{"":3,"10":1,"9":2}`. JavaScript's own integer-key enumeration order does not affect the output.
- A property named `__proto__` is treated as an ordinary member and is preserved.

### 3. No Insignificant Whitespace

All optional whitespace MUST be omitted:

- No spaces after `{` or before `}`
- No spaces after `[` or before `]`
- No spaces before or after `:` in object members
- No spaces before or after `,` separators
- No line breaks or indentation

```json
// Before canonicalization
{
  "name": "value",
  "array": [1, 2, 3]
}

// After canonicalization
{"array":[1,2,3],"name":"value"}
```

### 4. Deterministic Arrays

Array elements maintain their order as defined in the source document. Array ordering MUST NOT be altered during canonicalization.

### 5. Number Representation (ECMAScript)

Numbers are IEEE-754 double-precision values serialized with the ECMAScript `Number.prototype.toString` algorithm, as required by RFC 8785 §3.2.2.3:

- Shortest round-trip representation; no trailing zeros; no leading zeros
- Exponent notation uses lowercase `e` with an explicit sign, for magnitudes ≥ 1e21 or < 1e-6
- `-0` is serialized as `0`

| Input | Canonical |
|---|---|
| `4.50` | `4.5` |
| `1.0` | `1` |
| `2e-3` | `0.002` |
| `0.000001` | `0.000001` |
| `1e-7` | `1e-7` |
| `1e21` | `1e+21` |
| `1E30` | `1e+30` |
| `333333333.33333329` | `333333333.3333333` |
| `-0` | `0` |

> **Warning — integer precision:** Integers outside the IEEE-754 safe range (±2^53 − 1, i.e. ±9007199254740991) **may lose precision during parsing, before canonicalization**. For example, `9007199254740993` is parsed and canonicalized as `9007199254740992`. This is **not** reported as an error. Large integers (identifiers, monetary amounts in minor units, nanosecond timestamps) MUST be encoded as strings.

### 6. String Escaping

Strings use minimal escaping per RFC 8785 §3.2.2.2:

| Character | Serialization |
|---|---|
| `"` (U+0022) | `\"` |
| `\` (U+005C) | `\\` |
| U+0008, U+0009, U+000A, U+000C, U+000D | `\b`, `\t`, `\n`, `\f`, `\r` |
| Other U+0000–U+001F | `\u00xx` (lowercase hexadecimal) |
| All other characters, including `/`, U+007F, non-ASCII, U+2028/U+2029 and valid surrogate pairs | Emitted literally (UTF-8) |

Optional escapes (like `\/` or `\uXXXX` for printable Unicode) MUST NOT be used. Escapes present in the *input* (for example `\u00e9` or `\/`) are decoded during parsing and re-serialized according to the table above.

### 7. No Unicode Normalization

No implicit Unicode normalization (NFC, NFD or other) is performed. Canonically equivalent but differently encoded strings (for example `"\u00c5"` and `"A\u030a"`) produce different canonical output and different hashes.

### 8. Rejected Input

| Condition | Stage | Error |
|---|---|---|
| Malformed JSON (RFC 8259 syntax errors, trailing commas, single quotes, leading zeros, unescaped control characters in strings, invalid escapes, trailing data, leading BOM) | `parseStrictJson` | `StrictJsonError` with position |
| Duplicate property names within one object, compared after escape decoding (`"a"` and `"\u0061"` collide) | `parseStrictJson` | `StrictJsonError: Duplicate property name "…" at position N` |
| Nesting deeper than 1000 levels | `parseStrictJson` | `StrictJsonError: Maximum nesting depth exceeded` |
| Lone (unpaired) UTF-16 surrogates in strings or property names | `canonicalJson` | `Error: Lone high/low surrogate not permitted per RFC 8785 at <path>` |
| `NaN`, `Infinity`, `-Infinity` (including numeric literals that overflow, such as `1e400`) | `canonicalJson` | `Error: NaN/Infinity not permitted per RFC 8785 at <path>` |
| Values outside the JSON data model: `undefined`, functions, `BigInt`, symbols, sparse array holes, and non-plain objects (`Date`, `Map`, class instances) | `canonicalJson` | `Error: Unsupported type … / Unsupported non-plain object at <path>` |

Errors are thrown exceptions; no numeric error codes are defined at this layer. Callers map them to verification failure codes (for example SEC-001 for unparseable bundles, SEC-003 for snapshots that cannot be canonicalized).

## Hash and Signature Contracts

DigiEmu Secure currently contains **two signing schemes**. They use the same canonicalization but sign different bytes with different encodings, and they are **not interchangeable**: a signature produced under one scheme will not verify under the other.

### Evidence Bundle v0.4 (bundle verifier, CLI `bundle create`, CLI `sign`)

1. `canonical = canonicalJson(canonical_snapshot)`
2. `snapshot_hash.value = SHA-256(UTF-8(canonical))`, represented as **lowercase hexadecimal without prefix**; `snapshot_hash.algorithm = "SHA-256"`
3. Ed25519 signs the **32-byte raw digest** (not the hex string and not the canonical bytes)
4. `signature_value` is hexadecimal; `public_key` is the raw 32-byte Ed25519 key in base64

Only the snapshot digest is signed. Receipt metadata (`issuer`, `key_id`, `signed_at`, `receipt_id`, `bundle_id`) is **not** covered by the signature. Receipts written by CLI `secure sign` (`version: "0.2"`) follow this scheme.

### Secure Receipt v0.1 (`src/sign-receipt.ts`, `src/verify-receipt.ts`)

1. Remove the `signature` field from the receipt
2. `canonical = canonicalJson(receipt_without_signature)`
3. Ed25519 signs the **UTF-8 canonical receipt bytes** directly (no pre-hash)
4. `signature.value` is base64; the public key is an SPKI PEM file

Digests carried inside receipts use the `sha256:<lowercase hex>` form where applicable (for example `snapshot_hash`; see `sha256Uri` in `src/hash-utils.ts`). The shipped v0.1 example receipt contains a placeholder `snapshot_hash`, not a measured digest.

### Signing and Verification Process (summary)

```
Bundle v0.4:   canonical_snapshot → RFC 8785 → UTF-8 → SHA-256 (32 bytes) → Ed25519
Receipt v0.1:  receipt − signature → RFC 8785 → UTF-8 → Ed25519
```

Verification repeats the same steps and compares or verifies against the stored value. A valid signature proves only that the holder of the corresponding private key signed the data. **It does not establish the signer's identity**; see `SECURITY.md` → *Known Security Limitations* for the current state of issuer trust enforcement.

## Compatibility with DigiEmu Core

DigiEmu Core uses its own canonicalization profile (`digiemu-canonical-json-v1`) and its own hash construction (**HashV1**). As described for DigiEmu Core (baseline `main` at `50eaf04db56d75a91c358990975bb90cc13dc601`), HashV1 hashes a Core-specific **StateV1 envelope** with its own byte-array hashing scope. The Core sources are not part of this repository, and these Core details have not been verified from here.

- **Reported observation:** in a direct cross-implementation test performed for DIGIEMU-AGENT-INT-002, a synthetic Secure bundle produced a matching **document-level** SHA-256 digest in Core and Secure. The test artifacts are not included in this repository, and the result has not been reproduced here.
- **Limitation:** one matching digest for one synthetic document does **not** establish general compatibility between Secure's RFC 8785 profile and Core's `digiemu-canonical-json-v1`. Divergence is possible for property names outside ASCII, numbers (exponent formatting, large integers), string escaping (for example `<`, `>`, `&`, U+2028/U+2029), duplicate keys, and invalid Unicode.
- **Core HashV1 and Secure document hashes MUST NOT be described as equivalent.** HashV1 is computed over the StateV1 envelope; Secure's `snapshot_hash` is computed over the canonical snapshot document alone.
- Establishing interoperability requires a shared set of cross-language golden vectors executed against both implementations.

## Example

```json
// Original document
{
  "receiptId": "rec_12345",
  "timestamp": "2026-01-15T10:30:00Z",
  "agent": {
    "name": "ExampleAgent",
    "version": "1.0.0"
  },
  "artifacts": [
    {"type": "log", "hash": "abc123"},
    {"type": "state", "hash": "def456"}
  ]
}

// Canonical form (what gets signed)
{"agent":{"name":"ExampleAgent","version":"1.0.0"},"artifacts":[{"hash":"abc123","type":"log"},{"hash":"def456","type":"state"}],"receiptId":"rec_12345","timestamp":"2026-01-15T10:30:00Z"}
```

The `hash` values in this example are illustrative placeholders, not measured digests.

## Why This Matters

Without canonical JSON:

- Different JSON libraries may serialize the same data differently
- Whitespace differences break signature verification
- Key ordering differences break signature verification
- Verification becomes non-deterministic and unreliable

With canonical JSON:

- Signatures verify consistently across implementations that follow the same profile
- Receipts remain valid regardless of transport or storage formatting
- Reproducible builds and verifications are possible
- Cross-platform compatibility requires every implementation to follow the same rules; for other languages this must be demonstrated with shared test vectors (not yet available)

## Reference

- [RFC 8785 — JSON Canonicalization Scheme (JCS)](https://datatracker.ietf.org/doc/html/rfc8785)
- [RFC 7493 — The I-JSON Message Format](https://datatracker.ietf.org/doc/html/rfc7493)
- [RFC 8259 — The JavaScript Object Notation (JSON) Data Interchange Format](https://datatracker.ietf.org/doc/html/rfc8259)

*Revision note (2026-10-29):* This profile previously described itself as aligning with RFC 8785 "where applicable" and specified UTF-8 byte-wise key ordering. It now states the implemented RFC 8785 behaviour, input validation and hash contracts.
