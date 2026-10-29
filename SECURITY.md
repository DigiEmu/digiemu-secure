# Security Policy

## Supported Versions

DigiEmu Secure v0.1 is an early draft and is not yet production-ready.

**Status (2026-10-29): EXPERIMENTAL / TECHNICAL REVIEW — NOT PRODUCTION READY.** No version of this repository is supported for production or trusted deployment. Version strings in the package (`0.1.0`), README (`v0.7.2`), API (`0.9.0`) and historical documents are not yet unified.

## Reporting Security Issues

Please report security issues privately to the DigiEmu maintainers before public disclosure.

## Current Security Boundary

v0.1 focuses on evidence artifact protection:

- receipt integrity
- snapshot hash binding
- issuer declaration
- signature verification

It does not yet provide full operational security, HSM-backed key management, or enterprise-grade audit storage.

## Known Security Limitations

The following limitations are present in the current implementation (branch `fix/rfc8785-canonicalization`, documented 2026-10-29). They are relevant to **any trusted deployment** and **must be resolved, or explicitly controlled and documented, before any trusted proof of concept**. Ordinary source-code review and experimentation are not affected.

1. **Bundled public keys can produce `SECURE_PASS` without independent issuer trust.** When strict registry mode is disabled (the default for both the CLI and the HTTP API), the verifier uses the `public_key` embedded in the bundle. Anyone can generate a key pair, sign arbitrary content and obtain `SECURE_PASS`. Control: always use `--strict-registry` (CLI) or `"strict_registry": true` (API) together with a configured registry and trust-anchor set. (`src/bundle-verifier.ts`, bundled-key fallback in Step 6–8.)

2. **Registry signature verification (SEC-014) is not implemented.** The failure code is defined but never emitted, and the registry format carries no signature. Registry and trust-anchor files are trusted as read from disk; their integrity must be protected out of band.

3. **Bundle signatures do not cover all receipt metadata.** In the Evidence Bundle v0.4 scheme, Ed25519 signs only the SHA-256 digest of the canonical snapshot. `issuer`, `key_id`, `signed_at`, `receipt_id` and `bundle_id` are not signed; changes to them are not detected by signature verification (in registry mode, `issuer` and `key_id` only influence which public key is resolved).

4. **Strict registry mode is not safely isolated per HTTP request.** A request with `"strict_registry": true` enables strict mode on a verifier instance shared by all requests, and it is not reset. Requests made before any strict request run in permissive mode; later requests inherit strict mode. (`src/api.ts`, `handleVerify`.)

5. **Production key management is not implemented.** The CLI `sign` and `bundle create` commands and the example signing script generate a new ephemeral Ed25519 key pair on every run and discard the private key. `DIGIEMU_SECURE_PRIVATE_KEY_PATH` in `.env.example` is not read by any code. There is no HSM/KMS integration, key rotation or key revocation tooling.

6. **Existing registry and trust-anchor fixtures include expired or inconsistent material.** In `examples/sample-trust-anchors.json`, the primary anchor's validity ended on 2026-06-30, and other entries contain non-key placeholder values. The registry key for the example issuer does not match the key in `examples/valid-bundle.json`. These files are illustrative only and must not be used as trust configuration.

7. **Existing signing profiles are not interchangeable.** Evidence Bundle v0.4 signs the 32-byte SHA-256 digest of the canonical snapshot (hex signature, raw base64 key); Secure Receipt v0.1 signs the canonical receipt bytes directly (base64 signature, PEM key). A signature produced under one scheme does not verify under the other. See the [Canonical JSON Profile](docs/DigiEmu_Secure_v0_2_Canonical_JSON_Profile.md#hash-and-signature-contracts).

8. **Document-hash interoperability does not establish Core HashV1 interoperability.** A matching document-level SHA-256 digest for a synthetic bundle has been reported between DigiEmu Core and Secure (test artifacts not included in this repository), but Core HashV1 is computed over a Core-specific StateV1 envelope (as described for DigiEmu Core; not verified from this repository), and general compatibility between Secure's RFC 8785 profile and Core's `digiemu-canonical-json-v1` has not been demonstrated. Core HashV1 values and Secure document hashes must not be treated as equivalent.

Additional notes:

- Integers outside the IEEE-754 safe range (±2^53 − 1) may be silently rounded during parsing; encode large integers as strings.
- The HTTP API has no rate limiting and allows all CORS origins.
- `docs/DigiEmu_Secure_v1_0_Security_Review.md` is a historical internal review. Its "Production Ready" and "Independent Security Assessment" statements are not supported and have been qualified in that document.
- No independent security assessment, penetration test, certification or regulatory approval is documented in this repository; none should be assumed.
