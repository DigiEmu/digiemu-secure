# DigiEmu Secure v0.7

DigiEmu Secure is the cryptographic protection layer for DigiEmu Core evidence artifacts.

It does not replace DigiEmu Core. It protects Core verification evidence against tampering, ambiguity, unverifiable authority claims, and post-hoc rewriting.

> ## ⚠️ EXPERIMENTAL / TECHNICAL REVIEW — NOT PRODUCTION READY
>
> DigiEmu Secure is an experimental prototype published for technical review. It is **not** suitable for production or trusted deployments. Production trust enforcement is **not yet complete**: with default settings, a bundle signed with any self-generated key can verify as `SECURE_PASS`, registry signatures are not verified, and production key management is not implemented.
>
> Read [`SECURITY.md`](SECURITY.md) → **Known Security Limitations** before evaluating or integrating this code. Parts of this README and of `docs/` describe the target design; where they describe features that are not implemented, this is noted.

## What is DigiEmu Secure?

DigiEmu Secure provides cryptographic evidence integrity for any organization that needs to prove digital records are authentic and unmodified.

**Core capability:** Create tamper-evident digital records that anyone can verify independently.

- **Sign evidence:** Apply cryptographic seals that prove origin and integrity
- **Verify evidence:** Check authenticity without trusting the source *(target design — see "Signatures vs. trusted issuer identity" below)*
- **Bundle evidence:** Package related records with complete verification artifacts
- **Audit evidence:** Maintain trustworthy records for compliance and legal needs *(target design; audit storage is not implemented)*

Secure transforms technical cryptographic operations into simple, accessible workflows for technical and non-technical users alike.

### Signatures vs. trusted issuer identity

A **valid cryptographic signature** proves only that the data was signed by the holder of the private key matching the public key used for verification, and that the signed data has not changed since.

It does **not** prove **who** the signer is. Issuer identity is trusted only if the public key is obtained from an authenticated source (an issuer registry anchored to a trust anchor), not from the evidence bundle itself. In the current implementation:

- Without `--strict-registry` (CLI) or `"strict_registry": true` (API), the verifier falls back to the `public_key` embedded in the bundle. A `SECURE_PASS` in that mode means "internally consistent and self-signed", **not** "issued by a trusted party".
- Registry files are not themselves signature-verified (SEC-014 is not implemented), so registry-backed results are only as trustworthy as the registry file on disk.

### Canonicalization

Hashes and signatures are computed over RFC 8785 (JSON Canonicalization Scheme) output: object keys sorted by UTF-16 code units, ECMAScript number formatting, minimal string escaping. JSON input is parsed strictly; duplicate property names and malformed JSON are rejected. Integers beyond ±2^53 may lose precision and should be encoded as strings. See the [Canonical JSON Profile](docs/DigiEmu_Secure_v0_2_Canonical_JSON_Profile.md) for exact rules, hash contracts and the current (unproven) compatibility status with DigiEmu Core HashV1.

## Quickstart

### For Developers

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Sign example evidence
# WARNING: overwrites the tracked files examples/secure-receipt.signed.example.json
# and examples/test-public-key.pem with a newly generated ephemeral key and signature
npm run sign:example

# Verify the signed evidence (read-only)
npm run verify:example

# Run the RFC 8785 canonicalization tests (read-only)
npm run test:canonical
```

### Using the API

The HTTP API is a local prototype server (`src/api.ts`). There is no hosted endpoint.

```bash
# Start the server (default port 3000; requires `npm run build`)
PORT=3000 node dist/api.js

# Optional: registry-backed verification
REGISTRY_PATH=registry.json TRUST_ANCHOR_PATH=anchors.json node dist/api.js

# Health check
curl http://localhost:3000/health

# Verify an evidence bundle
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{"bundle": { ... }, "strict_registry": true}'
```

| Route | Body | Responses |
|-------|------|-----------|
| `GET /health` | — | `200` |
| `POST /verify` (alias `POST /bundle/verify`) | `{"bundle": <evidence bundle>, "strict_registry"?: boolean}` | `200` SECURE_PASS, `409` SECURE_FAIL, `503` SECURE_INCOMPLETE, `400` invalid input or invalid/duplicate-key JSON, `413` body > 10 MB, `415` non-JSON content type |

Note: `strict_registry: true` currently enables strict mode on a verifier shared by all requests and is not reset afterwards (see `SECURITY.md`).

### Using Secure CLI

Install and use the Secure CLI for command-line evidence operations:

```bash
# Install dependencies
npm install

# Build the project (compiles TypeScript to JavaScript)
npm run build

# Verify an evidence bundle
node dist/cli.js verify examples/valid-bundle.json

# Sign evidence and create a receipt (uses a new ephemeral key per run; demo only)
node dist/cli.js sign evidence.json --issuer org:example:issuer --output receipt.json

# Create a complete evidence bundle (uses a new ephemeral key per run; demo only)
node dist/cli.js bundle create evidence.json --output bundle.json

# Verify with registry and trust anchors, without bundled-key fallback
node dist/cli.js verify bundle.json --registry registry.json --trust-anchor anchors.json --strict-registry
```

`sign` and `bundle create` generate a fresh Ed25519 key pair on every invocation and discard the private key; there is no option to sign with a managed key yet. Registry-backed verification is not yet production-grade (registry signatures are not verified).

**CLI Commands:**
- `secure sign <snapshot.json>` - Sign evidence and create receipt
- `secure verify <bundle.json>` - Verify evidence bundle
- `secure bundle create <snapshot.json>` - Create complete evidence bundle
- `secure bundle verify <bundle.json>` - Verify evidence bundle

**Global Installation (optional):**
```bash
npm link  # Makes 'secure' command available globally
secure verify bundle.json
```

### Using Secure Studio (Web Interface)

> **Planned / specification only.** Secure Studio is not implemented in this repository. The steps below describe the target design from the [Secure Studio Profile](docs/DigiEmu_Secure_v0_7_Secure_Studio_Profile.md).

1. Navigate to the Secure Studio web interface
2. Drag and drop evidence files for instant verification
3. View clear pass/fail results with detailed audit trails

## For Non-Technical Users

DigiEmu Secure is designed to be accessible without command-line knowledge or cryptographic expertise. *(Target design: Secure Studio and the no-code workflows below are specifications and are not implemented yet.)*

**Secure Studio** provides a web-based interface for:
- Verifying evidence with drag-and-drop simplicity
- Signing evidence to create tamper-proof records
- Creating evidence packages for sharing
- Reviewing verification history and reports

**No-Code Adoption** resources guide users through:
- Simple onboarding for field staff, compliance officers, and auditors
- Progressive disclosure of complexity (learn as you need)
- Plain-language terminology (no jargon)

See the [No-Code Adoption Profile](docs/DigiEmu_Secure_v0_7_No_Code_Adoption_Profile.md) and [Secure Studio Profile](docs/DigiEmu_Secure_v0_7_Secure_Studio_Profile.md) for detailed guidance.

## DigiEmu Ecosystem

| Component | Purpose | Relationship to Secure |
|-----------|---------|----------------------|
| **DigiEmu Core** | Deterministic AI replay and decision capture | Provides evidence artifacts for Secure to protect |
| **DigiEmu Secure** | Cryptographic evidence signing and verification | Protects Core evidence, enables independent verification |
| **TBN** (Trust Boundary Network) | Trust certification and reputation | Provides trust scores and attestation for issuers |
| **CLARIXO** | Legal responsibility attribution | Uses Secure verification reports for liability mapping |

Secure works with Core artifacts, integrates with TBN for trust certification, and provides verification data to CLARIXO for legal accountability.

## Key Specifications

| Specification | Description |
|-------------|-------------|
| [Evidence Bundle Format](docs/DigiEmu_Secure_v0_4_Evidence_Bundle_Format.md) | Transport container for protected evidence |
| [Verification Profile](docs/DigiEmu_Secure_v0_4_Verification_Profile.md) | 10-step normative verification sequence |
| [Failure Code Registry](docs/DigiEmu_Secure_v0_4_Failure_Code_Registry.md) | Standardized error codes (SEC-001 to SEC-016) |
| [Secure Studio Profile](docs/DigiEmu_Secure_v0_7_Secure_Studio_Profile.md) | Reference user interface specification |
| [Showcase Profile](docs/DigiEmu_Secure_v0_7_Showcase_Profile.md) | Demonstration scenarios for stakeholders |

See `docs/` for complete specification documentation.

## Repository Structure

```txt
/docs      Specification documentation (20+ profiles)
/examples  Example receipts and evidence bundles
/src       TypeScript signing and verification implementation
/.github   CI/CD workflows for testing and validation
```

## Status

Current: v0.7.2 — Interface specifications complete, implementation in progress.

**EXPERIMENTAL / TECHNICAL REVIEW — NOT PRODUCTION READY.** See [`SECURITY.md`](SECURITY.md) → Known Security Limitations.

Version strings are not yet unified: this README says v0.7.2, `package.json` declares `0.1.0`, the API `/health` endpoint reports `0.9.0`, and the historical [v1.0 Security Review](docs/DigiEmu_Secure_v1_0_Security_Review.md) refers to v0.13.0. None of these indicates production readiness.

Roadmap: See [v1.0 Roadmap](docs/DigiEmu_Secure_v1_0_Roadmap.md) and [Gap Analysis](docs/DigiEmu_Secure_v1_0_Gap_Analysis.md) for path to production release.

License: MIT
