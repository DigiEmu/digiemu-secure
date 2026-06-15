# DigiEmu Secure v0.3 Trust Anchor Model

This document defines the trust anchor architecture for DigiEmu Secure v0.3, establishing how signature verification relates to identity, keys, and organizational trust.

## What is a Trust Anchor?

A **trust anchor** is the foundational element that enables signature verification in DigiEmu Secure. It binds three components together:

1. **Identity** — who claims to have produced the evidence
2. **Key** — the cryptographic material used to sign
3. **Authority** — the source that vouches for the key-to-identity binding

In DigiEmu Secure, trust anchors are technical constructs. They enable cryptographic verification. They do NOT, by themselves, establish organizational, legal, or reputational trust.

## Trust Anchor Components

### Issuer Identity

The entity that produced and signed the evidence. Represented as a stable identifier string.

- Format: `org:example-org:division:service` or `agent:agent-id:v1.2.3`
- Must be persistent and globally unique within the DigiEmu ecosystem
- Identity claims are made by the issuer; verification of those claims is external to Secure

### Issuer Key

The Ed25519 key pair used for signing.

- **Private key:** Held securely by the issuer; never transmitted or stored in Secure
- **Public key:** Used by verifiers to validate signatures
- **Key identifier (`key_id`):** Short, unique reference to a specific key within an issuer's key set

### Key Identification

| Field | Description | Example |
|-------|-------------|---------|
| `issuer` | Entity identifier | `org:gazacare:field-ops` |
| `key_id` | Short key reference | `signing-key-2026-q1` |
| `public_key` | Base64-encoded Ed25519 public key | `g4OhN...` (32 bytes) |
| `algorithm` | Signature algorithm | `Ed25519` |
| `valid_from` | Key activation timestamp | `2026-01-01T00:00:00Z` |
| `valid_until` | Key expiration timestamp (optional) | `2026-12-31T23:59:59Z` |
| `status` | Key state | `active`, `revoked`, `expired` |

### Verification Authority

The source that resolves `issuer` + `key_id` to a public key.

In DigiEmu Secure v0.3, verification authority can be:

- **Local key store:** Pre-configured public keys for known issuers
- **TBN integration:** Query TBN for key resolution and trust attestation
- **External registry:** Organization-specific key management systems

**Critical distinction:** Secure uses the verification authority to obtain keys for signature validation. Secure does not use it to determine whether the issuer is trustworthy—only whether the signature is valid.

## Secure vs. TBN Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                    VERIFICATION FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Receipt   │───▶│  Secure     │───▶│   Valid?    │     │
│  │   (signed)  │    │  (verifies  │    │  Signature  │     │
│  │             │    │  signature) │    │  + Identity │     │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘     │
│                            │                   │            │
│                            │ Resolves key      │            │
│                            ▼                   │            │
│                     ┌─────────────┐            │            │
│                     │  Key Store  │            │            │
│                     │  or TBN     │            │            │
│                     └─────────────┘            │            │
│                            │                   │            │
│                            │ Provides trust    │            │
│                            │ attestation       │            │
│                            ▼                   │            │
│                     ┌─────────────┐            │            │
│                     │     TBN     │            │            │
│                     │  (optional  │            │            │
│                     │   trust cert)│            │            │
│                     └─────────────┘            │            │
│                                                             │
│  RESULT: Signature is valid + Identity is proven             │
│          (but trustworthiness requires TBN)                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Secure's Responsibility

- Verify that the signature matches the public key
- Verify that the public key belongs to the claimed issuer
- Report verification status (valid/invalid)

### TBN's Responsibility (Optional Integration)

- Certify that an issuer is trustworthy
- Provide reputation scores or trust levels
- Attest to agent identity and provenance
- Maintain revocation lists for compromised keys

**Integration point:** Secure resolves keys. TBN may layer trust certification on top.

## Trust Anchor Record Example

```json
{
  "trustAnchor": {
    "version": "0.3",
    "issuer": "org:gazacare:field-ops:triage-system",
    "keyId": "signing-key-2026-q1",
    "publicKey": {
      "algorithm": "Ed25519",
      "keyBytes": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k="
    },
    "validity": {
      "notBefore": "2026-01-01T00:00:00Z",
      "notAfter": "2026-06-30T23:59:59Z"
    },
    "status": "active",
    "metadata": {
      "purpose": "triage-evidence-signing",
      "environment": "production",
      "rotationPolicy": "semi-annual"
    }
  }
}
```

This record contains all information needed to verify a signature from this issuer using this key.

## Failure Modes

DigiEmu Secure reports specific failure modes when trust anchor resolution or verification fails:

| Failure Mode | Description | Recommended Action |
|--------------|-------------|-------------------|
| **Unknown issuer** | The issuer identifier is not recognized by any configured key store or registry | Check issuer identifier; add to key store if legitimate |
| **Unknown key_id** | The issuer is known, but the specific key_id does not exist in their key set | Verify key_id with issuer; check for key rotation |
| **Revoked key** | The key exists but has been marked as revoked | Reject signature; do not trust evidence; investigate compromise |
| **Expired key** | The key exists but the current time is outside its validity window | Check for clock skew; verify with issuer if key should still be valid |
| **Signature mismatch** | The signature does not validate against the public key | Evidence has been tampered with or was signed with a different key; reject |

### Failure Response Handling

```
Verification Attempt
        │
        ▼
┌───────────────┐
│ Resolve Key   │
│ (issuer +     │
│  key_id)      │
└───────┬───────┘
        │
   ┌────┴────┐
   │         │
   ▼         ▼
┌──────┐  ┌────────┐
│Found │  │Unknown │─▶ FAIL: Unknown issuer/key
│      │  │issuer  │
└──┬───┘  └────────┘
   │
   ▼
┌─────────────┐
│ Check status│
└──────┬──────┘
   ┌───┴───┐
   │       │
   ▼       ▼
┌─────┐  ┌──────┐
│Valid│  │Revoke│─▶ FAIL: Revoked key
│     │  │d     │
└──┬──┘  └──────┘
   │
   ▼
┌─────────────┐
│ Check expiry│
└──────┬──────┘
   ┌───┴───┐
   │       │
   ▼       ▼
┌─────┐  ┌──────┐
│Valid│  │Expire│─▶ FAIL: Expired key
│     │  │d     │
└──┬──┘  └──────┘
   │
   ▼
┌─────────────┐
│ Verify      │
│ signature   │
└──────┬──────┘
   ┌───┴───┐
   │       │
   ▼       ▼
┌─────┐  ┌──────┐
│Valid│  │Mismat│─▶ FAIL: Signature mismatch
│     │  │ch    │
└──┬──┘  └──────┘
   │
   ▼
┌─────────────┐
│ SUCCESS:    │
│ Signature   │
│ valid       │
└─────────────┘
```

## Non-Claims

DigiEmu Secure v0.3 explicitly does NOT provide the following:

### Secure Does Not Certify Agents

Secure verifies that a signature is mathematically valid for a given public key. It does not:
- Verify that an agent is registered with any authority
- Confirm that an agent's software is genuine
- Validate that an agent operates within approved parameters

**TBN provides:** Agent registration, attestation, and certification services.

### Secure Does Not Assign Trust Scores

Secure reports binary verification results (valid/invalid). It does not:
- Score issuers on reputation
- Weight evidence based on issuer history
- Make trust recommendations

**TBN provides:** Reputation systems, trust scoring, and risk assessment.

### Secure Does Not Replace Legal Due Diligence

Secure provides technical evidence of signature validity. It does not:
- Establish legal liability
- Satisfy regulatory compliance requirements
- Replace contractual verification obligations
- Provide dispute resolution

**CLARIXO provides:** Legal frameworks, responsibility attribution, and compliance integration.

## Trust Anchor Lifecycle

```
Key Generation
      │
      ▼
┌─────────────┐
│ Key         │
│ Registration│────▶ TBN may certify
│ (issuer     │        issuer trust
│  publishes  │
│  public key)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Active Use  │────▶ Secure verifies
│ (signing    │        signatures
│  receipts)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Key Rotation│────▶ New key registered;
│ or Revocatio│        old key expires
│             │        or is revoked
└─────────────┘
```

## Summary

| Concern | DigiEmu Secure | TBN | CLARIXO |
|---------|----------------|-----|---------|
| Signature validity | ✅ Verifies | — | — |
| Key-to-identity binding | ✅ Resolves | May certify | — |
| Issuer trustworthiness | ❌ No | ✅ Certifies | May reference |
| Agent identity | ❌ No | ✅ Attests | — |
| Legal responsibility | ❌ No | — | ✅ Assigns |

DigiEmu Secure provides the cryptographic foundation. Trust decisions build upon that foundation.
