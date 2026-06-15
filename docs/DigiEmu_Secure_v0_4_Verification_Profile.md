# DigiEmu Secure v0.4 Verification Profile

This document defines the normative verification sequence for DigiEmu Secure evidence bundles, establishing the standard procedure for validating evidence integrity and authenticity.

## Purpose

The verification profile ensures that:

- Evidence bundles are validated consistently across all implementations
- Verification results are reproducible and auditable
- Failures are categorized with precise error codes
- Verifiers operate independently without requiring trust in evidence creators

## Verification Philosophy

**Verifier Independence:** A verifier must be able to validate evidence without trusting the entity that created the bundle. All proofs must be cryptographically self-contained or resolvable through trusted anchors.

**Reproducibility:** Given the same bundle and the same trust anchors, any conformant verifier must produce identical results.

**Transparency:** The verification process must produce detailed records showing exactly what was checked and how it was validated.

## Normative Verification Sequence

The following steps MUST be executed in order. Any failure terminates the sequence with an appropriate error code.

```
┌─────────────────────────────────────────────────────────────┐
│              VERIFICATION SEQUENCE v0.4                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   1. Bundle Structure Validation                            │
│      └─▶ Check required fields present                      │
│          └─▶ FAIL: BUNDLE_INCOMPLETE                        │
│                                                             │
│   2. Bundle Version Validation                            │
│      └─▶ Check version compatibility                        │
│          └─▶ FAIL: VERSION_UNSUPPORTED                      │
│                                                             │
│   3. Canonical Snapshot Validation                        │
│      └─▶ Check JSON well-formedness                         │
│      └─▶ Check canonical form compliance                    │
│          └─▶ FAIL: SNAPSHOT_MALFORMED                       │
│                                                             │
│   4. Snapshot Hash Verification                             │
│      └─▶ Recompute hash of canonical snapshot               │
│      └─▶ Compare with stored hash value                   │
│          └─▶ FAIL: HASH_MISMATCH                            │
│                                                             │
│   5. Receipt Structure Validation                         │
│      └─▶ Check receipt fields present                       │
│      └─▶ Check receipt version compatibility              │
│          └─▶ FAIL: RECEIPT_MALFORMED                        │
│                                                             │
│   6. Issuer Resolution                                      │
│      └─▶ Query issuer registry with issuer_id             │
│          └─▶ FAIL: ISSUER_NOT_FOUND                         │
│                                                             │
│   7. Key Resolution                                         │
│      └─▶ Match key_id in issuer key set                     │
│      └─▶ Check key status (active/expired/revoked)         │
│          └─▶ FAIL: KEY_NOT_FOUND                            │
│          └─▶ FAIL: KEY_REVOKED                              │
│          └─▶ FAIL: KEY_EXPIRED                              │
│                                                             │
│   8. Signature Verification                                 │
│      └─▶ Verify Ed25519 signature against public key        │
│      └─▶ Validate signed timestamp                          │
│          └─▶ FAIL: SIGNATURE_INVALID                        │
│                                                             │
│   9. Verification Report Consistency Check                  │
│      └─▶ If bundled report exists:                          │
│         └─▶ Check report structure                          │
│         └─▶ Compare results with current verification       │
│            └─▶ WARN: REPORT_INCONSISTENT                    │
│                                                             │
│  10. Final Outcome Generation                               │
│      └─▶ Compile all check results                          │
│      └─▶ Generate outcome (SECURE_PASS / SECURE_FAIL /      │
│                           SECURE_INCOMPLETE)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Step Definitions

### Step 1: Bundle Structure Validation

Verify that all required bundle fields are present and non-null.

**Required Fields:**
- `bundle_id`
- `bundle_version`
- `created_at`
- `canonical_snapshot`
- `snapshot_hash`
- `signed_receipt`
- `issuer_reference`

**Pass Criteria:** All required fields present and not null.

**Failure:** `BUNDLE_INCOMPLETE` — One or more required fields missing.

### Step 2: Bundle Version Validation

Verify that the bundle version is supported by this verifier.

**Compatibility Matrix:**

| Verifier Version | Supported Bundle Versions |
|------------------|---------------------------|
| 0.4.x | 0.2, 0.3, 0.4 |
| 0.3.x | 0.2, 0.3 |
| 0.2.x | 0.2 |

**Pass Criteria:** `bundle_version` is in the supported set.

**Failure:** `VERSION_UNSUPPORTED` — Bundle version newer than verifier supports.

### Step 3: Canonical Snapshot Validation

Validate the structure and canonicalization of the snapshot.

**Checks:**
1. `canonical_snapshot` is valid JSON
2. Keys are in lexicographic order
3. No insignificant whitespace (per v0.2 Canonical JSON Profile)
4. UTF-8 encoding without BOM

**Pass Criteria:** All canonicalization rules satisfied.

**Failure:** `SNAPSHOT_MALFORMED` — Snapshot is not properly canonicalized.

### Step 4: Snapshot Hash Verification

Recompute and verify the snapshot hash.

**Process:**
1. Serialize `canonical_snapshot` to canonical JSON bytes
2. Compute SHA-256 hash of the bytes
3. Compare with `snapshot_hash.value`
4. Verify `snapshot_hash.algorithm` is supported (SHA-256)

**Pass Criteria:** Computed hash matches stored hash.

**Failure:** `HASH_MISMATCH` — Snapshot has been modified or corrupted.

### Step 5: Receipt Structure Validation

Validate the signed receipt structure.

**Checks:**
1. `signed_receipt.receipt_id` present
2. `signed_receipt.version` present
3. `signed_receipt.signature` structure valid:
   - `algorithm` = "Ed25519"
   - `issuer` matches `issuer_reference.issuer_id`
   - `key_id` present
   - `public_key` present and valid Base64
   - `signature_value` present and valid hex
   - `signed_at` present and valid ISO 8601

**Pass Criteria:** All receipt fields present and correctly formatted.

**Failure:** `RECEIPT_MALFORMED` — Receipt structure is invalid.

### Step 6: Issuer Resolution

Resolve the issuer to a registry entry.

**Process:**
1. Extract `issuer_id` from `issuer_reference`
2. Query configured issuer registry
3. Verify issuer exists and is not suspended

**Pass Criteria:** Issuer found in registry.

**Failure:** `ISSUER_NOT_FOUND` — Issuer not registered or not recognized.

### Step 7: Key Resolution

Resolve the signing key within the issuer's key set.

**Process:**
1. Extract `key_id` from `signed_receipt.signature`
2. Match `key_id` in issuer's registered keys
3. Verify key status:
   - `active`: Valid for verification
   - `expired`: Check if receipt predates expiration
   - `revoked`: Check if receipt predates revocation
   - `suspended`: Invalid
   - `test`: Invalid in production contexts

**Pass Criteria:** Key found and valid for receipt timestamp.

**Failure:**
- `KEY_NOT_FOUND` — Key not in issuer's key set
- `KEY_REVOKED` — Key revoked and receipt post-dates revocation
- `KEY_EXPIRED` — Key expired and receipt post-dates expiration
- `KEY_SUSPENDED` — Key temporarily suspended

### Step 8: Signature Verification

Perform cryptographic signature verification.

**Process:**
1. Extract signature components:
   - `signature_value` (hex-encoded Ed25519 signature)
   - `public_key` (Base64-encoded Ed25519 public key)
   - `signed_at` (timestamp)
2. Prepare signed payload:
   - Canonical snapshot hash bytes
3. Verify Ed25519 signature using standard library

**Pass Criteria:** Signature cryptographically valid.

**Failure:** `SIGNATURE_INVALID` — Signature does not validate against public key.

### Step 9: Verification Report Consistency Check

If the bundle includes a `verification_report`, validate its consistency.

**Process:**
1. Check report structure is valid
2. If report claims `VALID`:
   - Verify it passed the same checks we just performed
   - Flag discrepancies as warnings
3. If report claims `INVALID`:
   - Our verification should also find failures
   - Flag if we pass but report failed

**Pass Criteria:** Report structure valid (warnings for inconsistencies are acceptable).

**Warning:** `REPORT_INCONSISTENT` — Bundled report differs from current verification results.

*Note: Inconsistencies do not fail verification; they generate warnings for investigation.*

### Step 10: Final Outcome Generation

Compile all verification results into a final outcome.

**Outcome Determination:**

| Condition | Outcome |
|-----------|---------|
| All steps 1-8 passed | `SECURE_PASS` |
| Any step 1-8 failed | `SECURE_FAIL` |
| Issuer/key temporarily unavailable | `SECURE_INCOMPLETE` |
| External dependency failure | `SECURE_INCOMPLETE` |

## Verification Outcomes

### SECURE_PASS

All cryptographic verification succeeded. Evidence is authentic and untampered.

**Characteristics:**
- Signature valid
- Hash matches
- Issuer and key resolved
- No structural errors

**Machine-Readable Example:**

```json
{
  "verificationOutcome": {
    "outcome": "SECURE_PASS",
    "outcome_version": "0.4",
    "verified_at": "2026-01-15T16:20:00Z",
    "verifier": "digiemu-secure-verify-v0.4.2",
    "bundle_reference": "BNDL-2026-0847-001-A7F3-9X2M",
    "checks": [
      { "step": 1, "check": "BUNDLE_STRUCTURE", "status": "PASS" },
      { "step": 2, "check": "BUNDLE_VERSION", "status": "PASS", "detail": "0.4 supported" },
      { "step": 3, "check": "CANONICAL_SNAPSHOT", "status": "PASS" },
      { "step": 4, "check": "SNAPSHOT_HASH", "status": "PASS", "detail": "SHA-256 match confirmed" },
      { "step": 5, "check": "RECEIPT_STRUCTURE", "status": "PASS" },
      { "step": 6, "check": "ISSUER_RESOLUTION", "status": "PASS", "detail": "org:gazacare:field-ops:triage-system resolved" },
      { "step": 7, "check": "KEY_RESOLUTION", "status": "PASS", "detail": "signing-key-2026-q1 active" },
      { "step": 8, "check": "SIGNATURE_VERIFICATION", "status": "PASS", "detail": "Ed25519 signature valid" },
      { "step": 9, "check": "REPORT_CONSISTENCY", "status": "PASS", "detail": "Bundled report matches" }
    ],
    "summary": {
      "total_checks": 9,
      "passed": 9,
      "failed": 0,
      "warnings": 0
    },
    "conclusion": "Evidence cryptographically authentic and integrity verified."
  }
}
```

### SECURE_FAIL

Verification failed. Evidence is either tampered, corrupted, or signed with invalid keys.

**Characteristics:**
- At least one verification step failed
- Signature invalid, or hash mismatch, or key invalid
- Evidence should not be trusted

**Machine-Readable Example:**

```json
{
  "verificationOutcome": {
    "outcome": "SECURE_FAIL",
    "outcome_version": "0.4",
    "verified_at": "2026-01-15T16:25:00Z",
    "verifier": "digiemu-secure-verify-v0.4.2",
    "bundle_reference": "BNDL-2026-0847-001-A7F3-9X2M",
    "checks": [
      { "step": 1, "check": "BUNDLE_STRUCTURE", "status": "PASS" },
      { "step": 2, "check": "BUNDLE_VERSION", "status": "PASS" },
      { "step": 3, "check": "CANONICAL_SNAPSHOT", "status": "PASS" },
      { "step": 4, "check": "SNAPSHOT_HASH", "status": "FAIL", "detail": "Computed hash does not match stored hash" },
      { "step": 5, "check": "RECEIPT_STRUCTURE", "status": "SKIPPED", "reason": "prior_failure" },
      { "step": 6, "check": "ISSUER_RESOLUTION", "status": "SKIPPED", "reason": "prior_failure" },
      { "step": 7, "check": "KEY_RESOLUTION", "status": "SKIPPED", "reason": "prior_failure" },
      { "step": 8, "check": "SIGNATURE_VERIFICATION", "status": "SKIPPED", "reason": "prior_failure" }
    ],
    "failure": {
      "failed_at_step": 4,
      "error_code": "HASH_MISMATCH",
      "description": "Snapshot hash verification failed. Evidence may be tampered or corrupted."
    },
    "summary": {
      "total_checks": 8,
      "passed": 3,
      "failed": 1,
      "skipped": 4,
      "warnings": 0
    },
    "conclusion": "Evidence integrity verification failed. Do not trust."
  }
}
```

### SECURE_INCOMPLETE

Verification could not be completed due to external dependencies or temporary conditions.

**Characteristics:**
- No cryptographic failures detected
- External resource unavailable (registry, network, etc.)
- May be retried later

**Machine-Readable Example:**

```json
{
  "verificationOutcome": {
    "outcome": "SECURE_INCOMPLETE",
    "outcome_version": "0.4",
    "verified_at": "2026-01-15T16:30:00Z",
    "verifier": "digiemu-secure-verify-v0.4.2",
    "bundle_reference": "BNDL-2026-0847-001-A7F3-9X2M",
    "checks": [
      { "step": 1, "check": "BUNDLE_STRUCTURE", "status": "PASS" },
      { "step": 2, "check": "BUNDLE_VERSION", "status": "PASS" },
      { "step": 3, "check": "CANONICAL_SNAPSHOT", "status": "PASS" },
      { "step": 4, "check": "SNAPSHOT_HASH", "status": "PASS" },
      { "step": 5, "check": "RECEIPT_STRUCTURE", "status": "PASS" },
      { "step": 6, "check": "ISSUER_RESOLUTION", "status": "INCOMPLETE", "detail": "Issuer registry unreachable" },
      { "step": 7, "check": "KEY_RESOLUTION", "status": "PENDING", "reason": "issuer_unresolved" },
      { "step": 8, "check": "SIGNATURE_VERIFICATION", "status": "PENDING", "reason": "key_unresolved" }
    ],
    "incomplete_reason": {
      "failed_at_step": 6,
      "error_code": "ISSUER_REGISTRY_UNREACHABLE",
      "description": "Cannot contact issuer registry to resolve org:gazacare:field-ops:triage-system",
      "retry_recommended": true,
      "retry_after_seconds": 300
    },
    "summary": {
      "total_checks": 8,
      "passed": 5,
      "incomplete": 1,
      "pending": 2,
      "warnings": 0
    },
    "conclusion": "Verification incomplete due to external dependency. Retry recommended."
  }
}
```

## Verification Failure Codes

| Code | Step | Severity | Description |
|------|------|----------|-------------|
| `BUNDLE_INCOMPLETE` | 1 | Error | Required bundle field missing |
| `VERSION_UNSUPPORTED` | 2 | Error | Bundle version not supported by verifier |
| `SNAPSHOT_MALFORMED` | 3 | Error | Canonical snapshot invalid or non-canonical |
| `HASH_MISMATCH` | 4 | Error | Computed hash does not match stored hash |
| `RECEIPT_MALFORMED` | 5 | Error | Signed receipt structure invalid |
| `ISSUER_NOT_FOUND` | 6 | Error | Issuer not in registry |
| `KEY_NOT_FOUND` | 7 | Error | Key not found in issuer's key set |
| `KEY_REVOKED` | 7 | Error | Key revoked and receipt post-dates revocation |
| `KEY_EXPIRED` | 7 | Error | Key expired and receipt post-dates expiration |
| `KEY_SUSPENDED` | 7 | Error | Key temporarily suspended |
| `KEY_TEST_IN_PROD` | 7 | Error | Test key used in production verification context |
| `SIGNATURE_INVALID` | 8 | Error | Ed25519 signature verification failed |
| `SIGNATURE_ALGORITHM_UNSUPPORTED` | 8 | Error | Signature algorithm not Ed25519 |
| `ISSUER_REGISTRY_UNREACHABLE` | 6 | Incomplete | Cannot contact issuer registry |
| `KEY_REGISTRY_TIMEOUT` | 7 | Incomplete | Key lookup timed out |
| `REPORT_INCONSISTENT` | 9 | Warning | Bundled report differs from current verification |
| `REPORT_MALFORMED` | 9 | Warning | Bundled verification report structure invalid |

## Verifier Independence

### Principle

A verifier must validate evidence without requiring trust in the bundle creator. The bundle creator could be:
- The original evidence issuer
- An intermediary transport system
- An archival storage service
- A malicious actor attempting to present tampered evidence

### Independence Mechanisms

1. **Cryptographic Self-Containment:**
   - Signature proves authenticity without trusting the transport
   - Hash proves integrity without trusting the storage
   - Public key is resolved independently, not taken from bundle

2. **Canonical Verification:**
   - Verifier recomputes hash independently
   - Verifier validates canonical form independently
   - No reliance on bundled pre-computed values

3. **External Trust Anchors:**
   - Issuer registry is queried, not read from bundle
   - Public keys come from trusted registry, not from bundle
   - Key status is determined by registry, not by bundle claims

### Independence Example

```
Scenario: Bundle received from untrusted intermediary

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Issuer        │────▶│  Untrusted      │────▶│   Verifier      │
│  (trusted)      │     │  Intermediary   │     │  (independent)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
       │                                               │
       │ signs evidence                               │ queries
       ▼                                               ▼
┌─────────────────┐                           ┌─────────────────┐
│  Signed Receipt │                           │  Issuer Registry│
│  with public key│                           │  (trusted)      │
│  reference      │                           └─────────────────┘
└─────────────────┘                                    │
       │                                              │ returns
       │ intermediary forwards                        │ public key
       │ bundle (may tamper?)                          │
       ▼                                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BUNDLE                               │
│  ┌─────────────────┐     ┌─────────────────┐                 │
│  │  (may be        │     │  (may be         │                 │
│  │   tampered)     │     │   tampered)     │                 │
│  │                 │     │                 │                 │
│  │  Snapshot       │     │  Signature      │                 │
│  │  (tampered?)    │     │  (invalid?)     │                 │
│  └─────────────────┘     └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
       │
       │ verifier independently validates:
       │ 1. Recomputes hash from snapshot
       │ 2. Resolves public key from registry
       │ 3. Verifies signature
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  VERIFICATION RESULT:                                       │
│  - If snapshot tampered: HASH_MISMATCH → SECURE_FAIL        │
│  - If signature invalid: SIGNATURE_INVALID → SECURE_FAIL     │
│  - If both valid: SECURE_PASS (intermediary cannot forge)   │
└─────────────────────────────────────────────────────────────┘
```

**Result:** Even if the intermediary tampers with the bundle, the verifier detects it through independent cryptographic validation.

## Conformance

A verifier implementation is conformant with this profile if:

1. Executes all 10 verification steps in order
2. Produces `SECURE_PASS`, `SECURE_FAIL`, or `SECURE_INCOMPLETE` outcomes
3. Uses standard error codes for failures
4. Implements verifier independence (resolves keys externally)
5. Recomputes all hashes rather than trusting bundled values
6. Validates canonical form rather than accepting any serialization

## Summary

| Aspect | Specification |
|--------|---------------|
| **Sequence** | 10 ordered steps, fail-fast |
| **Outcomes** | SECURE_PASS, SECURE_FAIL, SECURE_INCOMPLETE |
| **Independence** | External registry resolution, independent recomputation |
| **Reproducibility** | Same bundle + same trust anchors = same result |
| **Transparency** | Detailed check-by-check reporting |

The verification profile ensures that evidence authenticity can be validated consistently, independently, and transparently across all DigiEmu Secure implementations.
