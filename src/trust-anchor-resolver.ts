/**
 * DigiEmu Secure Trust Anchor Resolver Prototype
 *
 * Minimal reference implementation for trust anchor resolution.
 * Loads trust anchors from JSON file and provides anchor lookup.
 *
 * This is an educational prototype demonstrating the trust anchor
 * concept defined in DigiEmu_Secure_v0_3_Trust_Anchor_Model.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

// Types matching the v0.3 Trust Anchor Model

interface TrustAnchor {
  anchor_id: string;
  version: string;
  issuer: {
    issuer_id: string;
    key_id: string;
  };
  public_key: string;
  algorithm: 'Ed25519';
  valid_from: string;
  valid_until: string;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
}

interface TrustAnchorSet {
  anchor_set_version: string;
  last_updated: string;
  anchors: TrustAnchor[];
}

interface AnchorResolutionResult {
  found: boolean;
  anchor?: TrustAnchor;
  error?: string;
}

/**
 * Trust Anchor Resolver class
 *
 * Loads and queries trust anchors from JSON file.
 * No networking - file-based only for simplicity.
 */
export class TrustAnchorResolver {
  private anchorSet: TrustAnchorSet | null = null;
  private anchorSetPath: string;

  constructor(anchorSetPath: string) {
    this.anchorSetPath = path.resolve(anchorSetPath);
  }

  /**
   * Load trust anchor set from file
   * Must be called before resolve operations
   */
  load(): boolean {
    try {
      if (!fs.existsSync(this.anchorSetPath)) {
        console.error(`Trust anchor file not found: ${this.anchorSetPath}`);
        return false;
      }

      const content = fs.readFileSync(this.anchorSetPath, 'utf-8');
      this.anchorSet = JSON.parse(content) as TrustAnchorSet;

      console.log(`Trust anchor set loaded: ${this.anchorSet.anchors.length} anchors`);
      return true;
    } catch (error) {
      console.error(`Failed to load trust anchor set: ${error}`);
      return false;
    }
  }

  /**
   * Resolve trust anchor by anchor_id
   *
   * Returns anchor metadata if found and valid
   */
  resolveAnchor(anchorId: string): AnchorResolutionResult {
    if (!this.anchorSet) {
      return {
        found: false,
        error: 'Trust anchor set not loaded'
      };
    }

    const anchor = this.anchorSet.anchors.find(a => a.anchor_id === anchorId);

    if (!anchor) {
      return {
        found: false,
        error: `Trust anchor not found: ${anchorId}`
      };
    }

    return this.validateAnchor(anchor);
  }

  /**
   * Resolve trust anchor by issuer_id
   *
   * Finds anchor matching the issuer
   */
  resolveByIssuer(issuerId: string): AnchorResolutionResult {
    if (!this.anchorSet) {
      return {
        found: false,
        error: 'Trust anchor set not loaded'
      };
    }

    const anchor = this.anchorSet.anchors.find(a => a.issuer.issuer_id === issuerId);

    if (!anchor) {
      return {
        found: false,
        error: `No trust anchor found for issuer: ${issuerId}`
      };
    }

    return this.validateAnchor(anchor);
  }

  /**
   * Validate anchor status, algorithm, and validity period
   */
  private validateAnchor(anchor: TrustAnchor): AnchorResolutionResult {
    // Validate status
    if (anchor.status === 'revoked') {
      return {
        found: true,
        anchor,
        error: 'Trust anchor revoked'
      };
    }

    if (anchor.status === 'suspended') {
      return {
        found: true,
        anchor,
        error: 'Trust anchor suspended'
      };
    }

    // Validate algorithm
    if (anchor.algorithm !== 'Ed25519') {
      return {
        found: true,
        anchor,
        error: `Unsupported algorithm: ${anchor.algorithm}`
      };
    }

    // Validate validity period
    const now = new Date();
    const validFrom = new Date(anchor.valid_from);
    const validUntil = new Date(anchor.valid_until);

    if (now < validFrom) {
      return {
        found: true,
        anchor,
        error: 'Trust anchor not yet valid'
      };
    }

    if (now > validUntil) {
      return {
        found: true,
        anchor,
        error: 'Trust anchor expired'
      };
    }

    return {
      found: true,
      anchor
    };
  }

  /**
   * Get public key for verification
   *
   * Returns base64-encoded public key if anchor is valid
   */
  getPublicKey(anchorId: string): { found: boolean; publicKey?: string; error?: string } {
    const result = this.resolveAnchor(anchorId);

    if (!result.found) {
      return {
        found: false,
        error: result.error
      };
    }

    if (result.error) {
      return {
        found: true,
        error: result.error
      };
    }

    return {
      found: true,
      publicKey: result.anchor!.public_key
    };
  }

  /**
   * List all active anchors
   */
  listActiveAnchors(): TrustAnchor[] {
    if (!this.anchorSet) {
      return [];
    }

    const now = new Date();

    return this.anchorSet.anchors.filter(a => {
      if (a.status !== 'active') return false;

      const validFrom = new Date(a.valid_from);
      const validUntil = new Date(a.valid_until);

      return now >= validFrom && now <= validUntil;
    });
  }

  /**
   * Validate entire anchor set structure
   * Educational: shows what fields are required
   */
  validateAnchorSet(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.anchorSet) {
      return { valid: false, errors: ['Trust anchor set not loaded'] };
    }

    // Check version
    if (!this.anchorSet.anchor_set_version) {
      errors.push('Missing anchor_set_version');
    }

    // Check anchors array
    if (!Array.isArray(this.anchorSet.anchors)) {
      errors.push('Missing or invalid anchors array');
      return { valid: false, errors };
    }

    // Validate each anchor
    this.anchorSet.anchors.forEach((anchor, index) => {
      if (!anchor.anchor_id) {
        errors.push(`Anchor ${index}: Missing anchor_id`);
      }
      if (!anchor.version) {
        errors.push(`Anchor ${index}: Missing version`);
      }
      if (!anchor.issuer) {
        errors.push(`Anchor ${index}: Missing issuer`);
      } else {
        if (!anchor.issuer.issuer_id) {
          errors.push(`Anchor ${index}: Missing issuer.issuer_id`);
        }
        if (!anchor.issuer.key_id) {
          errors.push(`Anchor ${index}: Missing issuer.key_id`);
        }
      }
      if (!anchor.public_key) {
        errors.push(`Anchor ${index}: Missing public_key`);
      }
      if (!anchor.algorithm) {
        errors.push(`Anchor ${index}: Missing algorithm`);
      } else if (anchor.algorithm !== 'Ed25519') {
        errors.push(`Anchor ${index}: Invalid algorithm: ${anchor.algorithm}`);
      }
      if (!anchor.valid_from) {
        errors.push(`Anchor ${index}: Missing valid_from`);
      }
      if (!anchor.valid_until) {
        errors.push(`Anchor ${index}: Missing valid_until`);
      }
      if (!['active', 'expired', 'revoked', 'suspended'].includes(anchor.status)) {
        errors.push(`Anchor ${index}: Invalid status: ${anchor.status}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Example usage and demonstration
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  console.log('='.repeat(60));
  console.log('DigiEmu Secure Trust Anchor Resolver Prototype');
  console.log('='.repeat(60));
  console.log();

  // Example: Create a sample trust anchor set for demonstration
  const sampleAnchorSet: TrustAnchorSet = {
    anchor_set_version: '0.3',
    last_updated: new Date().toISOString(),
    anchors: [
      {
        anchor_id: 'gazacare-production-2026',
        version: '0.3',
        issuer: {
          issuer_id: 'org:gazacare:field-ops:triage-system',
          key_id: 'signing-key-2026-q1'
        },
        public_key: 'g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=',
        algorithm: 'Ed25519',
        valid_from: '2026-01-01T00:00:00Z',
        valid_until: '2026-06-30T23:59:59Z',
        status: 'active'
      },
      {
        anchor_id: 'example-suspended',
        version: '0.3',
        issuer: {
          issuer_id: 'org:example:suspended',
          key_id: 'suspended-key'
        },
        public_key: 'suspendedPublicKeyExample=',
        algorithm: 'Ed25519',
        valid_from: '2026-01-01T00:00:00Z',
        valid_until: '2026-12-31T23:59:59Z',
        status: 'suspended'
      },
      {
        anchor_id: 'example-expired',
        version: '0.3',
        issuer: {
          issuer_id: 'org:example:expired',
          key_id: 'expired-key-2025'
        },
        public_key: 'expiredPublicKeyExample=',
        algorithm: 'Ed25519',
        valid_from: '2025-01-01T00:00:00Z',
        valid_until: '2025-12-31T23:59:59Z',
        status: 'active'
      }
    ]
  };

  // Write sample anchor set to temp file
  const tempAnchorPath = './examples/sample-trust-anchors.json';

  // Ensure examples directory exists
  if (!fs.existsSync('./examples')) {
    fs.mkdirSync('./examples', { recursive: true });
  }

  fs.writeFileSync(tempAnchorPath, JSON.stringify(sampleAnchorSet, null, 2));
  console.log(`Created sample trust anchor set: ${tempAnchorPath}`);
  console.log();

  // Demonstrate resolver
  const resolver = new TrustAnchorResolver(tempAnchorPath);

  // Load anchor set
  console.log('1. Loading trust anchor set...');
  if (!resolver.load()) {
    process.exit(1);
  }
  console.log();

  // Validate anchor set
  console.log('2. Validating anchor set structure...');
  const validation = resolver.validateAnchorSet();
  console.log(`   Valid: ${validation.valid}`);
  if (!validation.valid) {
    console.log(`   Errors: ${validation.errors.join(', ')}`);
  }
  console.log();

  // List active anchors
  console.log('3. Active trust anchors:');
  const activeAnchors = resolver.listActiveAnchors();
  activeAnchors.forEach(anchor => {
    console.log(`   - ${anchor.anchor_id}`);
    console.log(`     Issuer: ${anchor.issuer.issuer_id}`);
    console.log(`     Key: ${anchor.issuer.key_id}`);
  });
  console.log();

  // Resolve by anchor_id
  console.log('4. Resolving by anchor_id (GazaCare):');
  const anchorResult = resolver.resolveAnchor('gazacare-production-2026');
  console.log(`   Found: ${anchorResult.found}`);
  if (anchorResult.anchor) {
    console.log(`   Anchor ID: ${anchorResult.anchor.anchor_id}`);
    console.log(`   Issuer: ${anchorResult.anchor.issuer.issuer_id}`);
    console.log(`   Algorithm: ${anchorResult.anchor.algorithm}`);
    console.log(`   Status: ${anchorResult.anchor.status}`);
  }
  console.log();

  // Get public key
  console.log('5. Getting public key:');
  const keyResult = resolver.getPublicKey('gazacare-production-2026');
  console.log(`   Found: ${keyResult.found}`);
  if (keyResult.publicKey) {
    console.log(`   Public Key: ${keyResult.publicKey.substring(0, 20)}...`);
  }
  console.log();

  // Resolve by issuer_id
  console.log('6. Resolving by issuer_id:');
  const byIssuerResult = resolver.resolveByIssuer('org:gazacare:field-ops:triage-system');
  console.log(`   Found: ${byIssuerResult.found}`);
  if (byIssuerResult.anchor) {
    console.log(`   Anchor: ${byIssuerResult.anchor.anchor_id}`);
  }
  console.log();

  // Resolve suspended anchor
  console.log('7. Resolving suspended anchor:');
  const suspendedResult = resolver.resolveAnchor('example-suspended');
  console.log(`   Found: ${suspendedResult.found}`);
  console.log(`   Error: ${suspendedResult.error}`);
  console.log();

  // Resolve expired anchor
  console.log('8. Resolving expired anchor:');
  const expiredResult = resolver.resolveAnchor('example-expired');
  console.log(`   Found: ${expiredResult.found}`);
  console.log(`   Error: ${expiredResult.error}`);
  console.log();

  // Resolve unknown anchor
  console.log('9. Resolving unknown anchor:');
  const unknownResult = resolver.resolveAnchor('unknown-anchor');
  console.log(`   Found: ${unknownResult.found}`);
  console.log(`   Error: ${unknownResult.error}`);
  console.log();

  console.log('='.repeat(60));
  console.log('Trust anchor resolver demonstration complete');
  console.log('='.repeat(60));
  console.log();
  console.log('This prototype demonstrates:');
  console.log('- Loading trust anchor set from JSON file');
  console.log('- Resolving anchors by ID or issuer ID');
  console.log('- Validating status, algorithm, and validity period');
  console.log('- Retrieving public keys for verification');
  console.log('- Error handling for invalid/expired anchors');
  console.log();
  console.log('See docs/DigiEmu_Secure_v0_3_Trust_Anchor_Model.md for full specification.');
}
