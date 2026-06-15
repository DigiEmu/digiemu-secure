/**
 * DigiEmu Secure CLI Integration Tests
 *
 * Tests the CLI commands using Node.js built-in test runner.
 * Runs against compiled CLI at dist/cli.js
 *
 * Tests: CT-001 through CT-006
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'path';
import * as fs from 'fs';
import { canonicalJson } from '../src/canonical-json.js';
import { sha256Hex } from '../src/hash-utils.js';

// Constants
const CLI_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'cli.js');
const TEST_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tmp', 'cli-tests');
const VALID_BUNDLE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'examples', 'valid-bundle.json');

/**
 * Helper: Run CLI command and capture result
 */
async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode ?? 0, stdout, stderr });
    });
  });
}

/**
 * Helper: Create test bundle file
 */
function createBundleFile(filename: string, bundle: any): string {
  const filepath = path.join(TEST_DIR, filename);
  fs.mkdirSync(TEST_DIR, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(bundle, null, 2));
  return filepath;
}

/**
 * Create a valid test bundle
 */
function createValidBundle(): any {
  const canonicalSnapshot = {
    event_type: 'CLI_TEST',
    event_id: 'CLI-001',
    timestamp: '2026-01-15T14:32:17Z',
    data: { test: true }
  };

  const canonical = canonicalJson(canonicalSnapshot);
  const hash = sha256Hex(canonical);

  return {
    bundle_id: 'BNDL-TEST-CLI-001',
    bundle_version: '0.4',
    created_at: '2026-01-15T14:32:18Z',
    canonical_snapshot: canonicalSnapshot,
    snapshot_hash: {
      algorithm: 'SHA-256',
      value: hash
    },
    signed_receipt: {
      receipt_id: 'RCPT-TEST-CLI-001',
      version: '0.2',
      created_at: '2026-01-15T14:32:18Z',
      signature: {
        algorithm: 'Ed25519',
        issuer: 'org:test:cli:issuer',
        key_id: 'cli-test-key',
        public_key: 'testPublicKeyForCLI==',
        signature_value: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
        signed_at: '2026-01-15T14:32:18Z'
      }
    }
  };
}

/**
 * Create a tampered test bundle (hash mismatch)
 */
function createTamperedBundle(): any {
  const bundle = createValidBundle();
  // Tamper with data but keep original hash
  bundle.canonical_snapshot.data.tampered = true;
  return bundle;
}

/**
 * Create an invalid test bundle (missing fields)
 */
function createInvalidBundle(): any {
  return {
    bundle_id: 'invalid',
    bundle_version: '0.4'
    // Missing required fields
  };
}

// ============================================
// Test Suite: CLI Integration Tests
// ============================================

describe('DigiEmu Secure CLI Integration Tests', () => {

  // Clean up test directory before tests
  before(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  // CT-001: verify valid bundle returns exit code 0
  it('CT-001: verify valid bundle returns exit code 0', async () => {
    const result = await runCli(['verify', VALID_BUNDLE_PATH]);

    // Valid bundle with proper signature returns SECURE_PASS (exit code 0)
    assert.strictEqual(result.exitCode, 0, `Expected exit code 0 for valid bundle, got ${result.exitCode}`);
    assert.ok(
      result.stdout.includes('SECURE_PASS') || result.stderr.includes('SECURE_PASS'),
      'Expected SECURE_PASS in output'
    );
    console.log('  ✓ CT-001 passed');
  });

  // CT-002: verify tampered bundle returns exit code 1
  it('CT-002: verify tampered bundle returns exit code 1', async () => {
    const bundle = createTamperedBundle();
    const bundlePath = createBundleFile('ct002-tampered.json', bundle);

    const result = await runCli(['verify', bundlePath]);

    assert.strictEqual(result.exitCode, 1, 'Expected exit code 1 for tampered bundle');
    assert.ok(
      result.stdout.includes('SECURE_FAIL') || result.stderr.includes('SECURE_FAIL'),
      'Expected SECURE_FAIL in output'
    );
    console.log('  ✓ CT-002 passed');
  });

  // CT-003: verify invalid bundle returns exit code 1 or 2
  it('CT-003: verify invalid bundle returns exit code 1 or 2', async () => {
    const bundle = createInvalidBundle();
    const bundlePath = createBundleFile('ct003-invalid.json', bundle);

    const result = await runCli(['verify', bundlePath]);

    assert.ok(
      result.exitCode === 1 || result.exitCode === 2,
      `Expected exit code 1 or 2, got ${result.exitCode}`
    );
    console.log('  ✓ CT-003 passed');
  });

  // CT-004: verify strict registry without registry returns non-zero
  it('CT-004: verify strict registry without registry returns non-zero exit code', async () => {
    const bundle = createValidBundle();
    const bundlePath = createBundleFile('ct004-strict.json', bundle);

    const result = await runCli(['verify', bundlePath, '--strict-registry']);

    assert.ok(
      result.exitCode !== 0,
      `Expected non-zero exit code with strict registry and no registry, got ${result.exitCode}`
    );
    assert.ok(
      result.stdout.includes('SECURE_FAIL') || result.stderr.includes('SECURE_FAIL'),
      'Expected SECURE_FAIL in output'
    );
    console.log('  ✓ CT-004 passed');
  });

  // CT-005: bundle verify valid bundle returns exit code 0
  it('CT-005: bundle verify valid bundle returns exit code 0', async () => {
    const result = await runCli(['bundle', 'verify', VALID_BUNDLE_PATH]);

    // Valid bundle with proper signature returns SECURE_PASS (exit code 0)
    assert.strictEqual(result.exitCode, 0, `Expected exit code 0 for valid bundle, got ${result.exitCode}`);
    assert.ok(
      result.stdout.includes('SECURE_PASS') || result.stderr.includes('SECURE_PASS'),
      'Expected SECURE_PASS in output'
    );
    console.log('  ✓ CT-005 passed');
  });

  // CT-006: unknown command returns exit code 2
  it('CT-006: unknown command returns exit code 2', async () => {
    const result = await runCli(['unknowncommand']);

    assert.strictEqual(result.exitCode, 2, 'Expected exit code 2 for unknown command');
    console.log('  ✓ CT-006 passed');
  });

});

// ============================================
// Main execution
// ============================================

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  console.log('='.repeat(60));
  console.log('DigiEmu Secure CLI Integration Tests');
  console.log('='.repeat(60));

  // Tests will run via node:test runner
}
