# DigiEmu Secure v0.2 Canonical JSON Profile

This document defines the canonical JSON serialization profile used for deterministic signing and verification of secure receipts in DigiEmu Secure v0.2.

## Purpose

Canonical JSON ensures that the same logical data always produces the same byte-for-byte serialization. This is critical for cryptographic signatures: the signature must verify correctly regardless of when or where the verification occurs.

## Canonicalization Rules

### 1. Stable UTF-8 Encoding

All strings MUST be encoded as UTF-8 without a Byte Order Mark (BOM).

- No UTF-16 or other encodings
- No leading BOM (`EF BB BF`)
- Unicode characters MUST NOT be escaped unless required by JSON syntax

### 2. Lexicographic Key Ordering

Object keys MUST be sorted lexicographically (byte-wise) in ascending order.

```json
// Before canonicalization
{"z": 1, "a": 2, "m": 3}

// After canonicalization
{"a": 2, "m": 3, "z": 1}
```

Sorting is performed on the UTF-8 byte representation of keys.

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

### 5. Number Representation

Numbers MUST be represented according to JSON specification:

- No leading zeros (except `0` or `0.xxxx`)
- Scientific notation uses lowercase `e`
- No trailing decimal points
- `-0` is normalized to `0`

### 6. String Escaping

Strings MUST escape only the characters required by JSON:

- `"` (quotation mark)
- `\` (backslash)
- Control characters (`\u0000` through `\u001F`)

Optional escapes (like `\/` or `\uXXXX` for printable Unicode) MUST NOT be used.

## Signature Field Exclusion

The signature field MUST be excluded from the data that is signed. The canonicalization process operates on the receipt data **before** the signature is added.

```
Signing Process:
1. Take the receipt data (without signature field)
2. Apply canonical JSON rules
3. Hash the resulting bytes
4. Sign the hash
5. Attach signature to receipt

Verification Process:
1. Extract signature from receipt
2. Take the receipt data (without signature field)
3. Apply canonical JSON rules
4. Hash the resulting bytes
5. Verify signature against hash
```

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

## Why This Matters

Without canonical JSON:

- Different JSON libraries may serialize the same data differently
- Whitespace differences break signature verification
- Key ordering differences break signature verification
- Verification becomes non-deterministic and unreliable

With canonical JSON:

- Signatures verify consistently across all platforms
- Receipts remain valid regardless of transport or storage
- Reproducible builds and verifications are possible
- Cross-platform compatibility is guaranteed

## Reference

This profile aligns with the "Canonical JSON" specification principles and the IETF JSON Canonicalization Scheme (JCS) [RFC 8785](https://datatracker.ietf.org/doc/html/rfc8785) where applicable.
