# DigiEmu Secure v0.5 Reference Implementation Profile

This document defines the minimal reference implementation requirements for DigiEmu Secure v1.0, establishing what must be implemented for conformance.

## Purpose

The reference implementation profile ensures that:

- Implementations are interoperable across different systems
- Core functionality is consistently available
- Conformance can be validated through standardized tests
- Production deployments meet minimum security requirements

## v1.0 Conformance Requirements

### Tier 1: Mandatory (Must Implement)

Features required for any v1.0-conformant implementation:

| Feature | Specification Reference | Test Requirement |
|---------|---------------------------|-------------------|
| Ed25519 signing | v0.4 Verification Profile | Sign test vectors pass |
| Ed25519 verification | v0.4 Verification Profile | Verify test vectors pass |
| SHA-256 hashing | v0.4 Evidence Bundle | Hash test vectors pass |
| Canonical JSON serialization | v0.2 Canonical JSON Profile | Round-trip serialization |
| Bundle structure validation | v0.4 Evidence Bundle Format | All required fields checked |
| Snapshot hash verification | v0.4 Verification Profile Step 4 | Hash mismatch detection |
| Receipt structure validation | v0.4 Verification Profile Step 5 | Malformed receipt rejection |
| Basic verification flow | v0.4 Verification Profile Steps 1-8 | Complete verification sequence |
| Failure code generation | v0.4 Failure Code Registry | Correct codes for failures |
| CLI sign-receipt command | package.json scripts | Functional command |
| CLI verify-receipt command | package.json scripts | Functional command |

### Tier 2: Standard (Should Implement)

Features expected in production-quality implementations:

| Feature | Specification Reference | Rationale |
|---------|---------------------------|-----------|
| Issuer registry file-based | v0.3 Issuer Registry Profile | Key resolution for verification |
| Trust anchor resolution | v0.3 Trust Anchor Model | External key verification |
| Verification report generation | v0.4 Verification Report Profile | Audit trail creation |
| Key rotation history | v0.3 Key Rotation Profile | Historical verification |
| All SEC-001 to SEC-016 codes | v0.4 Failure Code Registry | Complete error handling |
| Grace period handling | v0.3 Key Rotation Profile | Smooth key transitions |
| Report consistency check | v0.4 Verification Profile Step 9 | Bundled report validation |

### Tier 3: Extended (May Implement)

Optional features for advanced deployments:

| Feature | Specification Reference | Use Case |
|---------|---------------------------|----------|
| TBN integration | v0.5 Interop Profile | External trust certification |
| HSM key storage | v0.5 Enterprise Deployment | High-security environments |
| Batch verification API | v0.5 Enterprise Deployment | High-volume processing |
| Evidence bundle encryption | v0.5 Enterprise Deployment | Confidential evidence |
| Web-based verification explorer | v1.0 Roadmap | User-friendly verification |
| Performance benchmarks | v1.0 Roadmap | Capacity planning |

## Minimal Verifier Implementation

### Required Components

```
Minimal Verifier
├── Parser
│   ├── Bundle structure validation
│   ├── JSON parsing with error handling
│   └── Version compatibility check
├── Canonicalizer
│   ├── Key ordering (lexicographic)
│   ├── Whitespace removal
│   └── UTF-8 normalization
├── Hasher
│   └── SHA-256 computation
├── Signature Verifier
│   ├── Ed25519 verification
│   └── Public key format validation
└── Reporter
    ├── Outcome determination
    ├── Failure code mapping
    └── Report generation
```

### Minimum Verification Flow

```javascript
// Pseudocode for minimal verifier
function verifyBundle(bundle) {
  // Step 1: Structure validation
  if (!validateBundleStructure(bundle)) {
    return { outcome: 'SECURE_FAIL', code: 'SEC-001' };
  }
  
  // Step 2: Version check
  if (!isVersionSupported(bundle.bundle_version)) {
    return { outcome: 'SECURE_FAIL', code: 'SEC-002' };
  }
  
  // Step 3: Canonical validation (optional for minimal)
  // Step 4: Hash verification
  const computedHash = sha256(canonicalize(bundle.canonical_snapshot));
  if (computedHash !== bundle.snapshot_hash.value) {
    return { outcome: 'SECURE_FAIL', code: 'SEC-004' };
  }
  
  // Step 5: Receipt validation
  if (!validateReceiptStructure(bundle.signed_receipt)) {
    return { outcome: 'SECURE_FAIL', code: 'SEC-005' };
  }
  
  // Step 6-7: Issuer and key resolution (Tier 2)
  // Step 8: Signature verification
  const valid = ed25519Verify(
    bundle.signed_receipt.signature.signature_value,
    bundle.snapshot_hash.value,
    publicKey
  );
  
  if (!valid) {
    return { outcome: 'SECURE_FAIL', code: 'SEC-011' };
  }
  
  return { outcome: 'SECURE_PASS' };
}
```

### Test Vectors

Minimal verifier must pass:

| Test | Input | Expected |
|------|-------|----------|
| Valid bundle | GazaCare demo bundle | SECURE_PASS |
| Tampered snapshot | Modified canonical data | SECURE_FAIL (SEC-004) |
| Invalid signature | Wrong signature value | SECURE_FAIL (SEC-011) |
| Missing field | Bundle without receipt | SECURE_FAIL (SEC-001) |
| Unsupported version | Bundle version 99.0 | SECURE_FAIL (SEC-002) |

## Minimal Issuer Registry

### Required Functionality

```javascript
// Minimal issuer registry interface
interface IssuerRegistry {
  // Resolve issuer by ID
  resolveIssuer(issuerId: string): IssuerRecord | null;
  
  // Resolve key by issuer + key_id
  resolveKey(issuerId: string, keyId: string): KeyRecord | null;
  
  // Check key status for timestamp
  isKeyValid(keyRecord: KeyRecord, timestamp: Date): boolean;
}
```

### Minimum Registry Format

```json
{
  "registry": {
    "version": "0.3",
    "issuers": [
      {
        "issuer_id": "org:example:division",
        "issuer_name": "Example Division",
        "keys": [
          {
            "key_id": "signing-key-2026",
            "public_key": "base64...",
            "algorithm": "Ed25519",
            "status": "active",
            "valid_from": "2026-01-01T00:00:00Z",
            "valid_until": "2026-12-31T23:59:59Z"
          }
        ]
      }
    ]
  }
}
```

### Registry Operations

| Operation | Required | Implementation |
|-----------|----------|----------------|
| Load from file | Yes | JSON file parser |
| Issuer lookup | Yes | Map/Dictionary |
| Key lookup | Yes | Nested Map |
| Status check | Yes | Date comparison |
| Save to file | No | Optional persistence |
| Hot reload | No | Optional runtime update |

## Minimal Trust Anchor Resolver

### Required Functionality

```javascript
// Minimal trust anchor resolver
interface TrustAnchorResolver {
  // Resolve trust anchor for issuer
  resolve(issuerId: string, keyId: string): TrustAnchor | null;
}

// Trust anchor structure
interface TrustAnchor {
  issuerId: string;
  keyId: string;
  publicKey: Uint8Array;
  algorithm: string;
  validFrom: Date;
  validUntil: Date | null;
  status: 'active' | 'expired' | 'revoked';
}
```

### Resolution Sources

| Source | Tier | Description |
|--------|------|-------------|
| Local file | Tier 1 (Minimal) | JSON file with issuer keys |
| Environment variable | Tier 1 | Single issuer key for testing |
| In-memory map | Tier 1 | Hardcoded keys for demo |
| External registry | Tier 2 | HTTP API or database |
| TBN query | Tier 3 | Trust certification service |

## Minimal Bundle Verification Flow

### Sequence Diagram

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   CLI   │───▶│  Parser  │───▶│ Verifier │───▶│ Registry │
└─────────┘    └──────────┘    └──────────┘    └──────────┘
     │              │              │              │
     │ load bundle  │              │              │
     │─────────────▶│              │              │
     │              │ parse JSON │              │
     │              │─────────────▶│              │
     │              │              │ validate     │
     │              │              │ structure    │
     │              │              │─────────────▶│
     │              │              │              │
     │              │              │ verify hash  │
     │              │              │ signature    │
     │              │              │◀─────────────│
     │              │              │              │
     │              │              │ generate     │
     │              │              │ report       │
     │              │◀─────────────│              │
     │              │              │              │
     │ output       │              │              │
     │◀─────────────│              │              │
     │              │              │              │
```

### Error Handling

| Error | Handling | Output |
|-------|----------|--------|
| File not found | Exit with error code | Console error message |
| JSON parse error | Exit with error code | Parse error details |
| Invalid bundle | SECURE_FAIL | Failure code and description |
| Registry unreachable | SECURE_INCOMPLETE | Retry suggestion |
| Signature invalid | SECURE_FAIL | Security warning |

## Conformance Test Suite

### Required Tests

```
Test Suite: v1.0 Conformance
├── Tier 1: Mandatory
│   ├── sign-valid-input
│   ├── verify-valid-signature
│   ├── detect-tampered-snapshot
│   ├── reject-missing-field
│   ├── reject-unsupported-version
│   └── cli-command-exists
├── Tier 2: Standard
│   ├── resolve-known-issuer
│   ├── reject-unknown-issuer
│   ├── detect-expired-key
│   ├── detect-revoked-key
│   ├── generate-verification-report
│   └── verify-historical-key
└── Tier 3: Extended (optional)
    ├── batch-verification
    ├── tbn-integration
    └── hsm-signing
```

### GazaCare Demo Test

All implementations must verify the GazaCare demo bundle:

```bash
# Test command
npm run verify:example examples/gazacare-demo/secure-receipt.json

# Expected result
# Exit code: 0
# Output: Verification passed (SECURE_PASS)
```

## Implementation Checklist

### Before v1.0

- [ ] Ed25519 signing implemented and tested
- [ ] Ed25519 verification implemented and tested
- [ ] SHA-256 hashing implemented and tested
- [ ] Canonical JSON serialization implemented
- [ ] Bundle validation (structure, version) implemented
- [ ] Snapshot hash verification implemented
- [ ] Receipt validation implemented
- [ ] Basic verification flow (Steps 1-8) implemented
- [ ] Failure codes SEC-001, SEC-002, SEC-004, SEC-005, SEC-011 generated
- [ ] CLI sign command functional
- [ ] CLI verify command functional
- [ ] GazaCare demo passes verification
- [ ] All Tier 1 tests pass

### Before Production

- [ ] Issuer registry implemented (file-based minimum)
- [ ] Key resolution implemented
- [ ] All SEC-001 to SEC-016 codes implemented
- [ ] Verification report generation implemented
- [ ] Key rotation history tracking implemented
- [ ] All Tier 2 tests pass
- [ ] Performance benchmarks meet targets
- [ ] Security review completed
- [ ] Documentation complete

## Summary

| Tier | Features | Status for v1.0 |
|------|----------|-----------------|
| **Tier 1** | Core signing, verification, CLI | **Required** |
| **Tier 2** | Registry, reports, all error codes | **Required** |
| **Tier 3** | TBN, HSM, batch, encryption | **Optional** |

The minimal reference implementation provides:

- **Verifier:** Parser, canonicalizer, hasher, signature verifier, reporter
- **Registry:** File-based issuer and key resolution
- **Trust anchor:** Local file or environment-based resolution
- **Verification flow:** 8-step sequence with fail-fast error handling
- **CLI:** sign-receipt and verify-receipt commands

Production implementations should implement Tier 2 features for complete v1.0 conformance.
