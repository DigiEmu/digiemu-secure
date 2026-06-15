# DigiEmu Secure v0.6 Conformance Profile

This document defines conformance levels and requirements for DigiEmu Secure implementations, establishing criteria for certification and interoperability.

## Compliance Terminology

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

| Term | Meaning |
|------|---------|
| **MUST** / **REQUIRED** / **SHALL** | Absolute requirement of the specification |
| **MUST NOT** / **SHALL NOT** | Absolute prohibition |
| **SHOULD** / **RECOMMENDED** | Strongly advised, but valid reasons may exist to ignore |
| **SHOULD NOT** | Strongly advised against, but may be acceptable in certain circumstances |
| **MAY** / **OPTIONAL** | Truly optional; implementations may include or omit |

## Conformance Levels

### Tier 1: Verifier

**Description:** Basic verification capability for evidence bundles.

**Target Use Case:** Organizations that need to verify evidence but do not issue their own signed receipts.

#### Tier 1 Requirements

| ID | Requirement | Level | Specification Reference |
|----|-------------|-------|------------------------|
| T1.1 | Parse bundle JSON structure | MUST | v0.4 Evidence Bundle Format |
| T1.2 | Validate required bundle fields present | MUST | v0.4 Evidence Bundle Format |
| T1.3 | Check bundle version compatibility | MUST | v0.4 Verification Profile Step 2 |
| T1.4 | Compute SHA-256 hash of canonical snapshot | MUST | v0.4 Verification Profile Step 4 |
| T1.5 | Verify Ed25519 signature | MUST | v0.4 Verification Profile Step 8 |
| T1.6 | Generate SECURE_PASS outcome for valid bundles | MUST | v0.4 Verification Profile Step 10 |
| T1.7 | Generate SECURE_FAIL outcome for invalid bundles | MUST | v0.4 Verification Profile Step 10 |
| T1.8 | Support failure codes SEC-001, SEC-002, SEC-004, SEC-005, SEC-011 | MUST | v0.4 Failure Code Registry |
| T1.9 | Support manual public key input (bypassing registry) | MAY | - |
| T1.10 | Support bundled verification report comparison | SHOULD | v0.4 Verification Profile Step 9 |
| T1.11 | Generate verification reports in v0.4 format | SHOULD | v0.4 Verification Report Profile |

#### Tier 1 Outcomes

A Tier 1 implementation MUST produce exactly one of these outcomes:

- **SECURE_PASS** — All mandatory verification checks passed
- **SECURE_FAIL** — At least one mandatory verification check failed

A Tier 1 implementation MAY produce:

- **SECURE_INCOMPLETE** — Verification could not be completed (limited external dependencies)

### Tier 2: Verifier + Registry

**Description:** Verification with issuer registry support for dynamic key resolution.

**Target Use Case:** Organizations that verify evidence from multiple issuers and require automated key management.

#### Tier 2 Requirements

All Tier 1 requirements, plus:

| ID | Requirement | Level | Specification Reference |
|----|-------------|-------|------------------------|
| T2.1 | Implement issuer registry file format | MUST | v0.3 Issuer Registry Profile |
| T2.2 | Resolve issuer by issuer_id | MUST | v0.4 Verification Profile Step 6 |
| T2.3 | Resolve key by issuer_id + key_id | MUST | v0.4 Verification Profile Step 7 |
| T2.4 | Validate key status (active, expired, revoked, suspended) | MUST | v0.3 Key Rotation Profile |
| T2.5 | Support key validity period checking | MUST | v0.3 Key Rotation Profile |
| T2.6 | Support all failure codes SEC-001 to SEC-016 | MUST | v0.4 Failure Code Registry |
| T2.7 | Support historical key lookup for rotated keys | MUST | v0.3 Key Rotation Profile |
| T2.8 | Generate SECURE_INCOMPLETE for registry unavailability | MUST | v0.4 Verification Profile |
| T2.9 | Support registry hot-reload | SHOULD | v0.5 Enterprise Deployment |
| T2.10 | Support trust anchor resolution | SHOULD | v0.3 Trust Anchor Model |
| T2.11 | Support grace period handling | SHOULD | v0.3 Key Rotation Profile |

#### Tier 2 Outcomes

A Tier 2 implementation MUST produce:

- **SECURE_PASS** — Verification successful with registry-resolved keys
- **SECURE_FAIL** — Verification failed (cryptographic or registry error)
- **SECURE_INCOMPLETE** — Registry unavailable or key lookup timed out

### Tier 3: Full Secure Deployment

**Description:** Complete DigiEmu Secure deployment with signing, verification, registry management, and enterprise features.

**Target Use Case:** Organizations that both issue signed evidence and verify external evidence at production scale.

#### Tier 3 Requirements

All Tier 1 and Tier 2 requirements, plus:

| ID | Requirement | Level | Specification Reference |
|----|-------------|-------|------------------------|
| T3.1 | Generate Ed25519 key pairs | MUST | v0.3 Trust Anchor Model |
| T3.2 | Sign evidence bundles | MUST | v0.4 Evidence Bundle Format |
| T3.3 | Create signed receipts with valid Ed25519 signatures | MUST | v0.4 Evidence Bundle Format |
| T3.4 | Generate canonical snapshots from input events | MUST | v0.2 Canonical JSON Profile |
| T3.5 | Compute and embed snapshot hashes | MUST | v0.4 Evidence Bundle Format |
| T3.6 | Register issuers in registry | MUST | v0.3 Issuer Registry Profile |
| T3.7 | Register and manage keys in registry | MUST | v0.3 Issuer Registry Profile |
| T3.8 | Support key rotation workflows | MUST | v0.3 Key Rotation Profile |
| T3.9 | Support key revocation | MUST | v0.3 Key Rotation Profile |
| T3.10 | Generate verification reports | MUST | v0.4 Verification Report Profile |
| T3.11 | Support evidence bundle archival | SHOULD | v0.5 Audit Retention Profile |
| T3.12 | Support tamper-evident audit logging | SHOULD | v0.5 Audit Retention Profile |
| T3.13 | Support retention policy enforcement | SHOULD | v0.5 Audit Retention Profile |
| T3.14 | Support HSM key storage | MAY | v0.5 Enterprise Deployment |
| T3.15 | Support TBN integration | MAY | v0.5 Interop Profile |
| T3.16 | Support batch verification | MAY | v0.5 Enterprise Deployment |
| T3.17 | Support evidence encryption | MAY | v0.5 Enterprise Deployment |

#### Tier 3 Outcomes

A Tier 3 implementation MUST produce all Tier 1 and Tier 2 outcomes, plus:

- Successful bundle creation with valid signatures
- Successful key registration and rotation events
- Successful audit log generation

## Conformance Checklist

### Tier 1 Verification

- [ ] **T1.1** Parses valid bundle JSON without errors
- [ ] **T1.2** Rejects bundles missing required fields (SEC-001)
- [ ] **T1.3** Rejects unsupported bundle versions (SEC-002)
- [ ] **T1.4** Computes SHA-256 hash matching test vectors
- [ ] **T1.5** Verifies valid Ed25519 signatures
- [ ] **T1.6** Detects invalid Ed25519 signatures (SEC-011)
- [ ] **T1.7** Detects hash mismatches (SEC-004)
- [ ] **T1.8** Generates correct failure codes
- [ ] **T1.9** GazaCare demo bundle verifies successfully
- [ ] **T1.10** Produces SECURE_PASS for valid evidence
- [ ] **T1.11** Produces SECURE_FAIL for tampered evidence

### Tier 2 Registry

- [ ] **T2.1** Loads issuer registry from JSON file
- [ ] **T2.2** Resolves known issuers successfully
- [ ] **T2.3** Rejects unknown issuers (SEC-006)
- [ ] **T2.4** Resolves keys by issuer_id + key_id
- [ ] **T2.5** Rejects unknown keys (SEC-007)
- [ ] **T2.6** Detects revoked keys (SEC-008)
- [ ] **T2.7** Detects expired keys (SEC-009)
- [ ] **T2.8** Detects suspended keys (SEC-010)
- [ ] **T2.9** Supports all SEC-001 to SEC-016 codes
- [ ] **T2.10** Verifies evidence with rotated keys
- [ ] **T2.11** Handles registry timeout (SEC-013, SEC-014)

### Tier 3 Full Deployment

- [ ] **T3.1** Generates Ed25519 key pairs deterministically
- [ ] **T3.2** Signs evidence and produces valid receipts
- [ ] **T3.3** Self-verification passes for signed bundles
- [ ] **T3.4** Produces canonical JSON per v0.2 profile
- [ ] **T3.5** Computes correct SHA-256 hashes
- [ ] **T3.6** Registers issuers in registry
- [ ] **T3.7** Registers keys with valid metadata
- [ ] **T3.8** Executes key rotation maintaining verification chain
- [ ] **T3.9** Processes key revocation with timestamp
- [ ] **T3.10** Generates v0.4 format verification reports
- [ ] **T3.11** Archives bundles with integrity tracking (if implemented)
- [ ] **T3.12** Produces tamper-evident audit logs (if implemented)

## Certification Readiness Checklist

### Documentation

- [ ] All implemented features documented
- [ ] API reference complete (if applicable)
- [ ] CLI usage guide complete
- [ ] Integration guide available
- [ ] Security considerations documented

### Testing

- [ ] Unit test coverage > 80% for cryptographic operations
- [ ] Integration tests for all Tier requirements
- [ ] Property-based tests for serialization round-trips
- [ ] Fuzzing tests for input validation
- [ ] Performance benchmarks documented
- [ ] GazaCare demo passes end-to-end

### Security

- [ ] No hardcoded keys or credentials
- [ ] Private key handling uses secure memory
- [ ] Input validation prevents injection attacks
- [ ] Error messages do not leak sensitive information
- [ ] Dependencies audited for vulnerabilities
- [ ] Security review completed (for Tier 3)

### Interoperability

- [ ] Output matches specification format exactly
- [ ] Accepts standard input formats
- [ ] Version negotiation implemented
- [ ] Failure codes match registry definitions
- [ ] Compatible with reference implementation

### Operational Readiness

- [ ] Installation procedure documented
- [ ] Configuration options documented
- [ ] Logging output follows specification
- [ ] Health check endpoint available (for services)
- [ ] Monitoring metrics documented
- [ ] Backup/recovery procedures documented (Tier 3)

## Certification Process

### Self-Certification

Organizations MAY self-certify conformance:

1. Implement all requirements for target tier
2. Pass all conformance checklist items
3. Document any deviations or optional features
4. Publish conformance statement

### Third-Party Certification

Organizations MAY seek third-party certification:

1. Submit implementation to certified testing laboratory
2. Laboratory executes conformance test suite
3. Laboratory issues certification report
4. Certified implementation listed in registry

### Certification Levels

| Level | Requirements | Validity |
|-------|--------------|----------|
| **Tier 1 Certified** | Passes all T1 requirements | 1 year |
| **Tier 2 Certified** | Passes all T1 and T2 requirements | 1 year |
| **Tier 3 Certified** | Passes all T1, T2, and T3 requirements | 1 year |

## Version Compatibility

### Conformance by Version

| Specification Version | Implementation Version | Conformance |
|-----------------------|------------------------|-------------|
| v0.4 | v0.4.x | Tier 1, Tier 2 |
| v0.5 | v0.5.x | Tier 1, Tier 2, partial Tier 3 |
| v1.0 | v1.0.x | Full Tier 1, Tier 2, Tier 3 |

### Backward Compatibility

- Implementations SHOULD support bundles from previous major versions
- Implementations MUST NOT accept bundles from newer unsupported versions
- Conformance certification is version-specific

## Deviation Handling

### Acceptable Deviations

| Deviation Type | Example | Impact on Certification |
|----------------|---------|------------------------|
| Performance optimization | Faster hash implementation | None |
| Extended feature set | Additional algorithms | None, if Tier requirements met |
| Platform adaptation | Mobile-optimized UI | None, if core logic unchanged |

### Unacceptable Deviations

| Deviation Type | Example | Impact on Certification |
|----------------|---------|------------------------|
| Non-compliant serialization | Different canonicalization | Certification denied |
| Missing required check | Skip hash verification | Certification denied |
| Incorrect failure codes | Wrong code for failure | Certification denied |
| Broken interoperability | Cannot verify standard bundles | Certification denied |

## Summary

| Conformance Tier | Target User | Key Capability | Certification |
|----------------|-------------|----------------|---------------|
| **Tier 1** | Evidence consumers | Verify bundles | Tier 1 Certified |
| **Tier 2** | Multi-issuer verifiers | Dynamic key resolution | Tier 2 Certified |
| **Tier 3** | Evidence issuers | Sign and verify | Tier 3 Certified |

DigiEmu Secure conformance ensures interoperability, security, and reliability across the ecosystem. Organizations should select the appropriate tier based on their evidence handling requirements.
