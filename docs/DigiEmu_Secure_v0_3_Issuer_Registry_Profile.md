# DigiEmu Secure v0.3 Issuer Registry Profile

This document defines the issuer registry profile for DigiEmu Secure v0.3, specifying how issuers and their public keys are registered and resolved for signature verification.

## Purpose

The issuer registry provides a structured mechanism for:

- Registering trusted issuers and their cryptographic keys
- Resolving `issuer_id` + `key_id` combinations to public keys
- Tracking key lifecycle states (active, revoked, expired, etc.)
- Enabling deterministic signature verification

The registry is a **resolution layer**, not a **trust layer**. It maps identifiers to keys. Trust decisions are handled separately (see TBN integration).

## Registry Entry Structure

Each issuer registry entry contains the following fields:

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `issuer_id` | Yes | String | Unique identifier for the issuing entity |
| `issuer_name` | Yes | String | Human-readable name of the issuer |
| `key_id` | Yes | String | Identifier for this specific key within the issuer's key set |
| `public_key` | Yes | String | Base64-encoded public key bytes |
| `algorithm` | Yes | String | Signature algorithm (e.g., `Ed25519`) |
| `status` | Yes | String | Current state of the key (see below) |
| `valid_from` | Yes | String (ISO 8601) | Timestamp when key becomes valid |
| `valid_until` | No | String (ISO 8601) | Timestamp when key expires (if applicable) |
| `revocation_status` | No | Object | Revocation details if key is revoked |
| `metadata` | No | Object | Additional issuer-specific information |

## Allowed Status Values

| Status | Description | Verifiable? |
|--------|-------------|-------------|
| `active` | Key is currently valid and may be used for signing | Yes |
| `revoked` | Key has been explicitly revoked and must not be trusted | No |
| `expired` | Key has passed its `valid_until` timestamp | No |
| `suspended` | Key is temporarily inactive but may be reactivated | No |
| `test` | Key is for testing purposes only; not for production use | No (in production contexts) |

**Verification Rules:**
- Only `active` keys pass verification
- `revoked` keys fail verification regardless of validity period
- `expired` keys fail verification if current time > `valid_until`
- `suspended` keys fail verification until explicitly reactivated
- `test` keys should not be used in production verification contexts

## Revocation Status Structure

When `status` is `revoked`, the `revocation_status` field must be populated:

```json
{
  "revoked_at": "2026-06-15T10:30:00Z",
  "reason": "key_compromise",
  "revoked_by": "org:example-org:security-team",
  "replacement_key_id": "signing-key-2026-q2"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `revoked_at` | Yes | ISO 8601 timestamp of revocation |
| `reason` | Yes | Category: `key_compromise`, `routine_rotation`, `issuer_decommission`, `security_incident` |
| `revoked_by` | Yes | Identifier of the entity that authorized revocation |
| `replacement_key_id` | No | `key_id` of the new key that replaces this one |

## JSON Example Registry Entry

```json
{
  "registryEntry": {
    "version": "0.3",
    "issuer": {
      "issuer_id": "org:gazacare:field-ops:triage-system",
      "issuer_name": "GazaCare Field Operations Triage System",
      "contact": "security@gazacare.example.org"
    },
    "key": {
      "key_id": "signing-key-2026-q1",
      "public_key": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=",
      "algorithm": "Ed25519",
      "key_format": "raw",
      "fingerprint": "SHA256:a1b2c3d4e5f6..."
    },
    "lifecycle": {
      "status": "active",
      "valid_from": "2026-01-01T00:00:00Z",
      "valid_until": "2026-06-30T23:59:59Z",
      "revocation_status": null
    },
    "metadata": {
      "environment": "production",
      "purpose": "triage-evidence-signing",
      "rotation_policy": "semi-annual",
      "created_by": "org:gazacare:security-team",
      "created_at": "2025-12-15T09:00:00Z"
    }
  }
}
```

## Resolution Process

When `verify-receipt` receives a receipt, it extracts `issuer` and `key_id` from the signature block and performs the following resolution:

```
┌─────────────────────────────────────────────────────────────┐
│                   RESOLUTION FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Input: issuer_id + key_id from receipt                     │
│                      │                                      │
│                      ▼                                      │
│           ┌─────────────────┐                               │
│           │  Query Registry  │                               │
│           │  for issuer_id   │                               │
│           └────────┬────────┘                               │
│                    │                                        │
│              ┌─────┴─────┐                                  │
│              │           │                                  │
│              ▼           ▼                                  │
│        ┌────────┐   ┌─────────┐                             │
│        │ Found  │   │ Not     │─▶ FAIL: Issuer not found   │
│        │        │   │ Found   │                             │
│        └───┬────┘   └─────────┘                             │
│            │                                                │
│            ▼                                                │
│    ┌─────────────────┐                                      │
│    │ Match key_id    │                                      │
│    │ in issuer keys  │                                      │
│    └────────┬────────┘                                      │
│             │                                               │
│       ┌─────┴─────┐                                         │
│       │           │                                         │
│       ▼           ▼                                         │
│   ┌────────┐  ┌─────────┐                                   │
│   │ Found  │  │ Not     │─▶ FAIL: Key not found             │
│   │        │  │ Found   │                                   │
│   └───┬────┘  └─────────┘                                   │
│       │                                                     │
│       ▼                                                     │
│   ┌─────────────────┐                                         │
│   │ Check status    │                                         │
│   │ (active?)       │                                         │
│   └────────┬────────┘                                         │
│            │                                                │
│      ┌─────┴─────┐                                          │
│      │           │                                          │
│      ▼           ▼                                          │
│  ┌────────┐  ┌─────────┐                                    │
│  │ Active │  │ Revoked │─▶ FAIL: Key revoked                │
│  │        │  │         │                                    │
│  └───┬────┘  ├─────────┤                                    │
│      │      │ Expired │─▶ FAIL: Key expired                │
│      │      ├─────────┤                                    │
│      │      │ Suspend │─▶ FAIL: Key suspended              │
│      │      │ ed      │                                    │
│      │      ├─────────┤                                    │
│      │      │ Test    │─▶ FAIL: Test key in prod context   │
│      │      │         │                                    │
│      │      └─────────┘                                    │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────┐                                        │
│  │ Check algorithm │                                        │
│  │ matches receipt │                                        │
│  └────────┬────────┘                                        │
│           │                                                │
│     ┌─────┴─────┐                                          │
│     │           │                                          │
│     ▼           ▼                                          │
│ ┌────────┐  ┌─────────┐                                    │
│ │ Match  │  │ Mismatch│─▶ FAIL: Algorithm mismatch         │
│ │        │  │         │                                    │
│ └───┬────┘  └─────────┘                                    │
│     │                                                       │
│     ▼                                                       │
│ ┌─────────────────┐                                         │
│ │ Return public   │                                         │
│ │ key for verify  │                                         │
│ └─────────────────┘                                         │
│                                                             │
│  SUCCESS: Public key resolved and validated                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Failure Modes

The registry resolution can fail in the following ways:

### Issuer Not Found

**Cause:** The `issuer_id` in the receipt does not exist in any configured registry.

**Response:** Verification fails with error code `ISSUER_NOT_FOUND`.

**Resolution:**
- Verify the issuer identifier is correct
- Add issuer to registry if legitimate
- Check for typos or encoding issues in the identifier

### Key Not Found

**Cause:** The issuer exists, but the `key_id` is not in their registered key set.

**Response:** Verification fails with error code `KEY_NOT_FOUND`.

**Resolution:**
- Verify the key_id with the issuer
- Check if key rotation has occurred
- Ensure registry is synchronized with issuer's current keys

### Key Revoked

**Cause:** The key exists but has been explicitly revoked.

**Response:** Verification fails with error code `KEY_REVOKED`.

**Resolution:**
- Do not trust evidence signed with this key
- Check `revocation_status` for replacement key_id
- Investigate reason for revocation (compromise vs. routine rotation)
- Contact issuer through alternative channels if evidence is critical

### Key Expired

**Cause:** The key's `valid_until` timestamp is in the past.

**Response:** Verification fails with error code `KEY_EXPIRED`.

**Resolution:**
- Check for clock skew on the verifying system
- Verify with issuer if key should still be valid (possible policy extension)
- Request re-issuance of evidence with current key if appropriate

### Algorithm Mismatch

**Cause:** The `algorithm` field in the registry does not match the algorithm used in the receipt signature.

**Response:** Verification fails with error code `ALGORITHM_MISMATCH`.

**Resolution:**
- Indicates potential tampering or protocol incompatibility
- Check receipt format version compatibility
- Verify registry entry matches issuer's published key metadata

## Registry Implementation Options

DigiEmu Secure supports multiple registry implementations:

| Implementation | Use Case | Persistence |
|---------------|----------|-------------|
| **Local JSON file** | Development, single-node deployments | File system |
| **Embedded registry** | Static deployments with known issuers | Compiled or bundled |
| **TBN-integrated registry** | Production with trust certification | TBN service |
| **Database-backed registry** | High-volume multi-issuer environments | SQL/NoSQL database |
| **Remote registry service** | Distributed deployments with central authority | HTTP API |

## TBN Integration Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                     REGISTRY LAYERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────┐               │
│  │                 │     │                 │               │
│  │      TBN        │────▶│  Trust Decision │               │
│  │  (Optional)     │     │  (Certification)│               │
│  │                 │     │                 │               │
│  │ - Certifies     │     │  Is this issuer │               │
│  │   issuer trust  │     │  trustworthy?   │               │
│  │ - Attests to    │     │                 │               │
│  │   reputation    │     │  Response:       │               │
│  │ - Scores risk   │     │  trusted /      │               │
│  │                 │     │  untrusted /    │               │
│  └─────────────────┘     │  unknown        │               │
│           │              │                 │               │
│           │ references   └─────────────────┘               │
│           │                                                   │
│           ▼                                                   │
│  ┌─────────────────┐     ┌─────────────────┐                   │
│  │                 │     │                 │                   │
│  │  DigiEmu Secure │────▶│  Key Resolution │                   │
│  │    Registry     │     │  (Verification) │                   │
│  │                 │     │                 │                   │
│  │ - Maps issuer   │     │  Is this key    │                   │
│  │   to keys       │     │  valid for this │                   │
│  │ - Tracks key    │     │  issuer?        │                   │
│  │   lifecycle     │     │                 │                   │
│  │ - Validates     │     │  Response:      │                   │
│  │   status        │     │  valid / invalid│                   │
│  │                 │     │                 │                   │
│  └─────────────────┘     └─────────────────┘                   │
│                                                             │
│  Layer separation:                                          │
│  - Registry resolves keys (technical)                      │
│  - TBN certifies trust (organizational)                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Secure's Responsibility

- Maintain accurate issuer-to-key mappings
- Enforce key lifecycle states (active, revoked, expired)
- Validate algorithm compatibility
- Return public keys for signature verification

### TBN's Responsibility (Optional)

- Certify that registered issuers are trustworthy
- Provide reputation scores or trust levels
- Attest to organizational standing
- Recommend acceptance/rejection of evidence based on issuer trust

**Integration:** Secure resolves the key. TBN may layer a trust decision on top. Evidence with a valid signature from an unknown or untrusted issuer is cryptographically valid but may not be organizationally accepted.

## Version Compatibility

| Registry Version | Secure Version | Compatibility |
|------------------|----------------|---------------|
| 0.3 | 0.3.x | Full |
| 0.3 | 0.2.x | Partial (missing `revocation_status` fields) |
| 0.2 | 0.3.x | Backward compatible |

## Summary

The issuer registry is the technical foundation for signature verification in DigiEmu Secure. It:

- ✅ Maps identifiers to cryptographic keys
- ✅ Enforces key lifecycle policies
- ✅ Prevents verification with invalid or revoked keys
- ❌ Does not certify organizational trust (TBN)
- ❌ Does not assign liability or legal standing (CLARIXO)

Trust is a layered concept. The registry provides the cryptographic layer. Organizational trust is built upon it.
