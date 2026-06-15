# DigiEmu Secure v0.7

DigiEmu Secure is the cryptographic protection layer for DigiEmu Core evidence artifacts.

It does not replace DigiEmu Core. It protects Core verification evidence against tampering, ambiguity, unverifiable authority claims, and post-hoc rewriting.

## What is DigiEmu Secure?

DigiEmu Secure provides cryptographic evidence integrity for any organization that needs to prove digital records are authentic and unmodified.

**Core capability:** Create tamper-evident digital records that anyone can verify independently.

- **Sign evidence:** Apply cryptographic seals that prove origin and integrity
- **Verify evidence:** Check authenticity without trusting the source
- **Bundle evidence:** Package related records with complete verification artifacts
- **Audit evidence:** Maintain trustworthy records for compliance and legal needs

Secure transforms technical cryptographic operations into simple, accessible workflows for technical and non-technical users alike.

## Quickstart

### For Developers

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Sign example evidence
npm run sign:example

# Verify the signed evidence
npm run verify:example
```

### Using the API

```bash
# Verify evidence via API
curl -X POST https://api.example.com/v1/secure/verify \
  -H "Content-Type: application/json" \
  -d '{"receipt": {...}, "canonical_snapshot": {...}}'
```

### Using Secure CLI

Install and use the Secure CLI for command-line evidence operations:

```bash
# Install dependencies
npm install

# Build the project (compiles TypeScript to JavaScript)
npm run build

# Verify an evidence bundle
node dist/cli.js verify examples/valid-bundle.json

# Sign evidence and create a receipt
node dist/cli.js sign evidence.json --issuer org:example:issuer --output receipt.json

# Create a complete evidence bundle
node dist/cli.js bundle create evidence.json --output bundle.json

# Verify with registry (production use)
node dist/cli.js verify bundle.json --registry registry.json --trust-anchor anchors.json
```

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

1. Navigate to the Secure Studio web interface
2. Drag and drop evidence files for instant verification
3. View clear pass/fail results with detailed audit trails

## For Non-Technical Users

DigiEmu Secure is designed to be accessible without command-line knowledge or cryptographic expertise.

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

Roadmap: See [v1.0 Roadmap](docs/DigiEmu_Secure_v1_0_Roadmap.md) and [Gap Analysis](docs/DigiEmu_Secure_v1_0_Gap_Analysis.md) for path to production release.

License: MIT
