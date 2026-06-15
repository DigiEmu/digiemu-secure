# DigiEmu Secure v0.1 Signed Receipt Profile

## Purpose

A DigiEmu Secure Receipt is a signed evidence artifact that binds a DigiEmu Core verification result to a declared issuer, snapshot hash, and cryptographic signature.

## Required Fields

```json
{
  "receipt_version": "DigiEmu-Secure-Receipt-v0.1",
  "receipt_id": "secure-rcpt-001",
  "core_profile": "DigiEmu-Core-2.0",
  "snapshot_id": "digiemu-snapshot-001",
  "snapshot_hash": "sha256:...",
  "verification_result": "PASS",
  "issued_at": "2026-06-15T00:00:00Z",
  "issuer": {
    "name": "DigiEmu",
    "key_id": "digiemu-secure-test-key-001"
  },
  "signature": {
    "algorithm": "Ed25519",
    "value": "base64-signature"
  }
}
```

## Signature Payload

The signature MUST cover all fields except the `signature` object itself.

The canonical signing payload is a deterministic JSON serialization of the receipt without `signature`.

## Verification Result

Allowed values:

- `PASS`
- `FAIL`
- `INDETERMINATE`

## Non-Claims

A signed receipt proves that a declared issuer signed a specific evidence payload. It does not, by itself, prove that the underlying AI system was safe, compliant, certified, or legally sufficient.
