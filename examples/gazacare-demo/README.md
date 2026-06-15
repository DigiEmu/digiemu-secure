# GazaCare Secure Evidence Demo

**IMPORTANT: This is a demonstration example using synthetic data only.**

This example illustrates the DigiEmu Secure evidence lifecycle through a fictional healthcare triage scenario. All patient data is synthetic and non-personal.

## Scenario

A field triage system processes incoming patient assessments and generates cryptographically protected evidence of each triage decision.

## Evidence Lifecycle Flow

```
┌─────────────────┐
│  Input Event    │  Patient triage assessment with symptoms,
│  (JSON)         │  priority level, and recommended action
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Canonical      │  Deterministically serialized with
│  Snapshot       │  sorted keys, no whitespace, UTF-8
│  (JSON)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Snapshot Hash  │  SHA-256 hash of canonical bytes
│  (hex)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Signed Receipt │  Ed25519 signature over hash
│  (JSON)         │  + metadata + public key reference
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Verification   │  Signature valid + hash matches
│  Report         │  + timestamp + verification status
│  (JSON)         │
└─────────────────┘
```

## File Descriptions

| File | Description |
|------|-------------|
| `input-event.json` | Original triage event with all fields |
| `canonical-snapshot.json` | Deterministically serialized form (what gets signed) |
| `secure-receipt.json` | Complete signed receipt with signature and metadata |
| `verification-report.json` | Verification output showing signature and hash validation |

## Verification Steps

1. **Extract** the canonical snapshot from the receipt (excluding signature fields)
2. **Re-canonicalize** to ensure byte-for-byte match
3. **Hash** the canonical bytes
4. **Verify** the Ed25519 signature against the signer's public key
5. **Compare** computed hash with signed hash payload

## Non-Personal Data Declaration

All data in this example is synthetic:
- Patient IDs are generated (e.g., "PT-2026-0847")
- Names are fictional (e.g., "Ahmed Hassan")
- Locations are anonymized (e.g., "FIELD-STATION-7")
- Timestamps are relative to demonstration date
- No real patient information is included

## Scope Limitation

This demonstration shows only the cryptographic evidence lifecycle. It does NOT:
- Validate medical correctness of triage decisions
- Certify the healthcare provider's credentials
- Assign legal responsibility for outcomes
- Guarantee the safety of the triage algorithm

These concerns are handled by other layers in the DigiEmu architecture (see Boundary Model documentation).

## Usage

To verify this example programmatically:

```bash
npm run verify:example examples/gazacare-demo/secure-receipt.json
```

Or use the verification report directly for audit purposes.
