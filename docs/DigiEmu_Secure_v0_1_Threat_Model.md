# DigiEmu Secure v0.1 Threat Model

## Purpose

This document defines the initial threat model for DigiEmu Secure v0.1.

DigiEmu Secure protects evidence artifacts produced around DigiEmu Core verification flows. It assumes that DigiEmu Core produces canonical decision-state evidence and focuses on protecting that evidence after creation.

## Protected Assets

- canonical snapshot references
- verification reports
- signed receipts
- issuer declarations
- snapshot hashes
- verification outcome references
- timestamps and evidence chain metadata

## Primary Threats

### 1. Snapshot Tampering

An attacker modifies a snapshot after verification and attempts to preserve the appearance of validity.

Mitigation:

- bind snapshot identity to SHA-256 hash
- include hash in signed receipt
- verify hash before accepting receipt

### 2. Receipt Manipulation

An attacker edits the receipt, for example by changing `verification_result` from `FAIL` to `PASS`.

Mitigation:

- canonicalize receipt payload before signing
- verify signature against signed payload
- reject changed signed fields

### 3. Fake Authority Claim

An actor claims to be DigiEmu, a partner, or an authorized verifier without cryptographic proof.

Mitigation:

- require issuer declaration
- bind `key_id` to known public key
- reject unknown issuer keys in strict mode

### 4. Replay Substitution

An attacker replaces the original snapshot reference with a different snapshot while preserving a valid-looking receipt.

Mitigation:

- bind `snapshot_id` and `snapshot_hash`
- bind `core_profile`
- bind `receipt_id`
- compare referenced artifacts during verification

### 5. Post-Hoc Evidence Rewriting

A party modifies evidence after an incident to create a more favorable audit trail.

Mitigation:

- signed receipts
- append-only evidence storage in future versions
- timestamp anchoring in future versions

## Out of Scope for v0.1

- hardware security modules
- zero-trust deployment architecture
- multi-tenant authorization
- full policy enforcement
- model behavior safety
- identity certification of external agents

## Security Principle

DigiEmu Secure does not make trust claims by assertion. It makes evidence protection claims only where cryptographic verification is possible.
