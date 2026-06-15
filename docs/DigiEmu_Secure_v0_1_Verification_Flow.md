# DigiEmu Secure v0.1 Verification Flow

## Verification Steps

A verifier SHOULD perform the following checks:

1. Validate receipt structure.
2. Confirm supported `receipt_version`.
3. Confirm supported `core_profile`.
4. Recompute snapshot hash if snapshot content is available.
5. Compare recomputed hash with `snapshot_hash`.
6. Resolve issuer `key_id` to known public key.
7. Rebuild canonical signing payload.
8. Verify Ed25519 signature.
9. Return a structured verification report.

## Verification Outcomes

- `SECURE_PASS`
- `SECURE_FAIL`
- `SECURE_INDETERMINATE`

## Failure Examples

- unknown key
- invalid signature
- malformed receipt
- unsupported profile
- snapshot hash mismatch
