# DigiEmu Secure v0.3 Key Rotation Profile

This document defines the key lifecycle management and rotation procedures for DigiEmu Secure v0.3, ensuring continuous verification capability while maintaining cryptographic security.

## Key Lifecycle Overview

```
Key Generation
      │
      ▼
┌─────────────┐
│   Active    │─────▶ Signing operations permitted
│   (Primary) │
└──────┬──────┘
       │
       │ Rotation Event
       ▼
┌─────────────┐
│   Active    │─────▶ Old key: verification only
│ (Secondary) │       New key: signing + verification
│   + Grace   │
└──────┬──────┘
       │
       │ Grace Period Ends
       ▼
┌─────────────┐
│  Expired    │─────▶ Historical verification only
│  (Read-only)│       No new signatures
└──────┬──────┘
       │
       │ Revocation Event (optional)
       ▼
┌─────────────┐
│  Revoked    │─────▶ Verification blocked
│  (Invalid)  │       (unless pre-dates revocation)
└─────────────┘
```

## Key States

### Key Generation

New keys are generated according to issuer security policies:

- **Algorithm:** Ed25519 (32-byte private key, 32-byte public key)
- **Key identifier:** Unique within issuer namespace (e.g., `signing-key-2026-q2`)
- **Validity period:** Defined by `valid_from` and `valid_until` timestamps
- **Metadata:** Purpose, environment, and rotation policy reference

**Generation Record Example:**

```json
{
  "rotationEvent": {
    "eventType": "KEY_GENERATION",
    "eventId": "ROT-2026-001",
    "timestamp": "2026-04-01T00:00:00Z",
    "issuer": "org:example-org:division:service",
    "newKey": {
      "key_id": "signing-key-2026-q2",
      "public_key": "h5PiOrExS3YKraCAUm0L9wMqRn4ZtXvFjGySoIe8K1l=",
      "algorithm": "Ed25519",
      "valid_from": "2026-04-01T00:00:00Z",
      "valid_until": "2026-09-30T23:59:59Z"
    },
    "metadata": {
      "generated_by": "org:example-org:security-team",
      "purpose": "production-evidence-signing",
      "rotation_reason": "scheduled_quarterly"
    }
  }
}
```

### Active Keys (Primary)

A key in `active` state with no successor is the **primary signing key**:

- Used for all new evidence signing
- Valid for both signing and verification
- Monitored for approaching expiration

### Rotation Events

Rotation occurs when a new key replaces an existing active key:

**Rotation Record Example:**

```json
{
  "rotationEvent": {
    "eventType": "KEY_ROTATION",
    "eventId": "ROT-2026-002",
    "timestamp": "2026-04-01T00:00:00Z",
    "issuer": "org:example-org:division:service",
    "predecessorKey": {
      "key_id": "signing-key-2026-q1",
      "status_after_rotation": "expired",
      "valid_until": "2026-04-15T23:59:59Z"
    },
    "successorKey": {
      "key_id": "signing-key-2026-q2",
      "status": "active",
      "valid_from": "2026-04-01T00:00:00Z"
    },
    "gracePeriod": {
      "enabled": true,
      "duration_days": 14,
      "reason": "allow_verification_overlap"
    }
  }
}
```

### Grace Periods

Grace periods enable smooth transitions between keys:

| Grace Period Type | Duration | Purpose |
|-------------------|----------|---------|
| **Overlap grace** | 7-30 days | Old key remains valid for verification while new key takes over signing |
| **Clock skew buffer** | 24 hours | Accommodates system time discrepancies |
| **Emergency grace** | As needed | Extended during incidents or mass rotation events |

**Grace Period Rules:**
- Both old and new keys are valid for verification during grace period
- Only the new key is valid for signing
- Grace period extends old key's effective validity
- After grace period, old key becomes `expired` (not revoked)

### Key Expiration

Expiration occurs when:
- `valid_until` timestamp is reached (without grace period)
- Grace period ends after rotation
- Scheduled lifetime completes

**Expired Key Properties:**
- ❌ Cannot sign new evidence
- ✅ Can verify historical receipts signed before expiration
- ✅ Remains in registry for historical lookup
- ✅ Should be replaced for new signing operations

### Key Revocation

Revocation is an **explicit security action**, distinct from expiration:

| Revocation Reason | Action Required | Replacement Urgency |
|-------------------|-----------------|---------------------|
| `key_compromise` | Immediate revocation | Immediate |
| `security_incident` | Immediate revocation | Immediate |
| `routine_rotation` | Scheduled expiration | Normal schedule |
| `issuer_decommission` | Revocation on shutdown | N/A |

**Critical distinction:**
- **Expired keys:** Valid for historical verification
- **Revoked keys:** Invalid for all verification (unless receipt predates revocation)

## Historical Receipt Verification

DigiEmu Secure maintains verification capability for historical receipts even after key rotation:

### Verification Rules by Key State

| Key State | Receipt Timestamp | Verification Result |
|-----------|-------------------|---------------------|
| **Active** | Any | ✅ Valid |
| **Expired** | Before expiration | ✅ Valid (historical) |
| **Expired** | After expiration | ❌ Invalid (signed with expired key) |
| **Revoked** | Before revocation | ✅ Valid (if not expired) |
| **Revoked** | After revocation | ❌ Invalid |
| **Suspended** | Any | ❌ Invalid |

### Precedence Rules

When multiple conditions apply, the most restrictive takes precedence:

1. **Revocation overrides expiration:** A key revoked before its expiration date cannot verify receipts after the revocation timestamp, even if within the original validity period.

2. **Expiration overrides active status:** A key marked `active` but past its `valid_until` is treated as expired.

3. **Grace period extends expiration:** During grace period, the extended validity applies only to verification, not signing.

### Chain of Trust Preservation

Historical verification requires maintaining the **rotation chain**:

```
Receipt A ──▶ signed with Key 1 (expired)
                │
                ▼
         Rotation Event (Key 1 ──▶ Key 2)
                │
Receipt B ──▶ signed with Key 2 (active)
                │
                ▼
         Rotation Event (Key 2 ──▶ Key 3)
                │
Receipt C ──▶ signed with Key 3 (active)
```

All three receipts remain verifiable if:
- Key 1, Key 2, and Key 3 are in registry
- Their status and validity are correctly maintained
- Revocation (if any) post-dates the receipts

## Rotation Records

### Single Rotation Event

```json
{
  "rotationRecord": {
    "version": "0.3",
    "rotationId": "ROT-2026-042",
    "issuer": "org:gazacare:field-ops",
    "timestamp": "2026-04-01T00:00:00Z",
    "predecessor": {
      "keyId": "signing-key-2026-q1",
      "publicKey": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=",
      "finalStatus": "expired",
      "validityEnd": "2026-04-15T23:59:59Z"
    },
    "successor": {
      "keyId": "signing-key-2026-q2",
      "publicKey": "h5PiOrExS3YKraCAUm0L9wMqRn4ZtXvFjGySoIe8K1l=",
      "initialStatus": "active",
      "validityStart": "2026-04-01T00:00:00Z"
    },
    "gracePeriod": {
      "start": "2026-04-01T00:00:00Z",
      "end": "2026-04-15T23:59:59Z",
      "verificationOnly": true
    }
  }
}
```

### Emergency Revocation with Successor

```json
{
  "rotationRecord": {
    "version": "0.3",
    "rotationId": "ROT-2026-URGENT-001",
    "issuer": "org:gazacare:field-ops",
    "timestamp": "2026-05-15T10:30:00Z",
    "eventType": "EMERGENCY_ROTATION",
    "reason": "key_compromise",
    "predecessor": {
      "keyId": "signing-key-2026-q2",
      "publicKey": "h5PiOrExS3YKraCAUm0L9wMqRn4ZtXvFjGySoIe8K1l=",
      "finalStatus": "revoked",
      "revokedAt": "2026-05-15T10:30:00Z",
      "receiptsBeforeRevocationValid": true
    },
    "successor": {
      "keyId": "signing-key-2026-q2-replacement",
      "publicKey": "k7RkQtGzU5WMtcECWo1N7yOsTp6BvYxHkJuUqKg9M3n=",
      "initialStatus": "active",
      "validityStart": "2026-05-15T10:30:01Z",
      "emergencyGeneration": true
    },
    "gracePeriod": {
      "enabled": false,
      "reason": "security_incident_no_grace"
    }
  }
}
```

## Failure Modes

### Expired Key

**Scenario:** Attempting to verify a receipt signed after the key's `valid_until` date.

**Result:** ❌ `KEY_EXPIRED`

**Resolution:**
- Check receipt timestamp against key validity
- If receipt should be valid, investigate clock skew
- If key was rotated, verify with successor key (not possible for this receipt)
- Contact issuer for re-issuance if critical

### Revoked Key

**Scenario:** Attempting to verify a receipt signed after the key's revocation timestamp.

**Result:** ❌ `KEY_REVOKED`

**Resolution:**
- Check if receipt predates revocation (if so, should verify with predecessor)
- Investigate revocation reason
- For compromised keys, do not trust any post-revocation receipts
- For routine rotation, verify with appropriate key for receipt timestamp

### Unknown Successor Key

**Scenario:** Registry shows a rotation event but the successor key record is missing or inaccessible.

**Result:** ⚠️ `ROTATION_CHAIN_BROKEN`

**Resolution:**
- Verify registry synchronization
- Check for partial updates or replication lag
- Restore successor key from backup
- If unrecoverable, historical receipts with predecessor remain verifiable but new signing may be impacted

### Broken Rotation Chain

**Scenario:** Multiple rotation events exist but the chain cannot be traversed (missing links, circular references, orphaned keys).

**Result:** ⚠️ `ROTATION_CHAIN_INCOMPLETE`

**Examples:**
- Key A rotated to Key B, but Key B rotated to Key C, and Key C claims predecessor was Key A (missing Key B)
- Key X has no predecessor but receipts exist signed with a prior key
- Grace period overlaps create ambiguity about which key should verify a receipt

**Resolution:**
- Audit rotation records for completeness
- Reconstruct chain from issuer logs
- Mark affected receipts as requiring manual verification
- Implement chain validation in registry updates

## Boundary to Issuer Registry

```
┌─────────────────────────────────────────────────────────────┐
│              KEY ROTATION AND REGISTRY LAYERS               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            KEY ROTATION PROFILE                      │   │
│  │                                                     │   │
│  │  - Defines lifecycle states and transitions         │   │
│  │  - Specifies grace periods and overlap rules        │   │
│  │  - Maintains rotation history and chain integrity     │   │
│  │  - Determines verification validity for historical  │   │
│  │    receipts based on key state at signing time      │   │
│  │                                                     │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│                         │ References                        │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            ISSUER REGISTRY                           │   │
│  │                                                     │   │
│  │  - Stores current key records with status           │   │
│  │  - Maintains historical key records                 │   │
│  │  - Resolves issuer + key_id to public key           │   │
│  │  - Enforces status-based access control             │   │
│  │                                                     │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│                         │ Queries                           │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            VERIFICATION ENGINE                       │   │
│  │                                                     │   │
│  │  - Requests key resolution from registry            │   │
│  │  - Applies rotation profile rules to determine        │   │
│  │    historical validity                               │   │
│  │  - Performs cryptographic signature verification      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Separation of concerns:                                    │
│  - Rotation Profile: policy and lifecycle logic            │
│  - Issuer Registry: storage and resolution               │
│  - Verification Engine: execution and validation           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Rotation Profile Responsibilities

- Define valid state transitions
- Specify grace period durations
- Determine historical verification rules
- Validate rotation chain integrity

### Issuer Registry Responsibilities

- Store all keys (active, expired, revoked)
- Maintain accurate status and validity timestamps
- Provide lookup by issuer + key_id
- Support rotation record queries

## Trust Anchor Integration

Key rotation affects trust anchors in the following ways:

### Static Trust Anchors

Pre-configured trust anchors with embedded public keys:
- Must be updated when keys rotate
- May lag behind registry updates
- Risk: verifying with outdated trust anchor fails for new receipts

**Best Practice:** Reference trust anchors that point to registry entries rather than embedding keys directly.

### Dynamic Trust Anchors

Registry-referenced trust anchors:
- Automatically follow rotation events
- Always resolve to current key state
- Support historical verification through registry history

**Best Practice:** Use dynamic resolution for production systems requiring long-term verification.

## Summary

| Concept | Behavior |
|---------|----------|
| **Active keys** | Full signing and verification capability |
| **Expired keys** | Historical verification only; no new signing |
| **Revoked keys** | Blocked for all verification (post-revocation receipts) |
| **Grace periods** | Verification overlap during rotation; no signing overlap |
| **Historical receipts** | Verifiable if signed with valid key at that time |
| **Rotation chain** | Must be maintained for long-term verification |

DigiEmu Secure preserves the ability to verify historical evidence across key rotations while ensuring that compromised or expired keys cannot be misused for new evidence.
