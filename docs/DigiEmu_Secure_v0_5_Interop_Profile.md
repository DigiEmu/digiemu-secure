# DigiEmu Secure v0.5 Interoperability Profile

This document defines interoperability between DigiEmu Secure and adjacent systems in the DigiEmu ecosystem: Core, TBN, CLARIXO, and AntifragileOS.

## Purpose

Interoperability ensures that:

- Evidence flows correctly between system boundaries
- Each component maintains its architectural responsibilities
- Artifacts are exchanged in standard formats
- Integration points are well-defined and stable

## System Overview

| System | Primary Responsibility | Relationship to Secure |
|--------|------------------------|----------------------|
| **DigiEmu Core** | Deterministic replay and verification | Provides evidence to Secure for signing |
| **DigiEmu Secure** | Cryptographic evidence protection | Signs and verifies evidence integrity |
| **TBN** | Trust certification and identity | Certifies issuers that Secure verifies |
| **CLARIXO** | Legal responsibility attribution | Uses Secure's integrity proofs for accountability |
| **AntifragileOS** | Runtime resilience and adaptation | May generate evidence signed by Secure |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DIGIEMU ECOSYSTEM INTEROPERABILITY                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐                                                        │
│  │ Antifragile │─── Generates runtime events                         │
│  │     OS      │      (evidence source)                                │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   DigiEmu   │───▶│   DigiEmu   │───▶│  Evidence   │                 │
│  │    Core     │    │   Secure    │    │  Storage    │                 │
│  │             │    │             │    │             │                 │
│  │ Deterministic│   │ Cryptographic│   │  (durable   │                 │
│  │   replay    │    │   signing   │    │   archive)  │                 │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘                 │
│                            │                    │                       │
│              ┌─────────────┼─────────────┐      │                       │
│              │             │             │      │                       │
│              ▼             ▼             ▼      │                       │
│       ┌──────────┐   ┌──────────┐   ┌──────────┐│                       │
│       │    TBN   │   │ CLARIXO  │   │ External ││                       │
│       │          │   │          │   │ Verifiers││                       │
│       │ Certifies│   │ Attests  │   │          ││                       │
│       │  trust   │   │ liability│   │ Verifies ││                       │
│       └──────────┘   └──────────┘   └──────────┘│                       │
│                                                 │                       │
│  EXCHANGE POINTS:                               │                       │
│  A: Core → Secure (evidence artifact)           │                       │
│  B: Secure → Storage (signed bundle)              │                       │
│  C: Secure ↔ TBN (issuer trust queries)         │                       │
│  D: Secure → CLARIXO (integrity proof)            │                       │
│  E: Storage → Verifiers (bundle retrieval)        │                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Exchange Points

### A: Core → Secure (Evidence Artifact)

**Direction:** Core produces, Secure consumes

**Content:**
- Canonical snapshot (deterministic JSON)
- Event metadata (timestamp, agent, context)
- No cryptographic material (added by Secure)

**Format:** JSON following v0.2 Canonical JSON Profile

**Ownership:** Core owns the evidence content; Secure owns the signature wrapper

### B: Secure → Storage (Signed Bundle)

**Direction:** Secure produces, Storage consumes

**Content:**
- Complete evidence bundle (v0.4 format)
- Signed receipt with Ed25519 signature
- Verification report (optional)

**Format:** JSON bundle (may be compressed)

**Ownership:** Secure owns the integrity proof; Storage owns durability guarantees

### C: Secure ↔ TBN (Issuer Trust Queries)

**Direction:** Bidirectional queries

**Content:**
- Secure queries: "Is this issuer trusted?"
- TBN responds: Trust score, certification status, reputation

**Format:** TBN protocol (external to Secure)

**Ownership:** TBN owns trust decisions; Secure uses them as input

### D: Secure → CLARIXO (Integrity Proof)

**Direction:** Secure produces, CLARIXO consumes

**Content:**
- Verification report (v0.4 format)
- Signature validation results
- Hash verification confirmation

**Format:** JSON verification report

**Ownership:** Secure owns cryptographic proof; CLARIXO owns legal interpretation

### E: Storage → Verifiers (Bundle Retrieval)

**Direction:** Storage serves, any verifier consumes

**Content:**
- Complete evidence bundle
- All artifacts needed for verification

**Format:** JSON bundle

**Ownership:** Storage owns availability; Verifier owns independent validation

## Ownership Boundaries

| Boundary | Secure Owns | Does Not Own |
|----------|-------------|--------------|
| **Core ↔ Secure** | Signature, receipt format | Evidence content, replay logic |
| **Secure ↔ TBN** | Key resolution queries | Trust scores, certification |
| **Secure ↔ CLARIXO** | Integrity proof, hash | Legal responsibility, liability |
| **Secure ↔ Storage** | Bundle format | Durability, availability SLAs |
| **Secure ↔ Verifiers** | Verification protocol | Verification timing, trust decisions |

## Artifact Exchange Formats

### From Core

```json
{
  "coreArtifact": {
    "version": "core-v1.2",
    "event_type": "DECISION_RECORD",
    "event_id": "EVT-2026-001",
    "timestamp": "2026-01-15T14:32:17Z",
    "canonical_snapshot": {
      "decision": "approved",
      "inputs": ["input-a", "input-b"],
      "outputs": ["output-x"]
    },
    "determinism_proof": {
      "replay_verified": true,
      "checkpoint": "hash-abc123"
    }
  }
}
```

### From Secure

```json
{
  "secureBundle": {
    "version": "secure-v0.4",
    "canonical_snapshot": { ... },
    "snapshot_hash": { ... },
    "signed_receipt": { ... },
    "verification_report": { ... }
  }
}
```

### From TBN

```json
{
  "tbnAttestation": {
    "version": "tbn-v1.0",
    "issuer_id": "org:example:division",
    "trust_score": 0.94,
    "certification_status": "certified",
    "certified_at": "2025-12-01T00:00:00Z",
    "expires_at": "2026-12-01T00:00:00Z"
  }
}
```

### From CLARIXO

```json
{
  "clarixoAttribution": {
    "version": "clarixo-v0.9",
    "bundle_reference": "BNDL-2026-001",
    "attributed_to": "org:example:legal-entity",
    "liability_framework": "framework-v2.1",
    "attested_at": "2026-01-15T16:30:00Z"
  }
}
```

## AntifragileOS Integration

AntifragileOS may interact with Secure in two modes:

### Mode 1: Evidence Generation

AntifragileOS generates runtime events that become evidence:

1. AntifragileOS detects significant event
2. Formats as canonical snapshot
3. Submits to Secure for signing
4. Secure returns signed bundle
5. AntifragileOS stores or forwards bundle

### Mode 2: Verification Request

AntifragileOS requests verification of external evidence:

1. AntifragileOS receives bundle
2. Queries Secure verification service
3. Secure returns verification report
4. AntifragileOS uses outcome for adaptation decisions

**Boundary:** AntifragileOS does not perform cryptographic verification itself; it delegates to Secure.

## Interoperability Requirements

### Version Compatibility

| Secure Version | Core Version | TBN Version | CLARIXO Version |
|----------------|--------------|-------------|-----------------|
| v0.4 | core-v1.0+ | tbn-v0.9+ | clarixo-v0.8+ |
| v1.0 | core-v1.2+ | tbn-v1.0+ | clarixo-v1.0+ |

### Protocol Stability

- Exchange formats are JSON with defined schemas
- Version negotiation is explicit in artifacts
- Backward compatibility maintained for one major version
- Breaking changes require major version bump

### Error Handling

| Scenario | Secure Response | Partner Response |
|----------|-----------------|----------------|
| Invalid artifact from Core | Reject with `SNAPSHOT_MALFORMED` | Core re-formats |
| TBN unavailable | Mark `SECURE_INCOMPLETE`, retry | TBN eventual consistency |
| CLARIXO format mismatch | Log warning, continue | CLARIXO updates parser |

## Summary

DigiEmu Secure interoperates with ecosystem partners through well-defined exchange points:

- **Core** provides evidence; Secure adds integrity
- **TBN** certifies trust; Secure uses for verification context
- **CLARIXO** attributes responsibility; Secure provides cryptographic foundation
- **AntifragileOS** generates and consumes evidence; Secure ensures integrity

Ownership boundaries are respected: Secure owns the signature and verification protocol, not the evidence content, trust decisions, or legal interpretations.
