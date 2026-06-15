/**
 * DigiEmu Secure CLI MVP
 *
 * Command-line interface for DigiEmu Secure operations.
 * Implements commands from v0.6 CLI Profile.
 *
 * Commands:
 *   secure sign <snapshot.json>        - Sign evidence and create receipt
 *   secure verify <bundle.json>        - Verify evidence bundle
 *   secure bundle create <snapshot.json> - Create complete evidence bundle
 *   secure bundle verify <bundle.json>   - Verify evidence bundle
 *
 * Exit codes:
 *   0 = success
 *   1 = verification failure
 *   2 = invalid input
 *   3 = configuration error
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync, sign } from 'node:crypto';
import { BundleVerifier } from './bundle-verifier.js';
import { SignatureVerifier } from './signature-verifier.js';
import { canonicalJson } from './canonical-json.js';
import { sha256Hex } from './hash-utils.js';

// Types
interface CLIOptions {
  json: boolean;
  registry?: string;
  trustAnchor?: string;
  issuer?: string;
  keyId?: string;
  output?: string;
}

interface CLIResult {
  success: boolean;
  exitCode: number;
  message: string;
  data?: unknown;
}

/**
 * Secure CLI class
 *
 * Implements the command-line interface for DigiEmu Secure.
 */
class SecureCLI {
  private verifier: BundleVerifier;
  private signatureVerifier: SignatureVerifier;

  constructor() {
    this.verifier = new BundleVerifier();
    this.signatureVerifier = new SignatureVerifier();
  }

  /**
   * Main entry point for CLI
   */
  async run(args: string[]): Promise<number> {
    if (args.length < 1) {
      this.printUsage();
      return 2;
    }

    // Parse command structure
    // Format: secure <command> [subcommand] <file> [options]
    // Commands: sign <file>, verify <file>, bundle create <file>, bundle verify <file>
    let command: string;
    let subcommand: string | null = null;
    let filePath: string;
    let optionsStartIndex: number;

    const firstArg = args[0];

    if (firstArg === 'bundle') {
      // bundle create <file> or bundle verify <file>
      if (args.length < 3) {
        console.error('Error: Missing required arguments for bundle command');
        this.printUsage();
        return 2;
      }
      command = 'bundle';
      subcommand = args[1];
      filePath = args[2];
      optionsStartIndex = 3;
    } else if (firstArg === 'sign' || firstArg === 'verify') {
      // sign <file> or verify <file>
      if (args.length < 2) {
        console.error(`Error: Missing required argument <file> for ${firstArg} command`);
        this.printUsage();
        return 2;
      }
      command = firstArg;
      filePath = args[1];
      optionsStartIndex = 2;
    } else {
      console.error(`Error: Unknown command: ${firstArg}`);
      this.printUsage();
      return 2;
    }

    const options = this.parseOptions(args.slice(optionsStartIndex));

    try {
      let result: CLIResult;

      switch (command) {
        case 'sign':
          result = await this.signCommand(filePath, options);
          break;

        case 'verify':
          result = await this.verifyCommand(filePath, options);
          break;

        case 'bundle':
          if (subcommand === 'create') {
            result = await this.bundleCreateCommand(filePath, options);
          } else if (subcommand === 'verify') {
            result = await this.verifyCommand(filePath, options);
          } else {
            console.error(`Error: Unknown bundle subcommand: ${subcommand}`);
            this.printUsage();
            return 2;
          }
          break;

        default:
          console.error(`Error: Unknown command: ${command}`);
          this.printUsage();
          return 2;
      }

      this.printResult(result, options.json);
      return result.exitCode;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result: CLIResult = {
        success: false,
        exitCode: 3,
        message: `Error: ${errorMessage}`
      };
      this.printResult(result, options.json);
      return 3;
    }
  }

  /**
   * Parse command-line options
   */
  private parseOptions(args: string[]): CLIOptions {
    const options: CLIOptions = { json: false };

    for (let i = 0; i < args.length; i++) {
      switch (args[i]) {
        case '--json':
          options.json = true;
          break;
        case '--registry':
          options.registry = args[++i];
          break;
        case '--trust-anchor':
          options.trustAnchor = args[++i];
          break;
        case '--issuer':
          options.issuer = args[++i];
          break;
        case '--key-id':
          options.keyId = args[++i];
          break;
        case '--output':
        case '-o':
          options.output = args[++i];
          break;
        default:
          if (args[i].startsWith('-')) {
            console.warn(`Warning: Unknown option ${args[i]}`);
          }
      }
    }

    return options;
  }

  /**
   * Sign command: Create signed receipt from snapshot
   */
  private async signCommand(snapshotPath: string, options: CLIOptions): Promise<CLIResult> {
    // Load snapshot
    if (!fs.existsSync(snapshotPath)) {
      return {
        success: false,
        exitCode: 2,
        message: `Input file not found: ${snapshotPath}`
      };
    }

    let snapshot: unknown;
    try {
      const content = fs.readFileSync(snapshotPath, 'utf-8');
      snapshot = JSON.parse(content);
    } catch (error) {
      return {
        success: false,
        exitCode: 2,
        message: `Invalid JSON in snapshot file: ${error}`
      };
    }

    // Generate key pair for signing (in production, would use stored key)
    const issuer = options.issuer || 'org:example:cli:signer';
    const keyId = options.keyId || 'cli-signing-key';

    console.log(`Signing as: ${issuer}`);
    console.log(`Key ID: ${keyId}`);

    // Generate Ed25519 key pair
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyJwk = publicKey.export({ format: 'jwk' });
    const publicKeyRaw = Buffer.from(publicKeyJwk.x!, 'base64url').toString('base64');

    // Create canonical snapshot and hash
    const canonical = canonicalJson(snapshot);
    const hash = sha256Hex(canonical);

    // Sign
    const message = Buffer.from(hash, 'hex');
    const signatureBuffer = sign(null, message, privateKey);
    const signatureValue = signatureBuffer.toString('hex');

    // Create receipt
    const receipt = {
      receipt_id: `RCPT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      version: '0.2',
      created_at: new Date().toISOString(),
      canonical_snapshot: snapshot,
      snapshot_hash: {
        algorithm: 'SHA-256',
        value: hash
      },
      signature: {
        algorithm: 'Ed25519',
        issuer,
        key_id: keyId,
        public_key: publicKeyRaw,
        signature_value: signatureValue,
        signed_at: new Date().toISOString()
      }
    };

    // Output
    const outputPath = options.output || snapshotPath.replace('.json', '-receipt.json');
    fs.writeFileSync(outputPath, JSON.stringify(receipt, null, 2));

    return {
      success: true,
      exitCode: 0,
      message: `Receipt created: ${outputPath}`,
      data: {
        receipt_id: receipt.receipt_id,
        issuer,
        key_id: keyId,
        output_path: outputPath,
        signature: signatureValue.substring(0, 32) + '...'
      }
    };
  }

  /**
   * Verify command: Verify evidence bundle
   */
  private async verifyCommand(bundlePath: string, options: CLIOptions): Promise<CLIResult> {
    // Check file exists
    if (!fs.existsSync(bundlePath)) {
      return {
        success: false,
        exitCode: 2,
        message: `Bundle file not found: ${bundlePath}`
      };
    }

    // Configure registry if provided
    if (options.registry && options.trustAnchor) {
      const registryLoaded = this.verifier.setRegistry(options.registry, options.trustAnchor);
      if (!registryLoaded) {
        return {
          success: false,
          exitCode: 3,
          message: 'Failed to load registry or trust anchor'
        };
      }
    }

    // Verify
    const result = this.verifier.verifyBundle(bundlePath);

    // Determine outcome
    switch (result.outcome) {
      case 'SECURE_PASS':
        return {
          success: true,
          exitCode: 0,
          message: '✓ Verification successful: Evidence is authentic',
          data: {
            outcome: result.outcome,
            bundle_id: result.bundle_id,
            receipt_id: result.receipt_id,
            checks_passed: result.summary.passed,
            checks_total: result.summary.total
          }
        };

      case 'SECURE_FAIL':
        return {
          success: false,
          exitCode: 1,
          message: '✗ Verification failed: Evidence integrity issues detected',
          data: {
            outcome: result.outcome,
            bundle_id: result.bundle_id,
            failure_codes: result.failure_codes,
            checks_failed: result.summary.failed
          }
        };

      case 'SECURE_INCOMPLETE':
        return {
          success: true,
          exitCode: 0,
          message: '⊘ Verification incomplete: Configure registry for full verification',
          data: {
            outcome: result.outcome,
            bundle_id: result.bundle_id,
            checks_passed: result.summary.passed,
            conclusion: result.conclusion
          }
        };

      default:
        return {
          success: false,
          exitCode: 1,
          message: `Unknown outcome: ${result.outcome}`,
          data: result
        };
    }
  }

  /**
   * Bundle create command: Create complete evidence bundle
   */
  private async bundleCreateCommand(snapshotPath: string, options: CLIOptions): Promise<CLIResult> {
    // Load snapshot
    if (!fs.existsSync(snapshotPath)) {
      return {
        success: false,
        exitCode: 2,
        message: `Input file not found: ${snapshotPath}`
      };
    }

    let snapshot: unknown;
    try {
      const content = fs.readFileSync(snapshotPath, 'utf-8');
      snapshot = JSON.parse(content);
    } catch (error) {
      return {
        success: false,
        exitCode: 2,
        message: `Invalid JSON in snapshot file: ${error}`
      };
    }

    // Generate key pair for signing
    const issuer = options.issuer || 'org:example:cli:signer';
    const keyId = options.keyId || 'cli-signing-key';

    console.log(`Creating bundle as: ${issuer}`);
    console.log(`Key ID: ${keyId}`);

    // Generate Ed25519 key pair
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const publicKeyJwk = publicKey.export({ format: 'jwk' });
    const publicKeyRaw = Buffer.from(publicKeyJwk.x!, 'base64url').toString('base64');

    // Create canonical snapshot and hash
    const canonical = canonicalJson(snapshot);
    const hash = sha256Hex(canonical);

    // Sign
    const message = Buffer.from(hash, 'hex');
    const signatureBuffer = sign(null, message, privateKey);
    const signatureValue = signatureBuffer.toString('hex');

    // Create bundle
    const bundleId = `BNDL-${Date.now()}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const bundle = {
      bundle_id: bundleId,
      bundle_version: '0.4',
      created_at: new Date().toISOString(),
      canonical_snapshot: snapshot,
      snapshot_hash: {
        algorithm: 'SHA-256',
        value: hash
      },
      signed_receipt: {
        receipt_id: `RCPT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        version: '0.2',
        created_at: new Date().toISOString(),
        signature: {
          algorithm: 'Ed25519',
          issuer,
          key_id: keyId,
          public_key: publicKeyRaw,
          signature_value: signatureValue,
          signed_at: new Date().toISOString()
        }
      }
    };

    // Output
    const outputPath = options.output || snapshotPath.replace('.json', '-bundle.json');
    fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2));

    return {
      success: true,
      exitCode: 0,
      message: `Bundle created: ${outputPath}`,
      data: {
        bundle_id: bundleId,
        receipt_id: bundle.signed_receipt.receipt_id,
        issuer,
        key_id: keyId,
        output_path: outputPath,
        signature: signatureValue.substring(0, 32) + '...'
      }
    };
  }

  /**
   * Print usage information
   */
  private printUsage(): void {
    console.log(`
DigiEmu Secure CLI

Usage:
  secure sign <snapshot.json>        Sign evidence and create receipt
  secure verify <bundle.json>          Verify evidence bundle
  secure bundle create <snapshot.json> Create complete evidence bundle
  secure bundle verify <bundle.json>   Verify evidence bundle

Options:
  --json                    Output in JSON format
  --registry <path>       Path to issuer registry JSON
  --trust-anchor <path>   Path to trust anchor JSON
  --issuer <id>           Issuer identifier (default: org:example:cli:signer)
  --key-id <id>           Key identifier (default: cli-signing-key)
  --output, -o <path>     Output file path

Exit Codes:
  0 = Success
  1 = Verification failure
  2 = Invalid input
  3 = Configuration error

Examples:
  secure sign evidence.json --issuer org:example:issuer --output receipt.json
  secure verify bundle.json --registry registry.json --trust-anchor anchors.json
  secure bundle create evidence.json --output bundle.json
`);
  }

  /**
   * Print result in human-readable or JSON format
   */
  private printResult(result: CLIResult, json: boolean): void {
    if (json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log();
      if (result.success) {
        console.log(result.message);
      } else {
        console.error(result.message);
      }

      if (result.data && !json) {
        const data = result.data as Record<string, unknown>;
        if (Object.keys(data).length > 0) {
          console.log();
          console.log('Details:');
          for (const [key, value] of Object.entries(data)) {
            if (key !== 'conclusion') {
              console.log(`  ${key}: ${value}`);
            }
          }
        }
      }
    }
  }
}

// Main execution
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const cli = new SecureCLI();
  cli.run(process.argv.slice(2)).then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    console.error(`Unexpected error: ${error}`);
    process.exit(3);
  });
}

export { SecureCLI };
