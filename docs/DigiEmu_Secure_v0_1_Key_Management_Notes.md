# DigiEmu Secure v0.1 Key Management Notes

## Purpose

This document defines early key management assumptions for DigiEmu Secure v0.1.

## v0.1 Assumptions

- Ed25519 is used for signing receipts.
- Test keys may be used only for local examples.
- Production keys must not be committed to the repository.
- Every public key must have a stable `key_id`.
- Verifiers should reject unknown keys in strict mode.

## Future Direction

Later versions may include:

- public key registry
- key rotation profile
- revoked key list
- hardware-backed keys
- timestamp authority integration
- multi-signature receipt flows
