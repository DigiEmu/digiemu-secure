/**
 * DigiEmu Secure Conformance Runner Prototype
 *
 * Minimal conformance test suite for the bundle verifier.
 * Validates that the verifier behaves according to v0.4 Verification Profile.
 *
 * This is an educational prototype demonstrating conformance testing
 * as defined in DigiEmu_Secure_v0_6_Conformance_Profile.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { BundleVerifier } from './bundle-verifier.js';
import { canonicalJson } from './canonical-json.js';
import { sha256Hex } from './hash-utils.js';
import { generateKeyPairSync, sign } from 'node:crypto';
import * as crypto from 'node:crypto';

// Test result types
interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

// Test case definition
interface TestCase {
  name: string;
  description: string;
  setup: () => string; // Returns path to test bundle
  expectedOutcome: 'SECURE_PASS' | 'SECURE_FAIL' | 'SECURE_INCOMPLETE';
  expectedFailureCodes?: string[];
  validate?: (result: any) => { passed: boolean; details: string };
}

/**
 * Conformance Runner class
 *
 * Executes conformance tests and reports results.
 */
class ConformanceRunner {
  private verifier: BundleVerifier;
  private results: TestResult[] = [];
  private testDir: string;

  constructor() {
    this.verifier = new BundleVerifier();
    this.testDir = './test-temp';
    this.ensureTestDir();
  }

  private ensureTestDir() {
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
  }

  private cleanup() {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  // Store the key pair for generating valid bundles
  private keyPair: { publicKey: string; privateKey: crypto.KeyObject } | null = null;

  /**
   * Generate Ed25519 key pair for testing
   */
  private getOrCreateKeyPair(): { publicKey: string; privateKey: crypto.KeyObject } {
    if (!this.keyPair) {
      const { publicKey, privateKey } = generateKeyPairSync('ed25519');
      const publicKeyJwk = publicKey.export({ format: 'jwk' });
      this.keyPair = {
        publicKey: Buffer.from(publicKeyJwk.x!, 'base64url').toString('base64'),
        privateKey
      };
    }
    return this.keyPair;
  }

  /**
   * Create a valid bundle for testing with real Ed25519 signature
   */
  private createValidBundle(): any {
    const canonicalSnapshot = {
      event_type: 'TEST_EVENT',
      event_id: 'TEST-001',
      timestamp: '2026-01-15T14:32:17Z',
      data: { test: true }
    };

    const canonical = canonicalJson(canonicalSnapshot);
    const hash = sha256Hex(canonical);

    // Get or create key pair for signing
    const { publicKey, privateKey } = this.getOrCreateKeyPair();

    // Create real Ed25519 signature
    const message = Buffer.from(hash, 'hex');
    const signatureBuffer = sign(null, message, privateKey);
    const signatureValue = signatureBuffer.toString('hex');

    return {
      bundle_id: 'BNDL-TEST-001-VALID',
      bundle_version: '0.4',
      created_at: '2026-01-15T14:32:18Z',
      canonical_snapshot: canonicalSnapshot,
      snapshot_hash: {
        algorithm: 'SHA-256',
        value: hash
      },
      signed_receipt: {
        receipt_id: 'RCPT-TEST-001',
        version: '0.2',
        created_at: '2026-01-15T14:32:18Z',
        signature: {
          algorithm: 'Ed25519',
          issuer: 'org:test:issuer',
          key_id: 'test-key-001',
          public_key: publicKey,
          signature_value: signatureValue,
          signed_at: '2026-01-15T14:32:18Z'
        }
      }
    };
  }

  /**
   * Save bundle to temp file and return path
   */
  private saveBundle(bundle: any, filename: string): string {
    const filepath = path.join(this.testDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2));
    return filepath;
  }

  /**
   * Define test cases
   */
  private getTestCases(): TestCase[] {
    return [
      {
        name: 'TC-001',
        description: 'Valid bundle with real Ed25519 signature returns SECURE_PASS',
        setup: () => {
          const bundle = this.createValidBundle();
          return this.saveBundle(bundle, 'tc001-valid.json');
        },
        expectedOutcome: 'SECURE_PASS',
        validate: (result) => ({
          passed: result.outcome === 'SECURE_PASS',
          details: result.outcome === 'SECURE_PASS'
            ? 'Valid signed bundle verified successfully (SECURE_PASS)'
            : `Expected SECURE_PASS, got ${result.outcome}`
        })
      },
      {
        name: 'TC-002',
        description: 'Tampered bundle returns SECURE_FAIL with SEC-004',
        setup: () => {
          const bundle = this.createValidBundle();
          // Tamper with data without updating hash
          bundle.canonical_snapshot.data.test = false;
          return this.saveBundle(bundle, 'tc002-tampered.json');
        },
        expectedOutcome: 'SECURE_FAIL',
        expectedFailureCodes: ['SEC-004'],
        validate: (result) => {
          const hasHashMismatch = result.failure_codes.some(
            (fc: any) => fc.code === 'SEC-004'
          );
          return {
            passed: result.outcome === 'SECURE_FAIL' && hasHashMismatch,
            details: hasHashMismatch
              ? 'SEC-004 HASH_MISMATCH detected correctly'
              : `Expected SEC-004, got: ${result.failure_codes.map((fc: any) => fc.code).join(', ')}`
          };
        }
      },
      {
        name: 'TC-003',
        description: 'Invalid bundle structure returns SECURE_FAIL',
        setup: () => {
          const bundle = { bundle_id: 'invalid' }; // Missing required fields
          return this.saveBundle(bundle, 'tc003-invalid.json');
        },
        expectedOutcome: 'SECURE_FAIL',
        validate: (result) => ({
          passed: result.outcome === 'SECURE_FAIL',
          details: result.outcome === 'SECURE_FAIL'
            ? 'Invalid bundle rejected as expected'
            : `Expected SECURE_FAIL, got ${result.outcome}`
        })
      },
      {
        name: 'TC-004',
        description: 'Unsupported version returns SECURE_FAIL with SEC-002',
        setup: () => {
          const bundle = this.createValidBundle();
          bundle.bundle_version = '0.1'; // Unsupported version
          return this.saveBundle(bundle, 'tc004-unsupported.json');
        },
        expectedOutcome: 'SECURE_FAIL',
        expectedFailureCodes: ['SEC-002'],
        validate: (result) => {
          const hasVersionError = result.failure_codes.some(
            (fc: any) => fc.code === 'SEC-002'
          );
          return {
            passed: result.outcome === 'SECURE_FAIL' && hasVersionError,
            details: hasVersionError
              ? 'SEC-002 BUNDLE_VERSION_UNSUPPORTED detected correctly'
              : `Expected SEC-002, got: ${result.failure_codes.map((fc: any) => fc.code).join(', ')}`
          };
        }
      },
      {
        name: 'TC-005',
        description: 'Missing receipt returns SECURE_FAIL with SEC-005',
        setup: () => {
          const bundle = this.createValidBundle();
          delete (bundle as any).signed_receipt;
          return this.saveBundle(bundle, 'tc005-no-receipt.json');
        },
        expectedOutcome: 'SECURE_FAIL',
        expectedFailureCodes: ['SEC-005'],
        validate: (result) => {
          const hasReceiptError = result.failure_codes.some(
            (fc: any) => fc.code === 'SEC-005'
          );
          return {
            passed: result.outcome === 'SECURE_FAIL' && hasReceiptError,
            details: hasReceiptError
              ? 'SEC-005 RECEIPT_STRUCTURE_INVALID detected correctly'
              : `Expected SEC-005, got: ${result.failure_codes.map((fc: any) => fc.code).join(', ')}`
          };
        }
      }
    ];
  }

  /**
   * Run all conformance tests
   */
  run(): { total: number; passed: number; failed: number; results: TestResult[] } {
    console.log('='.repeat(60));
    console.log('DigiEmu Secure Conformance Runner');
    console.log('='.repeat(60));
    console.log();

    const testCases = this.getTestCases();

    for (const testCase of testCases) {
      console.log(`Running ${testCase.name}: ${testCase.description}`);

      try {
        // Setup test bundle
        const bundlePath = testCase.setup();

        // Run verification
        const result = this.verifier.verifyBundle(bundlePath);

        // Validate result
        let validation;
        if (testCase.validate) {
          validation = testCase.validate(result);
        } else {
          validation = {
            passed: result.outcome === testCase.expectedOutcome,
            details: `Outcome: ${result.outcome}`
          };
        }

        this.results.push({
          name: testCase.name,
          passed: validation.passed,
          expected: testCase.expectedOutcome,
          actual: result.outcome,
          details: validation.details
        });

        const icon = validation.passed ? '✓' : '✗';
        console.log(`  ${icon} ${validation.details}`);

      } catch (error) {
        this.results.push({
          name: testCase.name,
          passed: false,
          expected: testCase.expectedOutcome,
          actual: 'ERROR',
          details: `Test execution failed: ${error}`
        });
        console.log(`  ✗ Test execution failed: ${error}`);
      }

      console.log();
    }

    // Cleanup temp files
    this.cleanup();

    return this.generateReport();
  }

  /**
   * Generate test report
   */
  private generateReport(): { total: number; passed: number; failed: number; results: TestResult[] } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;

    console.log('='.repeat(60));
    console.log('CONFORMANCE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log();
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✓`);
    console.log(`Failed: ${failed} ${failed > 0 ? '✗' : ''}`);
    console.log();

    if (failed > 0) {
      console.log('Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  ✗ ${r.name}`);
          console.log(`    Expected: ${r.expected}`);
          console.log(`    Actual: ${r.actual}`);
          if (r.details) {
            console.log(`    Details: ${r.details}`);
          }
        });
      console.log();
    }

    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    console.log(`Pass Rate: ${passRate}%`);
    console.log();

    if (failed === 0) {
      console.log('✓ All conformance tests passed');
      console.log();
      console.log('The bundle verifier implementation conforms to the');
      console.log('v0.4 Verification Profile specification.');
    } else {
      console.log('✗ Some conformance tests failed');
      console.log();
      console.log('Review the failed tests and verify the implementation');
      console.log('matches the v0.4 Verification Profile specification.');
    }

    console.log();
    console.log('='.repeat(60));

    return { total, passed, failed, results: this.results };
  }
}

// Main execution
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const runner = new ConformanceRunner();
  const report = runner.run();

  // Exit with appropriate code
  process.exit(report.failed > 0 ? 1 : 0);
}

export { ConformanceRunner };
