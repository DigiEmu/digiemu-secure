# DigiEmu Secure v0.2 Threat Matrix

This document maps security threats to the layers responsible for mitigating them within the DigiEmu architecture.

## Threat Coverage Summary

| Threat | Covered | Responsible Layer | Notes |
|--------|---------|-------------------|-------|
| **Snapshot tampering** | Yes | **DigiEmu Secure** | Cryptographic hashing detects any modification to canonical evidence |
| **Receipt tampering** | Yes | **DigiEmu Secure** | Ed25519 signature verification fails if receipt is altered |
| **Signature forgery** | Yes | **DigiEmu Secure** | Ed25519 signatures cryptographically unforgeable without private key |
| **Fake issuer authority** | No | **TBN** | Secure validates signatures, not the trustworthiness of signers |
| **Fake agent identity** | No | **TBN** | Identity certification and trust scoring are TBN's responsibility |
| **Replay drift** | Partial | **DigiEmu Secure + TBN** | Secure timestamps receipts; TBN handles replay attack prevention |
| **Runtime jailbreak** | No | **Outside scope** | Secure protects stored evidence, not the runtime environment |
| **Legal responsibility attribution** | No | **CLARIXO** | Legal and accountability frameworks are handled by CLARIXO |
| **Audit trail rewriting** | Yes | **DigiEmu Secure** | Append-only signed receipts prevent undetected tampering |
| **Key compromise** | Partial | **DigiEmu Secure + TBN** | Secure signs with keys; TBN handles revocation and rotation |

## Detailed Threat Descriptions

### DigiEmu Secure Coverage

#### Snapshot Tampering
**Description:** An attacker modifies the evidence content after it was captured.

**Mitigation:** Secure computes a SHA-256 hash of the canonical snapshot and includes it in the signed receipt. Any modification changes the hash, causing verification to fail.

**Limitation:** Secure detects tampering but does not prevent it at the source. The original capture must be trustworthy.

#### Receipt Tampering
**Description:** An attacker modifies a signed receipt to alter evidence or metadata.

**Mitigation:** The Ed25519 signature covers the entire receipt payload. Any alteration invalidates the signature, which verification detects immediately.

**Limitation:** The verifier must have access to the correct public key for validation.

#### Signature Forgery
**Description:** An attacker creates a valid signature without possessing the private key.

**Mitigation:** Ed25519 signatures provide ~128-bit security against forgery. The discrete logarithm problem makes key recovery computationally infeasible.

**Limitation:** If the private key is exposed, signatures can be forged. This is a key management issue, not a cryptographic weakness.

#### Audit Trail Rewriting
**Description:** An attacker attempts to modify or delete historical evidence records.

**Mitigation:** Each receipt is independently signed with a timestamp. Deletions or modifications are detectable through signature verification failures and timestamp inconsistencies.

**Limitation:** Secure requires that receipts are stored in a manner that preserves their integrity (e.g., write-once storage).

### Partial Coverage

#### Replay Drift
**Description:** An attacker reuses old evidence or timestamps to create false chronologies.

**Secure's Role:** Secure timestamps each receipt at signing time using trusted time sources.

**TBN's Role:** TBN manages nonce sequences and time-window validation to prevent replay attacks.

**Collaboration:** Secure provides evidence of when signing occurred; TBN validates that evidence against policy.

#### Key Compromise
**Description:** A signing key is exposed to unauthorized parties.

**Secure's Role:** Secure uses keys to sign; it does not protect keys from compromise.

**TBN's Role:** TBN handles key lifecycle: generation, rotation, revocation lists, and compromise detection.

**Collaboration:** Secure reports which key signed a receipt; TBN reports whether that key was valid at signing time.

### Outside Secure's Scope

#### Fake Issuer Authority
**DigiEmu Secure does not:**
- Validate that a signer is authorized to issue receipts
- Check certificates or trust chains
- Maintain revocation lists

**TBN responsibility:** TBN certifies which entities are authorized signers and maintains trust registries.

#### Fake Agent Identity
**DigiEmu Secure does not:**
- Verify that an agent identifier corresponds to a real, registered agent
- Score agents based on reputation or behavior
- Detect synthetic or impersonated agents

**TBN responsibility:** TBN manages agent identity, registration, and trustworthiness scoring.

#### Runtime Jailbreak
**DigiEmu Secure does not:**
- Protect the execution environment
- Prevent memory tampering during processing
- Detect or prevent prompt injection or jailbreak attacks
- Enforce sandbox boundaries

**Outside scope:** Runtime security is the responsibility of the host system, container orchestration, and application security layers.

#### Legal Responsibility Attribution
**DigiEmu Secure does not:**
- Assign legal liability for decisions
- Determine accountability for outcomes
- Interface with legal or regulatory frameworks
- Provide dispute resolution mechanisms

**CLARIXO responsibility:** CLARIXO maps technical evidence to legal and organizational responsibility frameworks.

## Threat Model Assumptions

DigiEmu Secure's threat coverage assumes:

1. **Private key secrecy:** Signing keys are managed securely outside Secure's scope
2. **Canonical serialization:** All evidence uses the v0.2 canonical JSON profile
3. **Verifier integrity:** The verification process runs in a trusted environment
4. **Time source trust:** Timestamps rely on the system's time source
5. **Storage durability:** Receipts are stored where they cannot be silently deleted

## Risk Acceptance

The following risks are explicitly accepted as outside DigiEmu Secure's scope:

| Risk | Rationale |
|------|-----------|
| Compromised signing key | Key management is a separate operational concern |
| Malicious but authorized signer | Trust decisions belong to TBN |
| Incorrect original data | Secure protects evidence, not its correctness |
| System-level attacks | Infrastructure security is host responsibility |
| Legal interpretation | Law and policy belong to CLARIXO |

## Integration with Other Layers

```
┌─────────────────────────────────────────────────────────────┐
│ Threats Addressed                                           │
├─────────────────────────────────────────────────────────────┤
│ Audit trail rewriting    ──────▶  DigiEmu Secure           │
│ Snapshot tampering       ──────▶  DigiEmu Secure           │
│ Receipt tampering        ──────▶  DigiEmu Secure           │
│ Signature forgery        ──────▶  DigiEmu Secure           │
│ Replay drift (partial)   ──────▶  DigiEmu Secure + TBN     │
│ Key compromise (partial) ──────▶  DigiEmu Secure + TBN     │
│ Fake issuer authority    ──────▶  TBN                       │
│ Fake agent identity      ──────▶  TBN                       │
│ Runtime jailbreak        ──────▶  Outside scope            │
│ Legal responsibility     ──────▶  CLARIXO                 │
└─────────────────────────────────────────────────────────────┘
```
