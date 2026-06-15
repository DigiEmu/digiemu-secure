# DigiEmu Secure v0.4 Verification Report Profile

This document defines the normative structure of DigiEmu Secure verification reports, establishing the standard format for documenting evidence verification outcomes.

## Purpose

The verification report profile ensures that:

- Verification results are consistently structured across all implementations
- Reports are machine-readable for automated processing
- Reports are human-auditable for compliance and investigation
- Verifier independence is demonstrable through report content
- Archival requirements are met for long-term evidence integrity

## Report Structure

A verification report consists of mandatory metadata, detailed check results, and a final outcome. The report serves as a durable record of the verification process.

## Required Fields

### Top-Level Metadata

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `report_version` | Yes | String | Report format version (e.g., `0.4`) |
| `report_id` | Yes | String | Globally unique identifier for this report |
| `bundle_id` | Yes | String | Reference to the verified bundle |
| `verifier_id` | Yes | String | Identifier of the verifying system |
| `verified_at` | Yes | String (ISO 8601) | Timestamp when verification completed |
| `outcome` | Yes | String | Final verification outcome |
| `outcome_version` | Yes | String | Version of outcome semantics |

### Detailed Results

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `failure_codes` | No | Array | Failure codes from Failure Code Registry |
| `checks` | Yes | Array | Step-by-step verification results |
| `issuer_resolution` | Yes | Object | Issuer lookup results |
| `key_resolution` | Yes | Object | Key lookup and validation results |
| `signature_verification` | Yes | Object | Signature validation results |

### Summary

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `summary` | Yes | Object | Aggregated statistics and conclusion |

## Field Definitions

### Report Version

```json
{
  "report_version": "0.4",
  "outcome_version": "0.4"
}
```

- `report_version`: Format version of this report structure
- `outcome_version`: Version of outcome semantics and failure codes

### Identifiers

```json
{
  "report_id": "VRPT-2026-0847-001-A7F3-9X2M-20260115",
  "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
  "verifier_id": "digiemu-secure-verify-v0.4.2-abc123",
  "verified_at": "2026-01-15T16:20:00Z"
}
```

- `report_id`: Unique identifier including bundle reference and verification timestamp
- `bundle_id`: Exact bundle identifier being verified
- `verifier_id`: System identifier with version and instance
- `verified_at`: ISO 8601 timestamp in UTC

### Outcome Values

| Outcome | Description | Use Case |
|---------|-------------|----------|
| **SECURE_PASS** | All cryptographic verification succeeded | Evidence is authentic and untampered |
| **SECURE_FAIL** | Cryptographic verification failed | Evidence is tampered, forged, or corrupted |
| **SECURE_INCOMPLETE** | Verification could not be completed | External dependency unavailable; retry possible |

### Failure Codes

Array of failure codes from the Failure Code Registry:

```json
{
  "failure_codes": [
    {
      "code": "SEC-004",
      "name": "HASH_MISMATCH",
      "severity": "CRITICAL",
      "step": 4,
      "description": "Computed hash does not match stored hash"
    }
  ]
}
```

### Checks Array

Step-by-step verification results:

```json
{
  "checks": [
    {
      "step": 1,
      "check": "BUNDLE_STRUCTURE",
      "status": "PASS",
      "duration_ms": 2,
      "detail": "All required fields present"
    },
    {
      "step": 2,
      "check": "BUNDLE_VERSION",
      "status": "PASS",
      "duration_ms": 1,
      "detail": "Version 0.4 supported"
    },
    {
      "step": 4,
      "check": "SNAPSHOT_HASH",
      "status": "FAIL",
      "duration_ms": 5,
      "detail": "SHA-256 mismatch: computed a3f5c8... != stored b7e2d1..."
    }
  ]
}
```

**Status Values:**
- `PASS`: Check completed successfully
- `FAIL`: Check failed
- `SKIP`: Check skipped due to prior failure
- `PENDING`: Check could not be executed (incomplete outcome)

### Issuer Resolution

```json
{
  "issuer_resolution": {
    "issuer_id": "org:gazacare:field-ops:triage-system",
    "resolved": true,
    "registry_queried": "gazacare-production",
    "resolution_timestamp": "2026-01-15T16:20:01Z",
    "issuer_name": "GazaCare Field Operations Triage System",
    "issuer_status": "active"
  }
}
```

### Key Resolution

```json
{
  "key_resolution": {
    "key_id": "signing-key-2026-q1",
    "resolved": true,
    "public_key": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=",
    "algorithm": "Ed25519",
    "key_status": "active",
    "valid_from": "2026-01-01T00:00:00Z",
    "valid_until": "2026-06-30T23:59:59Z",
    "receipt_timestamp": "2026-01-15T14:32:18Z",
    "timestamp_valid": true
  }
}
```

### Signature Verification

```json
{
  "signature_verification": {
    "algorithm": "Ed25519",
    "verified": true,
    "public_key_fingerprint": "SHA256:a1b2c3d4...",
    "signature_valid": true,
    "signed_payload_hash": "a3f5c8e9d2b1476f8019a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    "verification_timestamp": "2026-01-15T16:20:02Z"
  }
}
```

### Summary

```json
{
  "summary": {
    "total_checks": 10,
    "passed": 9,
    "failed": 1,
    "skipped": 0,
    "pending": 0,
    "warnings": 0,
    "duration_ms": 45,
    "conclusion": "Evidence integrity verification failed due to hash mismatch. Do not trust."
  }
}
```

## Complete Report Examples

### SECURE_PASS Example

```json
{
  "report_version": "0.4",
  "report_id": "VRPT-2026-0847-001-A7F3-9X2M-20260115",
  "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
  "verifier_id": "digiemu-secure-verify-v0.4.2-abc123",
  "verified_at": "2026-01-15T16:20:00Z",
  "outcome": "SECURE_PASS",
  "outcome_version": "0.4",
  
  "checks": [
    {
      "step": 1,
      "check": "BUNDLE_STRUCTURE",
      "status": "PASS",
      "duration_ms": 2
    },
    {
      "step": 2,
      "check": "BUNDLE_VERSION",
      "status": "PASS",
      "duration_ms": 1,
      "detail": "Version 0.4 supported"
    },
    {
      "step": 3,
      "check": "CANONICAL_SNAPSHOT",
      "status": "PASS",
      "duration_ms": 3
    },
    {
      "step": 4,
      "check": "SNAPSHOT_HASH",
      "status": "PASS",
      "duration_ms": 5,
      "detail": "SHA-256 match confirmed"
    },
    {
      "step": 5,
      "check": "RECEIPT_STRUCTURE",
      "status": "PASS",
      "duration_ms": 2
    },
    {
      "step": 6,
      "check": "ISSUER_RESOLUTION",
      "status": "PASS",
      "duration_ms": 15,
      "detail": "org:gazacare:field-ops:triage-system resolved from gazacare-production"
    },
    {
      "step": 7,
      "check": "KEY_RESOLUTION",
      "status": "PASS",
      "duration_ms": 8,
      "detail": "signing-key-2026-q1 active and valid for receipt timestamp"
    },
    {
      "step": 8,
      "check": "SIGNATURE_VERIFICATION",
      "status": "PASS",
      "duration_ms": 12,
      "detail": "Ed25519 signature cryptographically valid"
    },
    {
      "step": 9,
      "check": "REPORT_CONSISTENCY",
      "status": "PASS",
      "duration_ms": 3,
      "detail": "Bundled report matches current verification"
    },
    {
      "step": 10,
      "check": "OUTCOME_GENERATION",
      "status": "PASS",
      "duration_ms": 1
    }
  ],
  
  "issuer_resolution": {
    "issuer_id": "org:gazacare:field-ops:triage-system",
    "resolved": true,
    "registry_queried": "gazacare-production",
    "resolution_timestamp": "2026-01-15T16:20:01Z",
    "issuer_name": "GazaCare Field Operations Triage System",
    "issuer_status": "active"
  },
  
  "key_resolution": {
    "key_id": "signing-key-2026-q1",
    "resolved": true,
    "public_key": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=",
    "algorithm": "Ed25519",
    "key_status": "active",
    "valid_from": "2026-01-01T00:00:00Z",
    "valid_until": "2026-06-30T23:59:59Z",
    "receipt_timestamp": "2026-01-15T14:32:18Z",
    "timestamp_valid": true
  },
  
  "signature_verification": {
    "algorithm": "Ed25519",
    "verified": true,
    "public_key_fingerprint": "SHA256:a1b2c3d4e5f6...",
    "signature_valid": true,
    "signed_payload_hash": "a3f5c8e9d2b1476f8019a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
    "verification_timestamp": "2026-01-15T16:20:02Z"
  },
  
  "summary": {
    "total_checks": 10,
    "passed": 10,
    "failed": 0,
    "skipped": 0,
    "pending": 0,
    "warnings": 0,
    "duration_ms": 52,
    "conclusion": "Evidence cryptographically authentic and integrity verified. Suitable for trust decisions."
  }
}
```

### SECURE_FAIL Example

```json
{
  "report_version": "0.4",
  "report_id": "VRPT-2026-0847-001-A7F3-9X2M-20260115",
  "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
  "verifier_id": "digiemu-secure-verify-v0.4.2-abc123",
  "verified_at": "2026-01-15T16:25:00Z",
  "outcome": "SECURE_FAIL",
  "outcome_version": "0.4",
  
  "failure_codes": [
    {
      "code": "SEC-004",
      "name": "HASH_MISMATCH",
      "severity": "CRITICAL",
      "step": 4,
      "description": "Computed hash does not match stored hash"
    }
  ],
  
  "checks": [
    {
      "step": 1,
      "check": "BUNDLE_STRUCTURE",
      "status": "PASS",
      "duration_ms": 2
    },
    {
      "step": 2,
      "check": "BUNDLE_VERSION",
      "status": "PASS",
      "duration_ms": 1
    },
    {
      "step": 3,
      "check": "CANONICAL_SNAPSHOT",
      "status": "PASS",
      "duration_ms": 3
    },
    {
      "step": 4,
      "check": "SNAPSHOT_HASH",
      "status": "FAIL",
      "duration_ms": 5,
      "detail": "SHA-256 mismatch: computed a3f5c8e9... != stored b7e2d1f4..."
    },
    {
      "step": 5,
      "check": "RECEIPT_STRUCTURE",
      "status": "SKIP",
      "reason": "prior_failure"
    },
    {
      "step": 6,
      "check": "ISSUER_RESOLUTION",
      "status": "SKIP",
      "reason": "prior_failure"
    },
    {
      "step": 7,
      "check": "KEY_RESOLUTION",
      "status": "SKIP",
      "reason": "prior_failure"
    },
    {
      "step": 8,
      "check": "SIGNATURE_VERIFICATION",
      "status": "SKIP",
      "reason": "prior_failure"
    },
    {
      "step": 9,
      "check": "REPORT_CONSISTENCY",
      "status": "SKIP",
      "reason": "prior_failure"
    },
    {
      "step": 10,
      "check": "OUTCOME_GENERATION",
      "status": "PASS",
      "duration_ms": 1
    }
  ],
  
  "issuer_resolution": {
    "resolved": false,
    "reason": "skipped_due_to_failure"
  },
  
  "key_resolution": {
    "resolved": false,
    "reason": "skipped_due_to_failure"
  },
  
  "signature_verification": {
    "verified": false,
    "reason": "skipped_due_to_failure"
  },
  
  "summary": {
    "total_checks": 10,
    "passed": 3,
    "failed": 1,
    "skipped": 6,
    "pending": 0,
    "warnings": 0,
    "duration_ms": 18,
    "conclusion": "Evidence integrity verification failed due to hash mismatch. Evidence may be tampered or corrupted. Do not trust."
  }
}
```

### SECURE_INCOMPLETE Example

```json
{
  "report_version": "0.4",
  "report_id": "VRPT-2026-0847-001-A7F3-9X2M-20260115",
  "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
  "verifier_id": "digiemu-secure-verify-v0.4.2-abc123",
  "verified_at": "2026-01-15T16:30:00Z",
  "outcome": "SECURE_INCOMPLETE",
  "outcome_version": "0.4",
  
  "failure_codes": [
    {
      "code": "SEC-013",
      "name": "ISSUER_REGISTRY_UNREACHABLE",
      "severity": "ERROR",
      "step": 6,
      "description": "Cannot contact issuer registry to resolve issuer or key information",
      "retry_recommended": true,
      "retry_after_seconds": 300
    }
  ],
  
  "checks": [
    {
      "step": 1,
      "check": "BUNDLE_STRUCTURE",
      "status": "PASS",
      "duration_ms": 2
    },
    {
      "step": 2,
      "check": "BUNDLE_VERSION",
      "status": "PASS",
      "duration_ms": 1
    },
    {
      "step": 3,
      "check": "CANONICAL_SNAPSHOT",
      "status": "PASS",
      "duration_ms": 3
    },
    {
      "step": 4,
      "check": "SNAPSHOT_HASH",
      "status": "PASS",
      "duration_ms": 5
    },
    {
      "step": 5,
      "check": "RECEIPT_STRUCTURE",
      "status": "PASS",
      "duration_ms": 2
    },
    {
      "step": 6,
      "check": "ISSUER_RESOLUTION",
      "status": "PENDING",
      "duration_ms": 30000,
      "detail": "Connection timeout to gazacare-production registry"
    },
    {
      "step": 7,
      "check": "KEY_RESOLUTION",
      "status": "PENDING",
      "reason": "issuer_unresolved"
    },
    {
      "step": 8,
      "check": "SIGNATURE_VERIFICATION",
      "status": "PENDING",
      "reason": "key_unresolved"
    },
    {
      "step": 9,
      "check": "REPORT_CONSISTENCY",
      "status": "PENDING",
      "reason": "verification_incomplete"
    },
    {
      "step": 10,
      "check": "OUTCOME_GENERATION",
      "status": "PASS",
      "duration_ms": 1
    }
  ],
  
  "issuer_resolution": {
    "resolved": false,
    "reason": "registry_unreachable",
    "registry_queried": "gazacare-production",
    "resolution_attempted": "2026-01-15T16:30:05Z"
  },
  
  "key_resolution": {
    "resolved": false,
    "reason": "pending_issuer_resolution"
  },
  
  "signature_verification": {
    "verified": false,
    "reason": "pending_key_resolution"
  },
  
  "summary": {
    "total_checks": 10,
    "passed": 5,
    "failed": 0,
    "skipped": 0,
    "pending": 4,
    "warnings": 0,
    "duration_ms": 30021,
    "conclusion": "Verification incomplete due to external dependency (issuer registry unreachable). Retry recommended after 300 seconds."
  }
}
```

## Relationship to Other Profiles

### Verification Profile

The Verification Report Profile documents the **output format** of the verification process defined in the Verification Profile. For each step in the Verification Profile, the report contains a corresponding check entry.

| Verification Profile Step | Report Check Entry |
|---------------------------|-------------------|
| 1. Bundle Structure Validation | `checks[0].check: "BUNDLE_STRUCTURE"` |
| 2. Bundle Version Validation | `checks[1].check: "BUNDLE_VERSION"` |
| 3. Canonical Snapshot Validation | `checks[2].check: "CANONICAL_SNAPSHOT"` |
| 4. Snapshot Hash Verification | `checks[3].check: "SNAPSHOT_HASH"` |
| 5. Receipt Structure Validation | `checks[4].check: "RECEIPT_STRUCTURE"` |
| 6. Issuer Resolution | `checks[5].check: "ISSUER_RESOLUTION"` + `issuer_resolution` |
| 7. Key Resolution | `checks[6].check: "KEY_RESOLUTION"` + `key_resolution` |
| 8. Signature Verification | `checks[7].check: "SIGNATURE_VERIFICATION"` + `signature_verification` |
| 9. Report Consistency Check | `checks[8].check: "REPORT_CONSISTENCY"` |
| 10. Outcome Generation | `checks[9].check: "OUTCOME_GENERATION"` + `outcome` |

### Failure Code Registry

The Failure Code Registry defines the codes used in `failure_codes` array:

- `SEC-001` through `SEC-016` are valid report codes
- Code `name`, `severity`, and `description` come from registry
- Reports may include additional context in the code entry

## Verifier Independence

The verification report demonstrates verifier independence through:

1. **External Resolution Records:** `issuer_resolution` and `key_resolution` show queries to external registries, not trust in bundled values

2. **Recomputation Evidence:** `signature_verification.signed_payload_hash` shows the verifier independently computed the hash

3. **Timestamp Integrity:** `verified_at` proves when verification occurred, independent of bundle creation time

4. **Verifier Identification:** `verifier_id` identifies the verifying system for accountability

## Archival Expectations

Verification reports are designed for long-term archival:

### Storage Requirements

| Property | Requirement |
|----------|-------------|
| **Format** | UTF-8 JSON, no BOM |
| **Immutability** | Reports must be stored write-once |
| **Linkage** | Report must reference exact bundle_id |
| **Retention** | Match or exceed evidence retention policy |
| **Indexing** | Index by report_id and bundle_id |

### Audit Trail Integration

Verification reports serve as audit trail evidence:

- **When:** `verified_at` timestamp
- **What:** `bundle_id` of verified evidence
- **Who:** `verifier_id` of verifying system
- **Result:** `outcome` and `summary.conclusion`
- **How:** `checks` array with step-by-step details

### Re-verification Capability

Archived reports enable:

- **Historical verification replay:** Reconstruct what was checked
- **Dispute resolution:** Prove verification was performed correctly
- **Compliance demonstration:** Show evidence was validated
- **Forensic analysis:** Identify when and how failures occurred

## Conformance

A verification report is conformant with this profile if:

1. All required fields are present and correctly typed
2. `report_version` is `0.4` or compatible
3. `outcome` is one of: `SECURE_PASS`, `SECURE_FAIL`, `SECURE_INCOMPLETE`
4. `failure_codes` use codes from the Failure Code Registry
5. `checks` array contains entries for all 10 verification steps
6. Timestamps are ISO 8601 format in UTC
7. Identifiers follow DigiEmu Secure naming conventions

## Summary

| Aspect | Specification |
|--------|---------------|
| **Format** | JSON, UTF-8 |
| **Required Fields** | 10 top-level, 4 detailed sections |
| **Outcomes** | SECURE_PASS, SECURE_FAIL, SECURE_INCOMPLETE |
| **Failure Codes** | SEC-001 through SEC-016 from Registry |
| **Archival** | Immutable, auditable, indexed |
| **Independence** | Demonstrable through resolution records |

The verification report profile ensures that evidence verification is transparent, reproducible, and suitable for audit and compliance requirements.
