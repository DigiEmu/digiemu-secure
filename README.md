# DigiEmu Secure v0.1

DigiEmu Secure is the cryptographic protection layer for DigiEmu Core evidence artifacts.

It does not replace DigiEmu Core. It protects Core verification evidence against tampering, ambiguity, unverifiable authority claims, and post-hoc rewriting.

## Boundary

DigiEmu Core answers:

> Can a decision-state artifact be canonically represented, replayed, and verified?

DigiEmu Secure answers:

> Can the resulting evidence artifact be signed, verified, protected, and attributed to a declared issuer?

## v0.1 Scope

This repository defines a minimal secure evidence layer:

- signed verification receipts
- snapshot hash binding
- declared issuer identity
- signature verification flow
- threat model for evidence tampering
- example artifacts

## Non-Claims

DigiEmu Secure v0.1 does not claim to:

- make an AI system safe by itself
- certify model identity
- replace legal or institutional audit
- provide full enterprise key management
- enforce all runtime policies

## Repository Structure

```txt
/docs      Specification notes and threat model
/examples  Example receipts and snapshot references
/src       Minimal TypeScript signing and verification helpers
/test      Reserved for future conformance tests
```

## Quick Start

```bash
npm install
npm run build
npm run sign:example
npm run verify:example
```

## Status

Draft v0.1. Not production-ready. Intended for review, alignment testing, and early interop discussions.
