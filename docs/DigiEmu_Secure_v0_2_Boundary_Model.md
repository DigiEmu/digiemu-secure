# DigiEmu Secure v0.2 Boundary Model

This document defines the architectural boundaries between DigiEmu Core, DigiEmu Secure, TBN, and CLARIXO. Understanding these boundaries is essential for proper integration and clear scope expectations.

## Layer Overview

The DigiEmu ecosystem consists of four distinct layers, each with a specific responsibility in the evidence and trust chain:

| Layer | Responsibility | Primary Concern |
|-------|---------------|-----------------|
| **DigiEmu Core** | Deterministic replay and verification | Computational correctness |
| **DigiEmu Secure** | Cryptographic protection of evidence | Integrity and authenticity |
| **TBN** | Agent identity and trust certification | Provenance and trustworthiness |
| **CLARIXO** | Responsibility attribution and continuity | Accountability and legal context |

## Layer Definitions

### DigiEmu Core

DigiEmu Core provides **deterministic decision-state replay and verification**.

- Captures agent decisions in a reproducible format
- Enables replay of computational states
- Verifies that outputs follow deterministically from inputs
- Focuses on the "what happened" of computation

Core ensures that given the same initial conditions and inputs, the same outputs are produced. It does not judge whether those outputs are correct, safe, or trustworthy—only that they are reproducible.

### DigiEmu Secure

DigiEmu Secure provides **cryptographic protection of evidence artifacts**.

- Signs canonical snapshots of evidence
- Verifies signatures and detects tampering
- Ensures evidence integrity over time
- Provides technical authenticity guarantees

Secure operates on the evidence produced by Core (or any other source). It cryptographically binds evidence to a signing entity and ensures that binding remains verifiable indefinitely.

### TBN (Trust Boundary Network)

TBN provides **agent identity, trust certification, and provenance attestation**.

- Establishes cryptographic identities for agents
- Issues and revokes trust certifications
- Attests to the provenance of evidence
- Enables trust decisions based on identity reputation

TBN answers "who produced this evidence and are they trustworthy?" It operates above Secure, using Secure's signatures as inputs to trust evaluations.

### CLARIXO

CLARIXO provides **responsibility attribution and continuity records around evidence**.

- Links evidence to legal and organizational responsibility
- Maintains continuity records for audit trails
- Provides context for accountability decisions
- Bridges technical evidence to governance frameworks

CLARIXO answers "who is responsible for this evidence and what is its organizational context?" It operates at the governance layer, using Secure's integrity guarantees and TBN's trust assessments as foundations.

## Architectural Flow

```
┌─────────────────────────────────────────────────────────────┐
│ CLARIXO                                                     │
│ Responsibility Attribution / Continuity Records            │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ uses
┌─────────────────────────────────────────────────────────────┐
│ TBN                                                         │
│ Agent Identity / Trust Certification / Provenance          │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ verifies
┌─────────────────────────────────────────────────────────────┐
│ DigiEmu Secure                                              │
│ Cryptographic Protection / Integrity / Authenticity        │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ protects
┌─────────────────────────────────────────────────────────────┐
│ DigiEmu Core                                                │
│ Deterministic Replay / State Verification                  │
└─────────────────────────────────────────────────────────────┘
```

Evidence flows upward through the layers. Each layer adds a distinct type of assurance without duplicating the concerns of layers below.

## Non-Claims: What DigiEmu Secure Does Not Do

To maintain clear architectural boundaries, DigiEmu Secure explicitly does NOT:

| Non-Claim | Rationale |
|-----------|-----------|
| **Does not certify agents** | Agent certification is TBN's responsibility. Secure signs evidence; it does not evaluate the signer's trustworthiness. |
| **Does not assign trust scores** | Trust scoring requires reputation and history. Secure provides only cryptographic authenticity. |
| **Does not replace TBN** | TBN operates at the identity and certification layer. Secure provides the foundation TBN builds upon. |
| **Does not attribute legal responsibility** | Responsibility attribution is CLARIXO's domain. Secure provides technical evidence; legal interpretation belongs above. |
| **Does not claim model safety** | Secure protects evidence integrity. Whether the modeled system was safe to operate is outside its scope. |

## Integration Points

### Core → Secure

- Core produces evidence artifacts
- Secure consumes artifacts and produces signed receipts
- Contract: Canonical JSON serialization, Ed25519 signatures

### Secure → TBN

- Secure provides signature verification results
- TBN consumes verification results to inform trust decisions
- Contract: Valid/invalid signature status, signer public key

### Secure → CLARIXO

- Secure provides integrity-verified evidence
- CLARIXO consumes evidence for responsibility mapping
- Contract: Tamper-evident, timestamped, authenticated records

### TBN → CLARIXO

- TBN provides trust assessments
- CLARIXO uses assessments in continuity records
- Contract: Trust scores, certification status, revocation lists

## Why Boundaries Matter

Clear architectural boundaries enable:

- **Independent evolution**: Each layer can improve without destabilizing others
- **Vendor neutrality**: Different implementations can interoperate at defined interfaces
- **Scope clarity**: Users understand exactly what guarantees they are receiving
- **Composable assurance**: Multiple independent guarantees compose into systemic trust

DigiEmu Secure's boundary is intentionally narrow: cryptographic integrity and authenticity of evidence. All other concerns—trust, responsibility, safety, correctness—belong to adjacent layers.
