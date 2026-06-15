# DigiEmu Secure v0.6 CLI Profile

This document defines the normative command-line interface for DigiEmu Secure, establishing standard commands, syntax, and behavior for command-line operations.

## Purpose

The CLI profile ensures that:

- Command-line tools behave consistently across implementations
- Scripts and automation can rely on predictable interfaces
- Exit codes unambiguously indicate success or failure
- Output formats support both human and machine consumption

## CLI Conformance

Implementations MUST support the commands and options defined in this profile to achieve CLI conformance. Optional extensions are marked with OPTIONAL.

## Command Overview

| Command | Purpose | Tier |
|---------|---------|------|
| `secure sign` | Sign evidence and create receipt | Tier 3 |
| `secure verify` | Verify evidence bundle | Tier 1 |
| `secure bundle create` | Create complete evidence bundle | Tier 3 |
| `secure bundle verify` | Verify complete evidence bundle | Tier 1 |
| `secure registry validate` | Validate issuer registry | Tier 2 |
| `secure trust-anchor validate` | Validate trust anchor | Tier 2 |

## Global Options

All commands support these global options:

| Option | Description | Default |
|--------|-------------|---------|
| `--help` | Display command help | - |
| `--version` | Display version information | - |
| `--verbose` | Enable verbose output | false |
| `--quiet` | Suppress non-error output | false |
| `--format` | Output format: `human`, `json` | `human` |
| `--config` | Path to configuration file | `~/.digiemu-secure/config.json` |

## Exit Codes

| Code | Name | Meaning | Example Scenario |
|------|------|---------|------------------|
| **0** | `SUCCESS` | Operation completed successfully | Bundle verified, receipt created |
| **1** | `VERIFICATION_FAILURE` | Verification failed | Invalid signature, hash mismatch |
| **2** | `INVALID_INPUT` | Input validation error | Malformed JSON, missing file |
| **3** | `CONFIGURATION_ERROR` | Configuration problem | Invalid registry path, missing key |
| **4** | `RUNTIME_ERROR` | Unexpected runtime error | Out of memory, I/O error |

## Command Definitions

### secure sign

Sign evidence and create a signed receipt.

**Syntax:**

```
secure sign <input-file> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `input-file` | Yes | Path to JSON evidence file |

**Options:**

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--issuer` | Yes | Issuer identifier | - |
| `--key-id` | Yes | Key identifier | - |
| `--private-key` | Yes | Path to private key file | - |
| `--output` | No | Output path for receipt | stdout |
| `--valid-until` | No | Key expiration for metadata | from registry |

**Output:**

Human format (default):
```
Signing evidence from: input-event.json
Issuer: org:gazacare:field-ops:triage-system
Key ID: signing-key-2026-q1
Receipt created: RCPT-2026-0847-001-A7F3
Signature: valid
Output: secure-receipt.json
```

JSON format (`--format json`):
```json
{
  "command": "sign",
  "status": "success",
  "input": "input-event.json",
  "receipt": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "issuer": "org:gazacare:field-ops:triage-system",
    "key_id": "signing-key-2026-q1",
    "signature_valid": true,
    "output_path": "secure-receipt.json"
  },
  "exit_code": 0
}
```

**Exit Codes:**
- `0` — Receipt created successfully
- `2` — Input file not found or invalid JSON
- `3` — Private key not found or invalid
- `4` — Signing operation failed

**Example:**

```bash
secure sign examples/gazacare-demo/input-event.json \
  --issuer org:gazacare:field-ops:triage-system \
  --key-id signing-key-2026-q1 \
  --private-key ~/.keys/gazacare-signing.key \
  --output examples/gazacare-demo/secure-receipt.json
```

### secure verify

Verify evidence bundle (receipt-only verification).

**Syntax:**

```
secure verify <receipt-file> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `receipt-file` | Yes | Path to signed receipt file |

**Options:**

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--public-key` | No* | Path to public key file | - |
| `--registry` | No* | Path to issuer registry | `~/.digiemu-secure/registry.json` |
| `--issuer` | No | Expected issuer (validation) | - |

*One of `--public-key` or `--registry` REQUIRED

**Output:**

Human format:
```
Verifying: secure-receipt.json
Outcome: SECURE_PASS

Checks:
  ✓ Bundle structure
  ✓ Bundle version
  ✓ Canonical snapshot
  ✓ Snapshot hash (SHA-256 match)
  ✓ Receipt structure
  ✓ Issuer resolution (org:gazacare:field-ops:triage-system)
  ✓ Key resolution (signing-key-2026-q1)
  ✓ Signature verification (Ed25519 valid)

Conclusion: Evidence cryptographically authentic and integrity verified.
```

JSON format:
```json
{
  "command": "verify",
  "status": "success",
  "outcome": "SECURE_PASS",
  "input": "secure-receipt.json",
  "verification": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "issuer": "org:gazacare:field-ops:triage-system",
    "key_id": "signing-key-2026-q1",
    "checks_passed": 8,
    "checks_failed": 0,
    "failure_codes": [],
    "duration_ms": 42
  },
  "exit_code": 0
}
```

Failure example (JSON):
```json
{
  "command": "verify",
  "status": "failure",
  "outcome": "SECURE_FAIL",
  "input": "tampered-receipt.json",
  "verification": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "checks_passed": 3,
    "checks_failed": 1,
    "failure_codes": [
      {
        "code": "SEC-004",
        "name": "HASH_MISMATCH",
        "severity": "CRITICAL",
        "step": 4
      }
    ],
    "duration_ms": 18
  },
  "exit_code": 1
}
```

**Exit Codes:**
- `0` — Verification passed (SECURE_PASS)
- `1` — Verification failed (SECURE_FAIL)
- `2` — Invalid input file
- `3` — Configuration error (missing registry or key)
- `4` — Runtime error (registry unreachable)

**Example:**

```bash
# Verify with registry
secure verify examples/gazacare-demo/secure-receipt.json \
  --registry ~/.digiemu-secure/registry.json

# Verify with explicit public key
secure verify examples/gazacare-demo/secure-receipt.json \
  --public-key ~/.keys/gazacare-signing.pub
```

### secure bundle create

Create a complete evidence bundle from input event.

**Syntax:**

```
secure bundle create <input-file> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `input-file` | Yes | Path to input event JSON |

**Options:**

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--issuer` | Yes | Issuer identifier | - |
| `--key-id` | Yes | Key identifier | - |
| `--private-key` | Yes | Path to private key file | - |
| `--output` | No | Output path for bundle | stdout |
| `--include-report` | No | Include verification report | false |
| `--metadata` | No | Path to metadata JSON file | - |

**Output:**

Human format:
```
Creating bundle from: input-event.json
Canonicalizing snapshot...
Computing hash (SHA-256)...
Signing with: org:gazacare:field-ops:triage-system / signing-key-2026-q1
Bundle created: BNDL-2026-0847-001-A7F3-9X2M
Components:
  - Canonical snapshot
  - Snapshot hash
  - Signed receipt
Output: evidence-bundle.json
```

JSON format:
```json
{
  "command": "bundle create",
  "status": "success",
  "input": "input-event.json",
  "bundle": {
    "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "issuer": "org:gazacare:field-ops:triage-system",
    "snapshot_hash": "a3f5c8e9...",
    "components": ["snapshot", "hash", "receipt"],
    "output_path": "evidence-bundle.json"
  },
  "exit_code": 0
}
```

**Exit Codes:**
- `0` — Bundle created successfully
- `2` — Input file invalid
- `3` — Signing configuration error
- `4` — Bundle creation failed

**Example:**

```bash
secure bundle create examples/gazacare-demo/input-event.json \
  --issuer org:gazacare:field-ops:triage-system \
  --key-id signing-key-2026-q1 \
  --private-key ~/.keys/gazacare-signing.key \
  --include-report \
  --output examples/gazacare-demo/complete-bundle.json
```

### secure bundle verify

Verify a complete evidence bundle.

**Syntax:**

```
secure bundle verify <bundle-file> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `bundle-file` | Yes | Path to evidence bundle JSON |

**Options:**

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--registry` | No | Path to issuer registry | `~/.digiemu-secure/registry.json` |
| `--report-output` | No | Path to save verification report | - |
| `--strict` | No | Fail on warnings | false |

**Output:**

Human format:
```
Verifying bundle: evidence-bundle.json
Bundle ID: BNDL-2026-0847-001-A7F3-9X2M
Receipt ID: RCPT-2026-0847-001-A7F3

Verification: SECURE_PASS ✓

Step-by-step results:
  1. Bundle structure        PASS
  2. Bundle version        PASS (0.4)
  3. Canonical snapshot      PASS
  4. Snapshot hash         PASS (SHA-256 verified)
  5. Receipt structure       PASS
  6. Issuer resolution     PASS (org:gazacare:field-ops:triage-system)
  7. Key resolution        PASS (signing-key-2026-q1, active)
  8. Signature verification  PASS (Ed25519 valid)
  9. Report consistency      PASS (matches bundled report)
 10. Outcome generation     PASS

Summary:
  Total checks: 10
  Passed: 10
  Failed: 0
  Duration: 52ms

Conclusion: Evidence bundle is authentic and untampered.
```

JSON format:
```json
{
  "command": "bundle verify",
  "status": "success",
  "outcome": "SECURE_PASS",
  "input": "evidence-bundle.json",
  "bundle": {
    "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
    "receipt_id": "RCPT-2026-0847-001-A7F3"
  },
  "verification": {
    "checks": [
      {"step": 1, "check": "BUNDLE_STRUCTURE", "status": "PASS"},
      {"step": 2, "check": "BUNDLE_VERSION", "status": "PASS"},
      {"step": 3, "check": "CANONICAL_SNAPSHOT", "status": "PASS"},
      {"step": 4, "check": "SNAPSHOT_HASH", "status": "PASS"},
      {"step": 5, "check": "RECEIPT_STRUCTURE", "status": "PASS"},
      {"step": 6, "check": "ISSUER_RESOLUTION", "status": "PASS"},
      {"step": 7, "check": "KEY_RESOLUTION", "status": "PASS"},
      {"step": 8, "check": "SIGNATURE_VERIFICATION", "status": "PASS"},
      {"step": 9, "check": "REPORT_CONSISTENCY", "status": "PASS"},
      {"step": 10, "check": "OUTCOME_GENERATION", "status": "PASS"}
    ],
    "summary": {
      "total": 10,
      "passed": 10,
      "failed": 0,
      "duration_ms": 52
    },
    "report_path": "verification-report.json"
  },
  "exit_code": 0
}
```

**Exit Codes:**
- `0` — Bundle verified successfully
- `1` — Verification failed (see failure_codes)
- `2` — Invalid bundle file
- `3` — Registry configuration error
- `4` — Runtime error

**Example:**

```bash
secure bundle verify examples/gazacare-demo/complete-bundle.json \
  --registry ~/.digiemu-secure/registry.json \
  --report-output verification-report.json
```

### secure registry validate

Validate issuer registry file format and content.

**Syntax:**

```
secure registry validate <registry-file> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `registry-file` | Yes | Path to registry JSON file |

**Options:**

| Option | Required | Description | Default |
|--------|----------|-------------|---------|
| `--check-keys` | No | Validate all public keys | false |
| `--strict` | No | Fail on warnings | false |

**Output:**

Human format:
```
Validating registry: registry.json
Registry version: 0.3

Issuers: 3
  ✓ org:gazacare:field-ops:triage-system
  ✓ org:example:division:service
  ⚠ org:example:division:staging (test keys in production)

Keys: 5
  ✓ 5 active
  ✓ 0 expired
  ✓ 0 revoked

Validation: PASSED
```

JSON format:
```json
{
  "command": "registry validate",
  "status": "success",
  "registry": {
    "path": "registry.json",
    "version": "0.3",
    "issuers": {
      "total": 3,
      "valid": 2,
      "warnings": 1
    },
    "keys": {
      "total": 5,
      "active": 5,
      "expired": 0,
      "revoked": 0
    }
  },
  "valid": true,
  "exit_code": 0
}
```

**Exit Codes:**
- `0` — Registry valid
- `1` — Registry invalid (errors found)
- `2` — File not found or unreadable
- `3` — Invalid registry format

**Example:**

```bash
secure registry validate ~/.digiemu-secure/registry.json --check-keys
```

### secure trust-anchor validate

Validate trust anchor configuration.

**Syntax:**

```
secure trust-anchor validate <trust-anchor-file> [options]
```

**Arguments:**

| Argument | Required | Description |
|----------|----------|-------------|
| `trust-anchor-file` | Yes | Path to trust anchor JSON |

**Output:**

Human format:
```
Validating trust anchor: trust-anchor.json
Version: 0.3
Issuer: org:gazacare:field-ops:triage-system
Key ID: signing-key-2026-q1
Public key: valid Ed25519 key (32 bytes)
Status: active
Validity: 2026-01-01 to 2026-06-30

Validation: PASSED
```

JSON format:
```json
{
  "command": "trust-anchor validate",
  "status": "success",
  "trust_anchor": {
    "path": "trust-anchor.json",
    "version": "0.3",
    "issuer": "org:gazacare:field-ops:triage-system",
    "key_id": "signing-key-2026-q1",
    "public_key_valid": true,
    "status": "active",
    "valid": true
  },
  "exit_code": 0
}
```

**Exit Codes:**
- `0` — Trust anchor valid
- `1` — Trust anchor invalid
- `2` — File not found

**Example:**

```bash
secure trust-anchor validate ~/.digiemu-secure/trust-anchors/gazacare.json
```

## Relationship to Other Profiles

### Verification Profile

CLI commands implement the Verification Profile:

| CLI Command | Verification Profile Steps |
|-------------|---------------------------|
| `secure verify` | Steps 1-8 (receipt verification) |
| `secure bundle verify` | Steps 1-10 (full bundle verification) |

The CLI output format matches the Verification Report Profile when `--format json` is used.

### Conformance Profile

CLI conformance aligns with tier requirements:

| Tier | CLI Commands Required |
|------|----------------------|
| **Tier 1** | `secure verify` (receipt-only) |
| **Tier 2** | `secure verify`, `secure registry validate` |
| **Tier 3** | All commands: `sign`, `verify`, `bundle create`, `bundle verify`, `registry validate` |

## Machine-Readable Output Schema

All JSON output follows this schema:

```json
{
  "command": "string",
  "status": "success" | "failure",
  "exit_code": 0 | 1 | 2 | 3 | 4,
  "input": "string",
  "outcome": "SECURE_PASS" | "SECURE_FAIL" | "SECURE_INCOMPLETE" | null,
  "error": {
    "code": "string",
    "message": "string"
  },
  "verification": {
    "checks": [...],
    "summary": {...},
    "failure_codes": [...]
  }
}
```

## Configuration File

Default configuration file location: `~/.digiemu-secure/config.json`

```json
{
  "config_version": "0.6",
  "default_registry": "~/.digiemu-secure/registry.json",
  "default_format": "human",
  "issuers": {
    "org:gazacare:field-ops:triage-system": {
      "private_key": "~/.keys/gazacare-signing.key"
    }
  },
  "logging": {
    "level": "info",
    "file": "~/.digiemu-secure/logs/secure.log"
  }
}
```

## Error Message Format

Human-readable error messages follow this format:

```
ERROR [<code>]: <message>
  Context: <additional context>
  Suggestion: <how to fix>
```

Example:
```
ERROR [SEC-006]: Issuer not found in registry
  Context: issuer_id='org:unknown:division'
  Suggestion: Add issuer to registry or verify identifier spelling
```

## Summary

| Aspect | Specification |
|--------|---------------|
| **Commands** | 6 normative commands |
| **Exit codes** | 5 standard codes |
| **Output formats** | Human and JSON |
| **Configuration** | JSON config file support |
| **Conformance** | Tier 1, 2, 3 alignment |

The CLI profile provides a consistent, scriptable interface for all DigiEmu Secure operations.
