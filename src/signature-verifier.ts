/**
 * DigiEmu Secure Signature Verifier Prototype
 *
 * Minimal Ed25519 signature verification implementation.
 * Verifies that evidence was signed by the claimed issuer.
 *
 * This is an educational prototype demonstrating signature verification
 * as defined in DigiEmu_Secure_v0_4_Verification_Profile.md (Step 8)
 */

import { createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './canonical-json.js';
import { sha256Hex } from './hash-utils.js';

// Types
interface SignatureVerificationResult {
  outcome: 'PASS' | 'FAIL';
  valid: boolean;
  error?: string;
  details?: string;
}

interface SignatureComponents {
  snapshot: unknown;
  signature: string;
  publicKey: string;
  algorithm: 'Ed25519';
}

/**
 * Signature Verifier class
 *
 * Verifies Ed25519 signatures on canonical snapshots.
 */
class SignatureVerifier {
  /**
   * Verify an Ed25519 signature
   *
   * Process:
   * 1. Canonicalize the snapshot
   * 2. Compute SHA-256 hash (as done during signing)
   * 3. Import the public key
   * 4. Verify the signature
   *
   * @param snapshot The canonical snapshot that was signed
   * @param signature Base64-encoded Ed25519 signature
   * @param publicKey Base64-encoded Ed25519 public key (32 bytes)
   * @returns Verification result
   */
  verifySignature(
    snapshot: unknown,
    signature: string,
    publicKey: string
  ): SignatureVerificationResult {
    try {
      // Step 1: Canonicalize the snapshot
      const canonical = canonicalJson(snapshot);

      // Step 2: Compute the hash (same as signing process)
      const message = sha256Hex(canonical);

      // Step 3: Import the public key
      // Ed25519 public keys are 32 bytes, base64 encoded
      const publicKeyBuffer = Buffer.from(publicKey, 'base64');

      if (publicKeyBuffer.length !== 32) {
        return {
          outcome: 'FAIL',
          valid: false,
          error: 'INVALID_PUBLIC_KEY',
          details: `Ed25519 public key must be 32 bytes, got ${publicKeyBuffer.length}`
        };
      }

      // Create a SubjectPublicKeyInfo structure for Node.js crypto
      // This is required because Node.js crypto expects PKCS#8 or SPKI format
      const publicKeyObject = createPublicKey({
        key: Buffer.concat([
          // SPKI prefix for Ed25519
          Buffer.from('302a300506032b6570032100', 'hex'),
          publicKeyBuffer
        ]),
        format: 'der',
        type: 'spki'
      });

      // Step 4: Verify the signature
      const signatureBuffer = Buffer.from(signature, 'hex');

      const isValid = verify(
        null, // Let Node.js determine algorithm from key
        Buffer.from(message, 'hex'),
        publicKeyObject,
        signatureBuffer
      );

      if (isValid) {
        return {
          outcome: 'PASS',
          valid: true,
          details: 'Ed25519 signature verified successfully'
        };
      } else {
        return {
          outcome: 'FAIL',
          valid: false,
          error: 'SIGNATURE_INVALID',
          details: 'Signature does not match the message'
        };
      }
    } catch (error) {
      return {
        outcome: 'FAIL',
        valid: false,
        error: 'VERIFICATION_ERROR',
        details: `Signature verification failed: ${error}`
      };
    }
  }

  /**
   * Verify signature using bundle components
   *
   * Extracts necessary components from an evidence bundle
   */
  verifyBundleSignature(bundle: {
    canonical_snapshot: unknown;
    snapshot_hash?: { value: string };
    signed_receipt: {
      signature: {
        signature_value: string;
        public_key: string;
        algorithm: string;
      };
    };
  }): SignatureVerificationResult {
    // Validate algorithm
    if (bundle.signed_receipt.signature.algorithm !== 'Ed25519') {
      return {
        outcome: 'FAIL',
        valid: false,
        error: 'ALGORITHM_UNSUPPORTED',
        details: `Algorithm ${bundle.signed_receipt.signature.algorithm} not supported`
      };
    }

    // Verify hash matches (extra safety check)
    if (bundle.snapshot_hash) {
      const canonical = canonicalJson(bundle.canonical_snapshot);
      const computedHash = sha256Hex(canonical);
      const storedHash = bundle.snapshot_hash.value;

      if (computedHash !== storedHash) {
        return {
          outcome: 'FAIL',
          valid: false,
          error: 'HASH_MISMATCH',
          details: 'Snapshot hash mismatch - evidence may be tampered'
        };
      }
    }

    // Verify signature
    return this.verifySignature(
      bundle.canonical_snapshot,
      bundle.signed_receipt.signature.signature_value,
      bundle.signed_receipt.signature.public_key
    );
  }
}

/**
 * Generate an Ed25519 key pair
 *
 * Uses Node.js crypto for real Ed25519 key generation.
 * Returns raw 32-byte public key (base64) and private key object.
 */
function generateTestKeyPair(): { publicKey: string; privateKey: crypto.KeyObject } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  // Export public key in raw format (32 bytes)
  // This matches the format expected by our verifier
  const publicKeyRaw = publicKey.export({ format: 'jwk' });
  const publicKeyBytes = Buffer.concat([
    Buffer.from(publicKeyRaw.x!, 'base64url')
  ]);

  return {
    publicKey: publicKeyBytes.toString('base64'),
    privateKey
  };
}

// Need to import crypto for types
import * as crypto from 'node:crypto';

/**
 * Create an Ed25519 signature
 *
 * Signs the canonical JSON content with the private key.
 * Returns hex-encoded signature (64 bytes = 128 hex chars).
 */
function createSignature(
  snapshot: unknown,
  privateKey: crypto.KeyObject
): string {
  // 1. Canonicalize snapshot
  const canonical = canonicalJson(snapshot);

  // 2. Hash it (same as verification process)
  const message = sha256Hex(canonical);

  // 3. Sign with Ed25519 private key
  const signature = sign(null, Buffer.from(message, 'hex'), privateKey);

  // 4. Return hex-encoded signature
  return signature.toString('hex');
}

// Example usage and demonstration
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  console.log('='.repeat(60));
  console.log('DigiEmu Secure Signature Verifier Prototype');
  console.log('='.repeat(60));
  console.log();

  const verifier = new SignatureVerifier();

  // Test data
  const testSnapshot = {
    event_type: 'TRIAGE_ASSESSMENT',
    event_id: 'TRG-2026-0847-001',
    timestamp: '2026-01-15T14:32:17Z',
    patient_id: 'P-2026-0847',
    triage_level: 'YELLOW'
  };

  // Generate a real Ed25519 key pair for testing
  const keyPair = generateTestKeyPair();
  const publicKey = keyPair.publicKey;
  const privateKey = keyPair.privateKey;

  console.log('1. Valid Signature Verification');
  console.log('   Scenario: Evidence signed by legitimate issuer');
  console.log();

  // Sign the snapshot with private key
  const validSignature = createSignature(testSnapshot, privateKey);

  console.log(`   Snapshot: ${JSON.stringify(testSnapshot).substring(0, 50)}...`);
  console.log(`   Public Key: ${publicKey.substring(0, 20)}... (32 bytes, base64)`);
  console.log(`   Signature: ${validSignature.substring(0, 30)}... (64 bytes, hex)`);
  console.log();

  // Verify with public key
  const validResult = verifier.verifySignature(testSnapshot, validSignature, publicKey);

  console.log(`   Result: ${validResult.outcome}`);
  if (validResult.details) {
    console.log(`   Details: ${validResult.details}`);
  }
  console.log();

  console.log('2. Tampered Content Verification');
  console.log('   Scenario: Evidence was modified after signing');
  console.log();

  const tamperedSnapshot = {
    ...testSnapshot,
    triage_level: 'RED' // Changed from YELLOW
  };

  // Try to verify original signature against tampered content
  const tamperedResult = verifier.verifySignature(tamperedSnapshot, validSignature, publicKey);

  console.log(`   Original: triage_level = "${testSnapshot.triage_level}"`);
  console.log(`   Tampered: triage_level = "${tamperedSnapshot.triage_level}"`);
  console.log(`   Using same signature...`);
  console.log();
  console.log(`   Result: ${tamperedResult.outcome}`);
  if (tamperedResult.error) {
    console.log(`   Error: ${tamperedResult.error}`);
  }
  console.log();

  console.log('3. Wrong Public Key Verification');
  console.log('   Scenario: Verifier uses wrong public key');
  console.log();

  const wrongPublicKey = 'x9Yz0a1Bc2De3Fg4Hi5Jk6Lm7No8Pq9Rs0Tu1Vw2Xy3=';

  const wrongKeyResult = verifier.verifySignature(testSnapshot, validSignature, wrongPublicKey);

  console.log(`   Correct Public Key: ${publicKey.substring(0, 20)}...`);
  console.log(`   Wrong Public Key: ${wrongPublicKey.substring(0, 20)}...`);
  console.log();
  console.log(`   Result: ${wrongKeyResult.outcome}`);
  if (wrongKeyResult.error) {
    console.log(`   Error: ${wrongKeyResult.error}`);
  }
  console.log();

  console.log('4. Algorithm Validation');
  console.log('   Scenario: Bundle with unsupported algorithm');
  console.log();

  const bundleWithWrongAlgorithm = {
    canonical_snapshot: testSnapshot,
    snapshot_hash: { value: sha256Hex(canonicalJson(testSnapshot)) },
    signed_receipt: {
      signature: {
        algorithm: 'RSA-2048', // Not Ed25519
        signature_value: validSignature,
        public_key: publicKey
      }
    }
  };

  const algoResult = verifier.verifyBundleSignature(bundleWithWrongAlgorithm);

  console.log(`   Algorithm: RSA-2048 (not Ed25519)`);
  console.log(`   Result: ${algoResult.outcome}`);
  if (algoResult.error) {
    console.log(`   Error: ${algoResult.error}`);
  }
  console.log();

  console.log('5. Hash Mismatch Detection');
  console.log('   Scenario: Snapshot hash does not match content');
  console.log();

  const bundleWithHashMismatch = {
    canonical_snapshot: testSnapshot,
    snapshot_hash: { value: '0000000000000000000000000000000000000000000000000000000000000000' },
    signed_receipt: {
      signature: {
        algorithm: 'Ed25519',
        signature_value: validSignature,
        public_key: publicKey
      }
    }
  };

  const hashMismatchResult = verifier.verifyBundleSignature(bundleWithHashMismatch);

  console.log(`   Stored hash: 00000000000000000000000000000000...`);
  console.log(`   Computed: ${sha256Hex(canonicalJson(testSnapshot)).substring(0, 32)}...`);
  console.log(`   Result: ${hashMismatchResult.outcome}`);
  if (hashMismatchResult.error) {
    console.log(`   Error: ${hashMismatchResult.error}`);
  }
  console.log();

  console.log('='.repeat(60));
  console.log('Signature verifier demonstration complete');
  console.log('='.repeat(60));
  console.log();
  console.log('This prototype demonstrates:');
  console.log('- Ed25519 signature verification interface');
  console.log('- Integration with canonical JSON and SHA-256');
  console.log('- Error handling for various failure modes');
  console.log('- Algorithm validation (Ed25519 only)');
  console.log('- Hash mismatch detection before signature verification');
  console.log();
  console.log('Implementation highlights:');
  console.log('- Uses Node.js crypto for real Ed25519 operations');
  console.log('- Signs SHA-256 hash of canonical JSON');
  console.log('- 64-byte signatures, 32-byte public keys');
  console.log('- Supports key resolution from registry (production)');
  console.log();
  console.log('See docs/DigiEmu_Secure_v0_4_Verification_Profile.md');
  console.log('for the full signature verification specification.');
}

export { SignatureVerifier };
export type { SignatureVerificationResult, SignatureComponents };
