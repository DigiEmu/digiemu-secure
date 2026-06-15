# DigiEmu Secure v0.4 Evidence Bundle Format

This document defines the transport container format for DigiEmu Secure evidence, enabling portable, auditable, and verifiable evidence packages across systems and organizational boundaries.

## Purpose

The evidence bundle is a **transport and archive container** that aggregates related evidence artifacts into a single, verifiable unit. It enables:

- **Portability:** Evidence can move between systems without losing integrity
- **Completeness:** All necessary artifacts for verification are included
- **Auditability:** Bundles serve as durable records for compliance and investigation
- **Layer coexistence:** Artifacts from Core, Secure, TBN, and CLARIXO coexist without boundary violations

## What is an Evidence Bundle?

An evidence bundle is a structured JSON document that contains:

1. The **canonical snapshot** (the evidence itself)
2. The **snapshot hash** (cryptographic fingerprint)
3. The **signed receipt** (authenticity and integrity proof)
4. The **verification report** (verification results and status)
5. **Issuer reference** (who signed the evidence)
6. **Metadata** (context, timestamps, relationships)

Bundles are **self-contained** for verification purposes but may reference external registries for trust decisions.

## Bundle Structure

### Required Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `bundle_id` | Yes | String | Globally unique identifier for this bundle |
| `bundle_version` | Yes | String | Bundle format version (e.g., `0.4`) |
| `created_at` | Yes | String (ISO 8601) | Timestamp when bundle was created |
| `canonical_snapshot` | Yes | Object | The canonicalized evidence content |
| `snapshot_hash` | Yes | Object | Hash algorithm and value of canonical snapshot |
| `signed_receipt` | Yes | Object | Complete signed receipt with signature |
| `issuer_reference` | Yes | Object | Reference to the signing issuer |

### Optional Fields

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `verification_report` | No | Object | Pre-computed verification results |
| `metadata` | No | Object | Additional context and relationships |
| `artifacts` | No | Array | Additional related artifacts from other layers |
| `provenance_chain` | No | Array | Ordered list of evidence ancestors |

## Field Definitions

### Bundle Identifier

```json
{
  "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
  "bundle_version": "0.4",
  "created_at": "2026-01-15T14:35:42Z"
}
```

- `bundle_id`: Unique identifier using issuer namespace + sequence + random component
- `bundle_version`: Format version for parser compatibility
- `created_at`: ISO 8601 timestamp in UTC

### Snapshot Hash

```json
{
  "snapshot_hash": {
    "algorithm": "SHA-256",
    "value": "a3f5c8e9d2b1476f8019a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    "canonicalization": "digiemu-secure-v0.2"
  }
}
```

### Signed Receipt

```json
{
  "signed_receipt": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "version": "0.2",
    "created_at": "2026-01-15T14:32:18Z",
    "canonical_snapshot_hash": "a3f5c8e9d2b1476f8019a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    "signature": {
      "algorithm": "Ed25519",
      "issuer": "org:gazacare:field-ops:triage-system",
      "key_id": "signing-key-2026-q1",
      "public_key": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=",
      "signature_value": "3f2a8b4c6d7e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
      "signed_at": "2026-01-15T14:32:18Z"
    }
  }
}
```

### Issuer Reference

```json
{
  "issuer_reference": {
    "issuer_id": "org:gazacare:field-ops:triage-system",
    "issuer_name": "GazaCare Field Operations Triage System",
    "key_id": "signing-key-2026-q1",
    "trust_anchor": "registry:gazacare:production:v0.3"
  }
}
```

### Verification Report (Optional)

```json
{
  "verification_report": {
    "report_id": "VRPT-2026-0847-001-A7F3",
    "generated_at": "2026-01-15T14:35:42Z",
    "verification_status": "VALID",
    "verification_engine": "digiemu-secure-v0.3",
    "checks": [
      {
        "check": "SIGNATURE_VERIFICATION",
        "status": "PASS",
        "detail": "Ed25519 signature cryptographically valid"
      },
      {
        "check": "SNAPSHOT_HASH",
        "status": "PASS",
        "detail": "SHA-256 matches signed hash"
      }
    ],
    "summary": {
      "total_checks": 7,
      "passed": 7,
      "conclusion": "Receipt authentic and untampered"
    }
  }
}
```

### Metadata

```json
{
  "metadata": {
    "purpose": "triage_evidence_archive",
    "retention_policy": "7_years_healthcare",
    "classification": "synthetic_demonstration",
    "related_bundles": [
      "BNDL-2026-0847-000-PREV",
      "BNDL-2026-0847-002-NEXT"
    ],
    "audit_context": {
      "audit_id": "AUD-2026-Q1-0847",
      "auditor_reference": "compliance-review-march-2026"
    }
  }
}
```

## Complete Bundle Example

```json
{
  "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
  "bundle_version": "0.4",
  "created_at": "2026-01-15T14:35:42Z",
  
  "canonical_snapshot": {
    "eventType": "TRIAGE_ASSESSMENT",
    "eventId": "TRG-2026-0847-001",
    "timestamp": "2026-01-15T14:32:17Z",
    "patient": {
      "patientId": "PT-2026-0847",
      "chopScore": 3
    },
    "triageDecision": {
      "priorityLevel": "URGENT",
      "recommendedAction": "IMMEDIATE_EVALUATION"
    }
  },
  
  "snapshot_hash": {
    "algorithm": "SHA-256",
    "value": "a3f5c8e9d2b1476f8019a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    "canonicalization": "digiemu-secure-v0.2"
  },
  
  "signed_receipt": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "version": "0.2",
    "created_at": "2026-01-15T14:32:18Z",
    "canonical_snapshot_hash": "a3f5c8e9d2b1476f8019a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    "signature": {
      "algorithm": "Ed25519",
      "issuer": "org:gazacare:field-ops:triage-system",
      "key_id": "signing-key-2026-q1",
      "public_key": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=",
      "signature_value": "3f2a8b4c6d7e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8",
      "signed_at": "2026-01-15T14:32:18Z"
    }
  },
  
  "issuer_reference": {
    "issuer_id": "org:gazacare:field-ops:triage-system",
    "issuer_name": "GazaCare Field Operations Triage System",
    "key_id": "signing-key-2026-q1",
    "trust_anchor": "registry:gazacare:production:v0.3"
  },
  
  "verification_report": {
    "report_id": "VRPT-2026-0847-001-A7F3",
    "generated_at": "2026-01-15T14:35:42Z",
    "verification_status": "VALID",
    "verification_engine": "digiemu-secure-v0.3",
    "checks": [
      {
        "check": "SIGNATURE_VERIFICATION",
        "status": "PASS"
      },
      {
        "check": "SNAPSHOT_HASH",
        "status": "PASS"
      }
    ],
    "summary": {
      "total_checks": 7,
      "passed": 7,
      "conclusion": "Receipt authentic and untampered"
    }
  },
  
  "metadata": {
    "purpose": "triage_evidence_archive",
    "retention_policy": "7_years_healthcare",
    "classification": "synthetic_demonstration",
    "related_bundles": [
      "BNDL-2026-0847-000-PREV"
    ]
  }
}
```

## Bundle Versioning

| Bundle Version | Secure Version | Features | Compatibility |
|----------------|----------------|----------|---------------|
| `0.4` | 0.4.x | Full artifact support, layered artifacts, provenance chains | Current |
| `0.3` | 0.3.x | Basic bundle, single artifact per layer | Backward compatible |
| `0.2` | 0.2.x | Receipt-only bundles | Legacy support |

**Version Rules:**
- Parsers must reject bundles with higher major version than supported
- Parsers should warn on minor version mismatches
- Bundles must include version in `bundle_version` field

## Portability Across Systems

Evidence bundles are designed for cross-system transport:

### Transport Characteristics

| Property | Behavior |
|----------|----------|
| **Encoding** | UTF-8 JSON, no BOM |
| **Size limits** | No hard limit; practical limit based on snapshot size |
| **Compression** | May be gzip-compressed for transport (file extension `.json.gz`) |
| **Integrity** | Bundle contents are self-verifying via signed receipt |
| **Dependencies** | External trust anchor references only; no runtime dependencies |

### Cross-System Verification

When a bundle moves to a new system:

1. **Parse** the bundle JSON
2. **Extract** the canonical snapshot
3. **Re-compute** the snapshot hash
4. **Verify** the signature using issuer reference
5. **Compare** computed results with bundled verification report (if present)

The receiving system does not need to trust the sending system—the cryptographic proofs are self-contained.

## Use Cases

### Archive Storage

Bundles serve as long-term evidence archives:

```
Archive Requirements:
- Bundle includes all verification artifacts
- Verification report captured at time of receipt
- Metadata includes retention policy
- Hash of bundle itself may be recorded in ledger
```

**Advantage:** Future verification requires only the bundle; no external dependencies.

### Audit Transmission

Bundles are transmitted to auditors:

```
Audit Package:
- Bundle contains evidence and proof of integrity
- Auditor independently verifies without trusting submitter
- Verification report shows what was checked
- Metadata provides audit context
```

**Advantage:** Auditor receives complete, verifiable evidence package.

### Cross-Organizational Exchange

Bundles move between organizations:

```
Exchange Flow:
Org A creates evidence → signs → bundles → transmits →
Org B receives → verifies using own trust anchors →
Accepts/rejects based on verification + organizational trust policy
```

**Advantage:** Technical verification is organization-agnostic; trust decisions are local.

## Layer Coexistence Without Boundary Violation

Bundles may contain artifacts from multiple DigiEmu layers while preserving architectural boundaries:

```
┌─────────────────────────────────────────────────────────────┐
│                  EVIDENCE BUNDLE CONTENTS                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DigiEmu Core Artifacts (Optional)                   │   │
│  │  - Deterministic replay logs                           │   │
│  │  - State transition records                          │   │
│  │  - Decision provenance                                 │   │
│  │  OWNERSHIP: Core defines format and meaning           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DigiEmu Secure Artifacts (Required)                 │   │
│  │  - Canonical snapshot                                  │   │
│  │  - Snapshot hash                                       │   │
│  │  - Signed receipt                                      │   │
│  │  - Verification report                                 │   │
│  │  OWNERSHIP: Secure defines format and verification    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TBN Artifacts (Optional)                            │   │
│  │  - Trust certification                                 │   │
│  │  - Agent attestation                                   │   │
│  │  - Reputation score at time of signing                 │   │
│  │  OWNERSHIP: TBN defines format and certification      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CLARIXO Artifacts (Optional)                        │   │
│  │  - Responsibility attribution record                   │   │
│  │  - Legal context reference                             │   │
│  │  - Continuity proof                                    │   │
│  │  OWNERSHIP: CLARIXO defines format and legal meaning   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  BOUNDARY PRESERVATION:                                     │
│  - Each layer's artifacts are in their own namespace      │
│  - Secure verifies Secure artifacts only                   │
│  - Other artifacts are opaque to Secure verification      │
│  - Cross-layer references are by identifier only          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Coexistence Rules

1. **Namespace Separation:** Each layer's artifacts are in distinct JSON paths
2. **Verification Scope:** Secure verifies Secure artifacts; ignores others
3. **Trust Independence:** TBN certifications in bundle are advisory; verifier uses own TBN
4. **Legal Independence:** CLARIXO records provide context; do not override Secure's integrity proof

### Example: Multi-Layer Bundle

```json
{
  "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
  "bundle_version": "0.4",
  
  "artifacts": {
    "core": {
      "replay_log": { "format": "digiemu-core-v1.2", ... },
      "state_snapshot": { "checkpoint": "hash-abc123", ... }
    },
    "secure": {
      "canonical_snapshot": { ... },
      "signed_receipt": { ... },
      "verification_report": { ... }
    },
    "tbn": {
      "trust_certification": {
        "certifier": "org:trusted-network:certification",
        "trust_score": 0.94,
        "certified_at": "2026-01-15T14:33:00Z"
      }
    },
    "clarixo": {
      "responsibility_attribution": {
        "attributed_to": "org:gazacare:medical-director",
        "legal_context": "healthcare-triage-liability-v2.1"
      }
    }
  }
}
```

**Note:** The `artifacts` section is optional. Simple bundles use top-level fields only.

## Failure Modes

Bundles may fail validation for the following reasons:

### Missing Artifact

**Scenario:** Required field (e.g., `signed_receipt`) is absent or null.

**Result:** ❌ `BUNDLE_INCOMPLETE`

**Resolution:**
- Check bundle completeness before transmission
- Re-create bundle with all required fields
- For archived bundles, may need to re-verify and regenerate

### Hash Mismatch

**Scenario:** Computed hash of `canonical_snapshot` does not match `snapshot_hash.value`.

**Result:** ❌ `HASH_MISMATCH`

**Resolution:**
- Indicates bundle corruption or tampering
- Do not trust evidence
- Source bundle from alternate copy or re-create from original source

### Unsupported Bundle Version

**Scenario:** `bundle_version` is higher than parser supports (e.g., `0.5` parser receives `0.6` bundle).

**Result:** ⚠️ `VERSION_UNSUPPORTED`

**Resolution:**
- Upgrade parser to support newer bundle version
- Request bundle in backward-compatible format
- Reject bundle if upgrade not possible

### Incomplete Verification Chain

**Scenario:** Bundle includes verification report with status other than `VALID`, or verification report is missing critical checks.

**Result:** ⚠️ `VERIFICATION_INCOMPLETE`

**Resolution:**
- Re-run verification using available artifacts
- Check for missing trust anchors or registry entries
- Validate that all steps in verification chain can be executed

### Signature Verification Failure

**Scenario:** Signature in `signed_receipt` does not validate against public key.

**Result:** ❌ `SIGNATURE_INVALID`

**Resolution:**
- Do not trust evidence
- Check for bundle tampering
- Verify correct public key from trusted issuer registry
- Evidence may be corrupted or fraudulently modified

## Best Practices

### Creating Bundles

1. **Always include verification report:** Helps recipients quickly assess bundle validity
2. **Use consistent timestamps:** All timestamps should be in UTC
3. **Reference related bundles:** Link to predecessor/successor bundles for audit chains
4. **Include metadata:** Purpose and retention policy help receivers handle appropriately

### Verifying Bundles

1. **Verify independently:** Do not trust bundled verification report; re-verify
2. **Check bundle version:** Ensure parser compatibility
3. **Validate all required fields:** Reject incomplete bundles
4. **Use local trust anchors:** Resolve issuers using your own registry/TBN
5. **Document verification:** Record verification results and timestamp

### Storing Bundles

1. **Immutable storage:** Store bundles write-once to prevent tampering
2. **Index by bundle_id:** Enable quick retrieval
3. **Store hash separately:** Record bundle hash in separate ledger for tamper detection
4. **Retention compliance:** Follow metadata retention_policy for lifecycle management

## Summary

| Feature | Specification |
|---------|---------------|
| **Format** | JSON, UTF-8, no BOM |
| **Self-contained** | Yes (includes all verification artifacts) |
| **Portable** | Yes (cross-system, cross-organization) |
| **Layered** | Yes (supports Core, Secure, TBN, CLARIXO artifacts) |
| **Versioned** | Yes (explicit bundle_version field) |
| **Auditable** | Yes (includes verification report and metadata) |

The evidence bundle format enables secure, portable, and verifiable evidence transport while preserving the architectural boundaries between DigiEmu layers.
