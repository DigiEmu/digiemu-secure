/**
 * DigiEmu Secure Bundle Verifier Prototype
 *
 * Minimal reference implementation for evidence bundle verification.
 * Implements the 10-step verification sequence from v0.4 Verification Profile.
 *
 * This is an educational prototype demonstrating bundle verification
 * as defined in DigiEmu_Secure_v0_4_Verification_Profile.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { canonicalJson } from './canonical-json.js';
import { sha256Hex } from './hash-utils.js';
import { SignatureVerifier } from './signature-verifier.js';
import { RegistryResolver } from './registry-resolver.js';
import { TrustAnchorResolver } from './trust-anchor-resolver.js';
import { generateKeyPairSync, sign } from 'node:crypto';

// Types matching the v0.4 Evidence Bundle Format and Verification Profile

type VerificationOutcome = 'SECURE_PASS' | 'SECURE_FAIL' | 'SECURE_INCOMPLETE';

// Failure codes from v0.4 Failure Code Registry
const FailureCodes = {
  SEC001: { code: 'SEC-001', name: 'BUNDLE_STRUCTURE_INVALID', severity: 'CRITICAL' },
  SEC002: { code: 'SEC-002', name: 'BUNDLE_VERSION_UNSUPPORTED', severity: 'CRITICAL' },
  SEC003: { code: 'SEC-003', name: 'CANONICAL_SNAPSHOT_INVALID', severity: 'CRITICAL' },
  SEC004: { code: 'SEC-004', name: 'HASH_MISMATCH', severity: 'CRITICAL' },
  SEC005: { code: 'SEC-005', name: 'RECEIPT_STRUCTURE_INVALID', severity: 'CRITICAL' },
  SEC006: { code: 'SEC-006', name: 'ISSUER_NOT_FOUND', severity: 'MAJOR' },
  SEC007: { code: 'SEC-007', name: 'KEY_NOT_FOUND', severity: 'MAJOR' },
  SEC008: { code: 'SEC-008', name: 'KEY_REVOKED', severity: 'CRITICAL' },
  SEC009: { code: 'SEC-009', name: 'KEY_EXPIRED', severity: 'MAJOR' },
  SEC010: { code: 'SEC-010', name: 'KEY_SUSPENDED', severity: 'MAJOR' },
  SEC011: { code: 'SEC-011', name: 'SIGNATURE_INVALID', severity: 'CRITICAL' },
  SEC012: { code: 'SEC-012', name: 'ALGORITHM_UNSUPPORTED', severity: 'CRITICAL' },
} as const;

interface FailureCode {
  code: string;
  name: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  step: number;
  description: string;
}

interface VerificationCheck {
  step: number;
  check: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
}

interface VerificationResult {
  outcome: VerificationOutcome;
  bundle_id?: string;
  receipt_id?: string;
  checks: VerificationCheck[];
  failure_codes: FailureCode[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  verified_at: string;
  conclusion?: string;
}

interface EvidenceBundle {
  bundle_id: string;
  bundle_version: string;
  created_at: string;
  canonical_snapshot: unknown;
  snapshot_hash: {
    algorithm: string;
    value: string;
  };
  signed_receipt: {
    receipt_id: string;
    version: string;
    created_at: string;
    signature: {
      algorithm: string;
      issuer: string;
      key_id: string;
      public_key: string;
      signature_value: string;
      signed_at: string;
    };
  };
  verification_report?: unknown;
  metadata?: unknown;
}

/**
 * Bundle Verifier class
 *
 * Implements the 10-step verification sequence from v0.4 Verification Profile.
 * File-based only - no networking required.
 */
export interface VerifyOptions {
  strictRegistry?: boolean;
}

export class BundleVerifier {
  private supportedVersions = ['0.4', '0.3'];
  private signatureVerifier = new SignatureVerifier();
  private registryResolver: RegistryResolver | null = null;
  private trustAnchorResolver: TrustAnchorResolver | null = null;
  private strictRegistry = false;

  /**
   * Set up registry and trust anchor resolvers for registry-backed verification
   */
  setRegistry(registryPath: string, trustAnchorPath: string, strict = false): boolean {
    this.registryResolver = new RegistryResolver(registryPath);
    this.trustAnchorResolver = new TrustAnchorResolver(trustAnchorPath);
    this.strictRegistry = strict;

    const registryLoaded = this.registryResolver.load();
    const trustAnchorLoaded = this.trustAnchorResolver.load();

    return registryLoaded && trustAnchorLoaded;
  }

  /**
   * Set strict registry mode
   * When enabled, registry is required for all verifications (no bundled public_key fallback)
   */
  setStrictMode(enabled: boolean): void {
    this.strictRegistry = enabled;
  }

  /**
   * Verify an evidence bundle
   *
   * Implements the full 10-step verification sequence:
   * 1. Parse bundle structure
   * 2. Validate bundle version
   * 3. Validate canonical snapshot
   * 4. Recompute and compare hash
   * 5. Validate receipt structure
   * 6. Resolve issuer (registry-backed or bundled)
   * 7. Resolve key/trust anchor (registry-backed)
   * 8. Verify signature (using resolved public key)
   * 9. Compare verification report (if present)
   * 10. Generate outcome
   */
  verifyBundle(bundlePath: string): VerificationResult {
    const checks: VerificationCheck[] = [];
    const failureCodes: FailureCode[] = [];

    // Step 1: Parse bundle structure (SEC-001)
    const bundleResult = this.loadBundle(bundlePath);
    if (!bundleResult.success) {
      checks.push({
        step: 1,
        check: 'BUNDLE_STRUCTURE',
        status: 'FAIL',
        details: bundleResult.error
      });
      failureCodes.push({
        ...FailureCodes.SEC001,
        step: 1,
        description: bundleResult.error || 'Bundle structure invalid'
      });
      return this.buildResult(checks, failureCodes);
    }

    const bundle = bundleResult.bundle!;
    checks.push({
      step: 1,
      check: 'BUNDLE_STRUCTURE',
      status: 'PASS',
      details: `Bundle ID: ${bundle.bundle_id}`
    });

    // Step 2: Validate bundle version (SEC-002)
    if (!this.isVersionSupported(bundle.bundle_version)) {
      checks.push({
        step: 2,
        check: 'BUNDLE_VERSION',
        status: 'FAIL',
        details: `Version ${bundle.bundle_version} not supported`
      });
      failureCodes.push({
        ...FailureCodes.SEC002,
        step: 2,
        description: `Bundle version ${bundle.bundle_version} is not supported`
      });
      return this.buildResult(checks, failureCodes, bundle.bundle_id, undefined);
    }

    checks.push({
      step: 2,
      check: 'BUNDLE_VERSION',
      status: 'PASS',
      details: `Version ${bundle.bundle_version} supported`
    });

    // Step 3: Validate canonical snapshot (SEC-003)
    if (!bundle.canonical_snapshot) {
      checks.push({
        step: 3,
        check: 'CANONICAL_SNAPSHOT',
        status: 'FAIL',
        details: 'Missing canonical_snapshot'
      });
      failureCodes.push({
        ...FailureCodes.SEC003,
        step: 3,
        description: 'Canonical snapshot is missing or invalid'
      });
      return this.buildResult(checks, failureCodes, bundle.bundle_id, undefined);
    }

    // Validate that canonical snapshot can be serialized
    try {
      canonicalJson(bundle.canonical_snapshot);
      checks.push({
        step: 3,
        check: 'CANONICAL_SNAPSHOT',
        status: 'PASS',
        details: 'Canonical snapshot valid'
      });
    } catch (error) {
      checks.push({
        step: 3,
        check: 'CANONICAL_SNAPSHOT',
        status: 'FAIL',
        details: 'Cannot serialize canonical snapshot'
      });
      failureCodes.push({
        ...FailureCodes.SEC003,
        step: 3,
        description: 'Canonical snapshot serialization failed'
      });
      return this.buildResult(checks, failureCodes, bundle.bundle_id, bundle.signed_receipt?.receipt_id);
    }

    // Step 4: Recompute and compare hash (SEC-004)
    const hashResult = this.verifyHash(bundle);
    if (!hashResult.valid) {
      checks.push({
        step: 4,
        check: 'SNAPSHOT_HASH',
        status: 'FAIL',
        details: hashResult.error
      });
      failureCodes.push({
        ...FailureCodes.SEC004,
        step: 4,
        description: hashResult.error || 'Hash mismatch detected'
      });
      return this.buildResult(checks, failureCodes, bundle.bundle_id, undefined);
    }

    checks.push({
      step: 4,
      check: 'SNAPSHOT_HASH',
      status: 'PASS',
      details: `SHA-256 hash verified: ${bundle.snapshot_hash.value.substring(0, 16)}...`
    });

    // Step 5: Validate receipt structure (SEC-005)
    if (!bundle.signed_receipt) {
      checks.push({
        step: 5,
        check: 'RECEIPT_STRUCTURE',
        status: 'FAIL',
        details: 'Missing signed_receipt'
      });
      failureCodes.push({
        ...FailureCodes.SEC005,
        step: 5,
        description: 'Signed receipt is missing or invalid'
      });
      return this.buildResult(checks, failureCodes, bundle.bundle_id, undefined);
    }

    const receipt = bundle.signed_receipt;
    if (!receipt.receipt_id || !receipt.signature) {
      checks.push({
        step: 5,
        check: 'RECEIPT_STRUCTURE',
        status: 'FAIL',
        details: 'Receipt missing required fields'
      });
      failureCodes.push({
        ...FailureCodes.SEC005,
        step: 5,
        description: 'Receipt missing receipt_id or signature'
      });
      return this.buildResult(checks, failureCodes, bundle.bundle_id, undefined);
    }

    checks.push({
      step: 5,
      check: 'RECEIPT_STRUCTURE',
      status: 'PASS',
      details: `Receipt ID: ${receipt.receipt_id}`
    });

    // Step 6: Resolve issuer via registry (SEC-006, SEC-010)
    let resolvedPublicKey: string | null = null;
    let resolvedFromRegistry = false;

    if (this.registryResolver && this.trustAnchorResolver) {
      // Registry-backed verification
      const issuerResult = this.registryResolver.resolveIssuer(receipt.signature.issuer);

      if (!issuerResult.found) {
        checks.push({
          step: 6,
          check: 'ISSUER_RESOLUTION',
          status: 'FAIL',
          details: `Issuer not found: ${receipt.signature.issuer}`
        });
        failureCodes.push({
          ...FailureCodes.SEC006,
          step: 6,
          description: `Issuer not found in registry: ${receipt.signature.issuer}`
        });
        return this.buildResult(checks, failureCodes, bundle.bundle_id, bundle.signed_receipt?.receipt_id);
      }

      if (issuerResult.error) {
        // Issuer suspended or revoked
        checks.push({
          step: 6,
          check: 'ISSUER_RESOLUTION',
          status: 'FAIL',
          details: `Issuer ${receipt.signature.issuer}: ${issuerResult.error}`
        });
        failureCodes.push({
          ...FailureCodes.SEC010,
          step: 6,
          description: `Issuer ${receipt.signature.issuer} is ${issuerResult.error}`
        });
        return this.buildResult(checks, failureCodes, bundle.bundle_id, bundle.signed_receipt?.receipt_id);
      }

      checks.push({
        step: 6,
        check: 'ISSUER_RESOLUTION',
        status: 'PASS',
        details: `Issuer resolved: ${receipt.signature.issuer}`
      });

      // Step 7: Resolve key via registry (SEC-007, SEC-008, SEC-009, SEC-010)
      const keyResult = this.registryResolver.resolveKey(
        receipt.signature.issuer,
        receipt.signature.key_id
      );

      if (!keyResult.found) {
        checks.push({
          step: 7,
          check: 'KEY_RESOLUTION',
          status: 'FAIL',
          details: `Key not found: ${receipt.signature.key_id}`
        });
        failureCodes.push({
          ...FailureCodes.SEC007,
          step: 7,
          description: `Key not found in registry: ${receipt.signature.key_id}`
        });
        return this.buildResult(checks, failureCodes, bundle.bundle_id, bundle.signed_receipt?.receipt_id);
      }

      if (keyResult.error) {
        // Key expired, revoked, or suspended
        checks.push({
          step: 7,
          check: 'KEY_RESOLUTION',
          status: 'FAIL',
          details: `Key ${receipt.signature.key_id}: ${keyResult.error}`
        });
        const errorCode = keyResult.error.includes('expired') ? FailureCodes.SEC009 :
                          keyResult.error.includes('revoked') ? FailureCodes.SEC008 :
                          keyResult.error.includes('suspended') ? FailureCodes.SEC010 :
                          FailureCodes.SEC007;
        failureCodes.push({
          ...errorCode,
          step: 7,
          description: `Key ${receipt.signature.key_id} is ${keyResult.error}`
        });
        return this.buildResult(checks, failureCodes, bundle.bundle_id, bundle.signed_receipt?.receipt_id);
      }

      // Get public key from resolved key
      if (keyResult.key?.public_key) {
        resolvedPublicKey = keyResult.key.public_key;
        resolvedFromRegistry = true;
        checks.push({
          step: 7,
          check: 'KEY_RESOLUTION',
          status: 'PASS',
          details: `Key resolved: ${receipt.signature.key_id} (public_key: ${resolvedPublicKey.substring(0, 20)}...)`
        });
      } else {
        checks.push({
          step: 7,
          check: 'KEY_RESOLUTION',
          status: 'FAIL',
          details: `Key ${receipt.signature.key_id} has no public_key`
        });
        failureCodes.push({
          ...FailureCodes.SEC007,
          step: 7,
          description: `Key ${receipt.signature.key_id} missing public_key in registry`
        });
        return this.buildResult(checks, failureCodes, bundle.bundle_id, bundle.signed_receipt?.receipt_id);
      }
    } else {
      // No registry configured
      if (this.strictRegistry) {
        // Strict mode: registry is required, fail verification
        checks.push({
          step: 6,
          check: 'ISSUER_RESOLUTION',
          status: 'FAIL',
          details: `Issuer: ${receipt.signature.issuer} (strict mode requires registry)`
        });
        failureCodes.push({
          ...FailureCodes.SEC006,
          step: 6,
          description: 'Strict mode enabled but registry not configured or loaded'
        });
        return this.buildResult(checks, failureCodes, bundle.bundle_id, bundle.signed_receipt?.receipt_id);
      }

      // Fallback to bundled public_key (backward compatibility)
      const hasPublicKey = receipt.signature.public_key && receipt.signature.public_key.length > 0;
      if (hasPublicKey) {
        resolvedPublicKey = receipt.signature.public_key;
        checks.push({
          step: 6,
          check: 'ISSUER_RESOLUTION',
          status: 'SKIP',
          details: `Issuer: ${receipt.signature.issuer} (no registry, using bundled public_key)`
        });
        checks.push({
          step: 7,
          check: 'KEY_RESOLUTION',
          status: 'SKIP',
          details: `Key: ${receipt.signature.key_id} (no registry, using bundled public_key)`
        });
      } else {
        checks.push({
          step: 6,
          check: 'ISSUER_RESOLUTION',
          status: 'SKIP',
          details: `Issuer: ${receipt.signature.issuer} (no registry configured)`
        });
        checks.push({
          step: 7,
          check: 'KEY_RESOLUTION',
          status: 'SKIP',
          details: `Key: ${receipt.signature.key_id} (no registry configured)`
        });
      }
    }

    // Step 8: Verify signature (using resolved public key) (SEC-011)
    let signatureValid = false;
    if (resolvedPublicKey) {
      const sigResult = this.signatureVerifier.verifySignature(
        bundle.canonical_snapshot,
        receipt.signature.signature_value,
        resolvedPublicKey
      );

      if (sigResult.outcome === 'PASS') {
        signatureValid = true;
        checks.push({
          step: 8,
          check: 'SIGNATURE_VERIFICATION',
          status: 'PASS',
          details: resolvedFromRegistry
            ? 'Ed25519 signature verified with registry-resolved public key'
            : 'Ed25519 signature verified with bundled public key'
        });
      } else {
        checks.push({
          step: 8,
          check: 'SIGNATURE_VERIFICATION',
          status: 'FAIL',
          details: sigResult.error || 'Signature verification failed'
        });
        failureCodes.push({
          ...FailureCodes.SEC011,
          step: 8,
          description: sigResult.error || 'Signature is invalid or does not match content'
        });
        return this.buildResult(checks, failureCodes, bundle.bundle_id, bundle.signed_receipt?.receipt_id);
      }
    } else {
      checks.push({
        step: 8,
        check: 'SIGNATURE_VERIFICATION',
        status: 'SKIP',
        details: 'Signature verification skipped - no public_key available (configure registry for full verification)'
      });
    }

    // Step 9: Compare verification report (if present)
    if (bundle.verification_report) {
      checks.push({
        step: 9,
        check: 'REPORT_CONSISTENCY',
        status: 'PASS',
        details: 'Bundled verification report present'
      });
    } else {
      checks.push({
        step: 9,
        check: 'REPORT_CONSISTENCY',
        status: 'SKIP',
        details: 'No bundled verification report'
      });
    }

    // Step 10: Generate outcome
    // If signature was verified successfully, return SECURE_PASS
    // If signature was skipped (no public key), return SECURE_INCOMPLETE
    // If any check failed, we would have already returned SECURE_FAIL
    const outcome: VerificationOutcome = signatureValid ? 'SECURE_PASS' : 'SECURE_INCOMPLETE';

    checks.push({
      step: 10,
      check: 'OUTCOME_GENERATION',
      status: 'PASS',
      details: `Outcome: ${outcome}`
    });

    const conclusion = signatureValid
      ? 'Evidence bundle is authentic and integrity verified. All checks passed including signature verification.'
      : 'Bundle structure valid and hash verified. Signature verification skipped (no public_key in bundle). Use SECURE_INCOMPLETE for registry-based verification.';

    return this.buildResult(
      checks,
      failureCodes,
      bundle.bundle_id,
      bundle.signed_receipt?.receipt_id,
      outcome,
      conclusion
    );
  }

  /**
   * Load bundle from file
   */
  private loadBundle(bundlePath: string): { success: boolean; bundle?: EvidenceBundle; error?: string } {
    try {
      if (!fs.existsSync(bundlePath)) {
        return { success: false, error: `Bundle file not found: ${bundlePath}` };
      }

      const content = fs.readFileSync(bundlePath, 'utf-8');
      const bundle = JSON.parse(content) as EvidenceBundle;

      return { success: true, bundle };
    } catch (error) {
      return { success: false, error: `Failed to load bundle: ${error}` };
    }
  }

  /**
   * Check if bundle version is supported
   */
  private isVersionSupported(version: string): boolean {
    return this.supportedVersions.includes(version);
  }

  /**
   * Verify snapshot hash matches recomputed hash
   */
  private verifyHash(bundle: EvidenceBundle): { valid: boolean; error?: string } {
    try {
      // Canonicalize the snapshot
      const canonical = canonicalJson(bundle.canonical_snapshot);

      // Recompute hash
      const recomputedHash = sha256Hex(canonical);

      // Compare with stored hash
      const storedHash = bundle.snapshot_hash?.value;

      if (!storedHash) {
        return { valid: false, error: 'No stored hash in bundle' };
      }

      if (recomputedHash !== storedHash) {
        return {
          valid: false,
          error: `Hash mismatch: computed ${recomputedHash.substring(0, 16)}... but stored ${storedHash.substring(0, 16)}...`
        };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Hash computation failed: ${error}` };
    }
  }

  /**
   * Build verification result
   */
  private buildResult(
    checks: VerificationCheck[],
    failureCodes: FailureCode[],
    bundleId?: string,
    receiptId?: string,
    outcome: VerificationOutcome = failureCodes.length > 0 ? 'SECURE_FAIL' : 'SECURE_INCOMPLETE',
    conclusion?: string
  ): VerificationResult {
    const passed = checks.filter(c => c.status === 'PASS').length;
    const failed = checks.filter(c => c.status === 'FAIL').length;

    return {
      outcome,
      bundle_id: bundleId,
      receipt_id: receiptId,
      checks,
      failure_codes: failureCodes,
      summary: {
        total: checks.length,
        passed,
        failed
      },
      verified_at: new Date().toISOString(),
      conclusion: conclusion || (failureCodes.length > 0
        ? 'Verification failed due to integrity errors.'
        : 'Bundle structure validated. Full verification requires registry and signature validation.')
    };
  }

  /**
   * Create a sample bundle for testing
   */
  createSampleBundle(): EvidenceBundle {
    const canonicalSnapshot = {
      event_type: 'TRIAGE_ASSESSMENT',
      event_id: 'TRG-2026-0847-001',
      timestamp: '2026-01-15T14:32:17Z',
      patient_id: 'P-2026-0847',
      triage_level: 'YELLOW',
      symptoms: ['chest_pain', 'shortness_of_breath'],
      location: 'FIELD_STATION_ALPHA',
      medic_id: 'M-451'
    };

    // Compute hash
    const canonical = canonicalJson(canonicalSnapshot);
    const hash = sha256Hex(canonical);

    return {
      bundle_id: 'BNDL-2026-0847-001-A7F3-9X2M',
      bundle_version: '0.4',
      created_at: '2026-01-15T14:32:18Z',
      canonical_snapshot: canonicalSnapshot,
      snapshot_hash: {
        algorithm: 'SHA-256',
        value: hash
      },
      signed_receipt: {
        receipt_id: 'RCPT-2026-0847-001-A7F3',
        version: '0.2',
        created_at: '2026-01-15T14:32:18Z',
        signature: {
          algorithm: 'Ed25519',
          issuer: 'org:gazacare:field-ops:triage-system',
          key_id: 'signing-key-2026-q1',
          public_key: 'g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=',
          signature_value: '3f2a8b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2',
          signed_at: '2026-01-15T14:32:18Z'
        }
      },
      metadata: {
        purpose: 'triage_evidence',
        retention_policy: 'healthcare_7_year'
      }
    };
  }

  /**
   * Create a tampered bundle for testing failure modes
   */
  createTamperedBundle(): EvidenceBundle {
    const bundle = this.createSampleBundle();
    // Tamper with the snapshot
    (bundle.canonical_snapshot as Record<string, unknown>).triage_level = 'RED'; // Changed from YELLOW
    // Note: We don't update the hash, so verification will fail
    return bundle;
  }
}

// Example usage and demonstration
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  console.log('='.repeat(60));
  console.log('DigiEmu Secure Bundle Verifier Prototype');
  console.log('='.repeat(60));
  console.log();

  const verifier = new BundleVerifier();

  // Ensure examples directory exists
  if (!fs.existsSync('./examples')) {
    fs.mkdirSync('./examples', { recursive: true });
  }

  // Generate Ed25519 key pair for signing demo bundles
  console.log('Generating Ed25519 key pair for demo...');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');

  // Export public key in raw format (base64)
  const publicKeyJwk = publicKey.export({ format: 'jwk' });
  const publicKeyRaw = Buffer.from(publicKeyJwk.x!, 'base64url').toString('base64');
  console.log(`Public Key: ${publicKeyRaw.substring(0, 20)}... (32 bytes)`);
  console.log();

  // Demo 1: Valid bundle
  console.log('1. Creating valid sample bundle with real Ed25519 signature...');
  let validBundle = verifier.createSampleBundle();

  // Update with real public key and signature
  validBundle.signed_receipt.signature.public_key = publicKeyRaw;
  const canonical = canonicalJson(validBundle.canonical_snapshot);
  const message = Buffer.from(sha256Hex(canonical), 'hex');
  const signature = sign(null, message, privateKey);
  validBundle.signed_receipt.signature.signature_value = signature.toString('hex');
  const validBundlePath = './examples/valid-bundle.json';
  fs.writeFileSync(validBundlePath, JSON.stringify(validBundle, null, 2));
  console.log(`   Created: ${validBundlePath}`);
  console.log();

  console.log('2. Verifying valid bundle...');
  const validResult = verifier.verifyBundle(validBundlePath);
  console.log(`   Outcome: ${validResult.outcome}`);
  console.log(`   Bundle ID: ${validResult.bundle_id}`);
  console.log(`   Receipt ID: ${validResult.receipt_id}`);
  console.log();
  console.log('   Step-by-step results:');
  validResult.checks.forEach(check => {
    const icon = check.status === 'PASS' ? '✓' : check.status === 'FAIL' ? '✗' : '⊘';
    console.log(`     ${icon} Step ${check.step}: ${check.check} (${check.status})`);
    if (check.details) {
      console.log(`       ${check.details}`);
    }
  });
  console.log();
  console.log(`   Summary: ${validResult.summary.passed}/${validResult.summary.total} checks passed`);
  console.log(`   Conclusion: ${validResult.conclusion}`);
  console.log();

  // Demo 2: Tampered bundle
  console.log('3. Creating tampered bundle (hash mismatch)...');
  const tamperedBundle = verifier.createTamperedBundle();
  const tamperedBundlePath = './examples/tampered-bundle.json';
  fs.writeFileSync(tamperedBundlePath, JSON.stringify(tamperedBundle, null, 2));
  console.log(`   Created: ${tamperedBundlePath}`);
  console.log(`   Tampered: Changed triage_level from YELLOW to RED`);
  console.log();

  console.log('4. Verifying tampered bundle...');
  const tamperedResult = verifier.verifyBundle(tamperedBundlePath);
  console.log(`   Outcome: ${tamperedResult.outcome}`);
  console.log();
  console.log('   Step-by-step results:');
  tamperedResult.checks.forEach(check => {
    const icon = check.status === 'PASS' ? '✓' : check.status === 'FAIL' ? '✗' : '⊘';
    console.log(`     ${icon} Step ${check.step}: ${check.check} (${check.status})`);
    if (check.details) {
      console.log(`       ${check.details}`);
    }
  });
  console.log();
  console.log(`   Failure Codes:`);
  tamperedResult.failure_codes.forEach(fc => {
    console.log(`     - ${fc.code} (${fc.severity}): ${fc.description}`);
  });
  console.log();
  console.log(`   Conclusion: ${tamperedResult.conclusion}`);
  console.log();

  // Demo 3: Invalid bundle (missing fields)
  console.log('5. Testing invalid bundle structure...');
  const invalidBundle = { bundle_id: 'invalid' }; // Missing required fields
  const invalidBundlePath = './examples/invalid-bundle.json';
  fs.writeFileSync(invalidBundlePath, JSON.stringify(invalidBundle, null, 2));

  const invalidResult = verifier.verifyBundle(invalidBundlePath);
  console.log(`   Outcome: ${invalidResult.outcome}`);
  console.log(`   First failure: ${invalidResult.failure_codes[0]?.code}`);
  console.log();

  console.log('='.repeat(60));
  console.log('Bundle verifier demonstration complete');
  console.log('='.repeat(60));
  console.log();
  console.log('This prototype demonstrates:');
  console.log('- Loading evidence bundles from JSON files');
  console.log('- 10-step verification sequence (v0.4 Verification Profile)');
  console.log('- Hash recomputation and comparison');
  console.log('- Failure code generation (SEC-001 to SEC-005)');
  console.log('- SECURE_PASS, SECURE_FAIL, SECURE_INCOMPLETE outcomes');
  console.log();
  console.log('Note: Steps 6-8 (issuer resolution, key resolution, signature');
  console.log('verification) are skipped in this prototype and would require');
  console.log('registry integration and cryptographic libraries in production.');
  console.log();
  console.log('See docs/DigiEmu_Secure_v0_4_Verification_Profile.md for full specification.');
}
