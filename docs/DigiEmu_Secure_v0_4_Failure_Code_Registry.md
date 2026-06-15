# DigiEmu Secure v0.4 Failure Code Registry

This document defines the normative failure codes for DigiEmu Secure verification outcomes. These codes are machine-readable, stable across versions, and unambiguously identify verification failures.

## Registry Purpose

The failure code registry enables:

- **Machine Parsing:** Automated systems can handle failures programmatically
- **Cross-Implementation Consistency:** All verifiers report the same codes for the same conditions
- **Audit Clarity:** Failure reasons are precisely categorized
- **Integration Stability:** External systems can rely on code stability for handling logic

## Code Format

Failure codes follow the format `SEC-XXX` where:

- `SEC` indicates DigiEmu Secure origin
- `XXX` is a three-digit sequential number (001-999)

Codes are assigned permanently. Once defined, a code's meaning never changes. New failure modes receive new codes.

## Severity Levels

| Severity | Description | Verifier Action |
|----------|-------------|-----------------|
| **CRITICAL** | Security-compromising failure; evidence cannot be trusted | Immediate rejection; investigation required |
| **ERROR** | Verification failure preventing valid outcome | Rejection with detailed logging |
| **WARNING** | Anomaly detected but verification may still succeed | Log and continue; flag for review |
| **INFORMATIONAL** | Non-failure condition requiring attention | Log for audit trail |

## Outcome Mapping

| Outcome | Description | Typical Trigger |
|---------|-------------|---------------|
| **SECURE_FAIL** | Evidence failed cryptographic verification | CRITICAL or ERROR severity failure |
| **SECURE_INCOMPLETE** | Verification could not be completed | External dependency unavailable |

## Failure Code Definitions

### SEC-001: BUNDLE_INCOMPLETE

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-001 |
| **Name** | Bundle Incomplete |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Required field in evidence bundle is missing or null.

**Typical Cause:**
- Bundle creation process failed to include all mandatory fields
- Manual bundle assembly missing required components
- Data loss during transmission or storage

**Recommended Verifier Action:**
Reject bundle immediately. Do not proceed with partial verification. Log missing field names for diagnostics.

---

### SEC-002: VERSION_UNSUPPORTED

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-002 |
| **Name** | Version Unsupported |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Bundle version is newer than the verifier supports.

**Typical Cause:**
- Bundle created with newer Secure version than verifying system
- Verifier not updated to support current bundle format
- Version string malformed or uses future version identifier

**Recommended Verifier Action:**
Reject bundle. Advise system operator to upgrade verifier. Do not attempt backward-incompatible parsing.

---

### SEC-003: SNAPSHOT_MALFORMED

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-003 |
| **Name** | Snapshot Malformed |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Canonical snapshot is not valid JSON or violates canonicalization rules.

**Typical Cause:**
- JSON syntax error in snapshot
- Keys not in lexicographic order
- Whitespace present in canonical form
- Invalid UTF-8 encoding

**Recommended Verifier Action:**
Reject bundle. Canonical form violations indicate potential tampering or improper bundle creation.

---

### SEC-004: HASH_MISMATCH

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-004 |
| **Name** | Hash Mismatch |
| **Severity** | CRITICAL |
| **Outcome** | SECURE_FAIL |

**Description:**
Recomputed hash of canonical snapshot does not match stored hash value.

**Typical Cause:**
- Evidence tampered after signing
- Data corruption during storage or transmission
- Canonicalization implementation difference
- Hash algorithm mismatch

**Recommended Verifier Action:**
**Immediate rejection.** Do not trust evidence. Treat as potential security incident. Preserve evidence for forensic analysis.

---

### SEC-005: RECEIPT_MALFORMED

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-005 |
| **Name** | Receipt Malformed |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Signed receipt structure is invalid or missing required fields.

**Typical Cause:**
- Missing signature fields
- Invalid Base64 encoding on public key
- Invalid hex encoding on signature
- Timestamp format error

**Recommended Verifier Action:**
Reject bundle. Receipt structure errors prevent signature verification. Log specific field violations.

---

### SEC-006: ISSUER_NOT_FOUND

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-006 |
| **Name** | Issuer Not Found |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Issuer identifier in bundle does not exist in configured registry.

**Typical Cause:**
- Issuer not registered
- Typo in issuer identifier
- Registry not synchronized
- Issuer decommissioned

**Recommended Verifier Action:**
Reject bundle. Unknown issuers cannot be verified. If issuer should be trusted, add to registry and retry.

---

### SEC-007: KEY_NOT_FOUND

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-007 |
| **Name** | Key Not Found |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Key identifier in receipt does not exist in issuer's registered key set.

**Typical Cause:**
- Key rotation occurred; old key removed from registry
- Key identifier typo
- Key never registered
- Registry partial update failure

**Recommended Verifier Action:**
Reject bundle. Cannot verify signature without known public key. Check for key rotation history.

---

### SEC-008: KEY_REVOKED

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-008 |
| **Name** | Key Revoked |
| **Severity** | CRITICAL |
| **Outcome** | SECURE_FAIL |

**Description:**
Signing key has been revoked and receipt post-dates revocation timestamp.

**Typical Cause:**
- Key compromise discovered and revoked
- Security incident requiring key invalidation
- Issuer policy violation

**Recommended Verifier Action:**
**Immediate rejection.** Do not trust evidence signed with revoked key. If receipt predates revocation, verify with historical registry state.

---

### SEC-009: KEY_EXPIRED

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-009 |
| **Name** | Key Expired |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Signing key has passed its valid_until timestamp and receipt post-dates expiration.

**Typical Cause:**
- Normal key lifecycle expiration
- Grace period not extended
- Clock skew on verifier system
- Emergency rotation without grace period

**Recommended Verifier Action:**
Reject bundle. Check for clock skew. If evidence is critical and near expiration boundary, investigate with issuer.

---

### SEC-010: KEY_SUSPENDED

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-010 |
| **Name** | Key Suspended |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Signing key is temporarily suspended.

**Typical Cause:**
- Administrative suspension pending investigation
- Routine maintenance
- Policy compliance hold

**Recommended Verifier Action:**
Reject bundle. Suspended keys are explicitly disabled. Check with issuer for reactivation or use alternative key.

---

### SEC-011: SIGNATURE_INVALID

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-011 |
| **Name** | Signature Invalid |
| **Severity** | CRITICAL |
| **Outcome** | SECURE_FAIL |

**Description:**
Ed25519 signature does not validate against the public key.

**Typical Cause:**
- Evidence tampered after signing
- Wrong public key for signature
- Signature corrupted
- Algorithm implementation error

**Recommended Verifier Action:**
**Immediate rejection.** Cryptographic proof of tampering or forgery. Preserve evidence for investigation.

---

### SEC-012: SIGNATURE_ALGORITHM_UNSUPPORTED

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-012 |
| **Name** | Signature Algorithm Unsupported |
| **Severity** | ERROR |
| **Outcome** | SECURE_FAIL |

**Description:**
Signature algorithm is not Ed25519 or not recognized by verifier.

**Typical Cause:**
- Bundle uses newer algorithm not yet supported
- Algorithm identifier error
- Legacy bundle with deprecated algorithm

**Recommended Verifier Action:**
Reject bundle. Only Ed25519 is supported in v0.4. Upgrade verifier if newer algorithms should be supported.

---

### SEC-013: ISSUER_REGISTRY_UNREACHABLE

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-013 |
| **Name** | Issuer Registry Unreachable |
| **Severity** | ERROR |
| **Outcome** | SECURE_INCOMPLETE |

**Description:**
Cannot contact issuer registry to resolve issuer or key information.

**Typical Cause:**
- Network connectivity failure
- Registry service downtime
- DNS resolution failure
- Firewall blocking

**Recommended Verifier Action:**
Retry with exponential backoff. If persistent, mark SECURE_INCOMPLETE. Do not fail verification due to external dependency issues.

---

### SEC-014: KEY_REGISTRY_TIMEOUT

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-014 |
| **Name** | Key Registry Timeout |
| **Severity** | ERROR |
| **Outcome** | SECURE_INCOMPLETE |

**Description:**
Key lookup in registry exceeded timeout threshold.

**Typical Cause:**
- Registry overloaded
- Slow network connection
- Complex key chain resolution
- Database performance issues

**Recommended Verifier Action:**
Retry with increased timeout. If persistent, mark SECURE_INCOMPLETE. Log performance metrics for registry operator.

---

### SEC-015: REPORT_INCONSISTENT

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-015 |
| **Name** | Report Inconsistent |
| **Severity** | WARNING |
| **Outcome** | (Depends on actual verification) |

**Description:**
Bundled verification report differs from current verification results.

**Typical Cause:**
- Bundle modified after initial verification
- Verification engine version differences
- Trust anchor changes between verifications
- Clock skew affecting timestamp validation

**Recommended Verifier Action:**
Continue verification. Log warning. Trust current verification results over bundled report. Flag for audit review.

---

### SEC-016: REPORT_MALFORMED

| Attribute | Value |
|-----------|-------|
| **Code** | SEC-016 |
| **Name** | Report Malformed |
| **Severity** | WARNING |
| **Outcome** | (Depends on actual verification) |

**Description:**
Bundled verification report structure is invalid.

**Typical Cause:**
- Report generation error
- Version mismatch in report format
- Corrupted report data

**Recommended Verifier Action:**
Continue verification. Ignore bundled report. Log warning. Current verification proceeds normally without comparison.

## Summary Table

| Code | Name | Severity | Outcome |
|------|------|----------|---------|
| SEC-001 | Bundle Incomplete | ERROR | SECURE_FAIL |
| SEC-002 | Version Unsupported | ERROR | SECURE_FAIL |
| SEC-003 | Snapshot Malformed | ERROR | SECURE_FAIL |
| SEC-004 | Hash Mismatch | CRITICAL | SECURE_FAIL |
| SEC-005 | Receipt Malformed | ERROR | SECURE_FAIL |
| SEC-006 | Issuer Not Found | ERROR | SECURE_FAIL |
| SEC-007 | Key Not Found | ERROR | SECURE_FAIL |
| SEC-008 | Key Revoked | CRITICAL | SECURE_FAIL |
| SEC-009 | Key Expired | ERROR | SECURE_FAIL |
| SEC-010 | Key Suspended | ERROR | SECURE_FAIL |
| SEC-011 | Signature Invalid | CRITICAL | SECURE_FAIL |
| SEC-012 | Signature Algorithm Unsupported | ERROR | SECURE_FAIL |
| SEC-013 | Issuer Registry Unreachable | ERROR | SECURE_INCOMPLETE |
| SEC-014 | Key Registry Timeout | ERROR | SECURE_INCOMPLETE |
| SEC-015 | Report Inconsistent | WARNING | (contextual) |
| SEC-016 | Report Malformed | WARNING | (contextual) |

## Stability Guarantee

Codes SEC-001 through SEC-016 are **stable and permanent**:

- Codes will not be reassigned to different failure modes
- New failure modes will receive new codes (SEC-017+)
- Codes may be deprecated but never reused
- Future versions may add codes; existing codes remain valid

Implementations may handle codes gracefully:

- Unknown codes: Treat as generic ERROR
- Deprecated codes: Recognize and map to current equivalent
- Future codes: Log and escalate for handling update

## Machine-Readable Usage

Failure codes are designed for programmatic handling:

```json
{
  "verificationOutcome": {
    "outcome": "SECURE_FAIL",
    "failure": {
      "code": "SEC-004",
      "name": "HASH_MISMATCH",
      "severity": "CRITICAL",
      "description": "Computed hash does not match stored hash",
      "step": 4,
      "retry_recommended": false
    }
  }
}
```

Systems integrating with DigiEmu Secure should:

1. Handle known codes with specific logic
2. Treat unknown codes as generic failures
3. Log all codes for audit and debugging
4. Escalate CRITICAL severity codes immediately
5. Implement retry logic for SECURE_INCOMPLETE outcomes
