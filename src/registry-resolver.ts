/**
 * DigiEmu Secure Registry Resolver Prototype
 * 
 * Minimal reference implementation for issuer registry resolution.
 * Loads registry from JSON file and provides issuer/key lookup.
 * 
 * This is an educational prototype demonstrating the registry resolution
 * concept defined in DigiEmu_Secure_v0_3_Issuer_Registry_Profile.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'node:url';

// Types matching the v0.3 Issuer Registry Profile

interface RegistryKey {
  key_id: string;
  algorithm: 'Ed25519';
  public_key: string;
  status: 'active' | 'expired' | 'revoked' | 'suspended';
  valid_from: string;
  valid_until?: string;
}

interface RegistryIssuer {
  issuer_id: string;
  issuer_name: string;
  status: 'active' | 'suspended' | 'revoked';
  keys: RegistryKey[];
}

interface IssuerRegistry {
  registry_version: string;
  last_updated: string;
  issuers: RegistryIssuer[];
}

interface IssuerResolutionResult {
  found: boolean;
  issuer?: RegistryIssuer;
  error?: string;
}

interface KeyResolutionResult {
  found: boolean;
  key?: RegistryKey;
  error?: string;
}

/**
 * Registry Resolver class
 * 
 * Loads and queries issuer registry from JSON file.
 * No networking - file-based only for simplicity.
 */
export class RegistryResolver {
  private registry: IssuerRegistry | null = null;
  private registryPath: string;

  constructor(registryPath: string) {
    this.registryPath = path.resolve(registryPath);
  }

  /**
   * Load registry from file
   * Must be called before resolve operations
   */
  load(): boolean {
    try {
      if (!fs.existsSync(this.registryPath)) {
        console.error(`Registry file not found: ${this.registryPath}`);
        return false;
      }

      const content = fs.readFileSync(this.registryPath, 'utf-8');
      this.registry = JSON.parse(content) as IssuerRegistry;
      
      console.log(`Registry loaded: ${this.registry.issuers.length} issuers`);
      return true;
    } catch (error) {
      console.error(`Failed to load registry: ${error}`);
      return false;
    }
  }

  /**
   * Resolve issuer by issuer_id
   * 
   * Returns issuer metadata if found and active
   */
  resolveIssuer(issuerId: string): IssuerResolutionResult {
    if (!this.registry) {
      return {
        found: false,
        error: 'Registry not loaded'
      };
    }

    const issuer = this.registry.issuers.find(i => i.issuer_id === issuerId);

    if (!issuer) {
      return {
        found: false,
        error: `Issuer not found: ${issuerId}`
      };
    }

    // Validate issuer status (SEC-006, SEC-010 equivalent)
    if (issuer.status === 'revoked') {
      return {
        found: true,
        issuer,
        error: 'Issuer revoked'
      };
    }

    if (issuer.status === 'suspended') {
      return {
        found: true,
        issuer,
        error: 'Issuer suspended'
      };
    }

    return {
      found: true,
      issuer
    };
  }

  /**
   * Resolve key by issuer_id and key_id
   * 
   * Returns key metadata if found and valid
   */
  resolveKey(issuerId: string, keyId: string): KeyResolutionResult {
    const issuerResult = this.resolveIssuer(issuerId);

    if (!issuerResult.found) {
      return {
        found: false,
        error: issuerResult.error
      };
    }

    const issuer = issuerResult.issuer!;
    const key = issuer.keys.find(k => k.key_id === keyId);

    if (!key) {
      return {
        found: false,
        error: `Key not found: ${keyId}`
      };
    }

    // Validate key status (SEC-007, SEC-008, SEC-009, SEC-010 equivalent)
    const now = new Date();
    const validFrom = new Date(key.valid_from);
    const validUntil = key.valid_until ? new Date(key.valid_until) : null;

    if (key.status === 'revoked') {
      return {
        found: true,
        key,
        error: 'Key revoked'
      };
    }

    if (key.status === 'expired' || (validUntil && now > validUntil)) {
      return {
        found: true,
        key,
        error: 'Key expired'
      };
    }

    if (key.status === 'suspended') {
      return {
        found: true,
        key,
        error: 'Key suspended'
      };
    }

    if (now < validFrom) {
      return {
        found: true,
        key,
        error: 'Key not yet valid'
      };
    }

    return {
      found: true,
      key
    };
  }

  /**
   * Get all active issuers
   */
  listActiveIssuers(): RegistryIssuer[] {
    if (!this.registry) {
      return [];
    }

    return this.registry.issuers.filter(i => i.status === 'active');
  }

  /**
   * Validate entire registry structure
   * Educational: shows what fields are required
   */
  validateRegistry(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.registry) {
      return { valid: false, errors: ['Registry not loaded'] };
    }

    // Check registry version
    if (!this.registry.registry_version) {
      errors.push('Missing registry_version');
    }

    // Check issuers array
    if (!Array.isArray(this.registry.issuers)) {
      errors.push('Missing or invalid issuers array');
      return { valid: false, errors };
    }

    // Validate each issuer
    this.registry.issuers.forEach((issuer, index) => {
      if (!issuer.issuer_id) {
        errors.push(`Issuer ${index}: Missing issuer_id`);
      }
      if (!issuer.issuer_name) {
        errors.push(`Issuer ${index}: Missing issuer_name`);
      }
      if (!['active', 'suspended', 'revoked'].includes(issuer.status)) {
        errors.push(`Issuer ${index}: Invalid status: ${issuer.status}`);
      }
      if (!Array.isArray(issuer.keys)) {
        errors.push(`Issuer ${index}: Missing or invalid keys array`);
      } else {
        // Validate each key
        issuer.keys.forEach((key, keyIndex) => {
          if (!key.key_id) {
            errors.push(`Issuer ${index}, Key ${keyIndex}: Missing key_id`);
          }
          if (!key.public_key) {
            errors.push(`Issuer ${index}, Key ${keyIndex}: Missing public_key`);
          }
          if (!['active', 'expired', 'revoked', 'suspended'].includes(key.status)) {
            errors.push(`Issuer ${index}, Key ${keyIndex}: Invalid status: ${key.status}`);
          }
        });
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
  console.log('DigiEmu Secure Registry Resolver Prototype');
  console.log('='.repeat(60));
  console.log();

  // Example: Create a sample registry file for demonstration
  const sampleRegistry: IssuerRegistry = {
    registry_version: '0.3',
    last_updated: new Date().toISOString(),
    issuers: [
      {
        issuer_id: 'org:gazacare:field-ops:triage-system',
        issuer_name: 'GazaCare Field Operations Triage System',
        status: 'active',
        keys: [
          {
            key_id: 'signing-key-2026-q1',
            algorithm: 'Ed25519',
            public_key: 'g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=',
            status: 'active',
            valid_from: '2026-01-01T00:00:00Z',
            valid_until: '2026-06-30T23:59:59Z'
          }
        ]
      },
      {
        issuer_id: 'org:example:suspended:demo',
        issuer_name: 'Example Suspended Issuer (Demo)',
        status: 'suspended',
        keys: []
      },
      {
        issuer_id: 'org:example:expired:key-demo',
        issuer_name: 'Example Expired Key Issuer (Demo)',
        status: 'active',
        keys: [
          {
            key_id: 'expired-key-2025',
            algorithm: 'Ed25519',
            public_key: 'dummyPublicKeyForDemo==',
            status: 'expired',
            valid_from: '2025-01-01T00:00:00Z',
            valid_until: '2025-12-31T23:59:59Z'
          }
        ]
      }
    ]
  };

  // Write sample registry to temp file
  const tempRegistryPath = './examples/sample-registry.json';
  
  // Ensure examples directory exists
  if (!fs.existsSync('./examples')) {
    fs.mkdirSync('./examples', { recursive: true });
  }
  
  fs.writeFileSync(tempRegistryPath, JSON.stringify(sampleRegistry, null, 2));
  console.log(`Created sample registry: ${tempRegistryPath}`);
  console.log();

  // Demonstrate resolver
  const resolver = new RegistryResolver(tempRegistryPath);

  // Load registry
  console.log('1. Loading registry...');
  if (!resolver.load()) {
    process.exit(1);
  }
  console.log();

  // Validate registry
  console.log('2. Validating registry structure...');
  const validation = resolver.validateRegistry();
  console.log(`   Valid: ${validation.valid}`);
  if (!validation.valid) {
    console.log(`   Errors: ${validation.errors.join(', ')}`);
  }
  console.log();

  // List active issuers
  console.log('3. Active issuers:');
  const activeIssuers = resolver.listActiveIssuers();
  activeIssuers.forEach(issuer => {
    console.log(`   - ${issuer.issuer_name} (${issuer.issuer_id})`);
    console.log(`     Keys: ${issuer.keys.length}`);
  });
  console.log();

  // Resolve known issuer
  console.log('4. Resolving known issuer (GazaCare):');
  const issuerResult = resolver.resolveIssuer('org:gazacare:field-ops:triage-system');
  console.log(`   Found: ${issuerResult.found}`);
  if (issuerResult.issuer) {
    console.log(`   Name: ${issuerResult.issuer.issuer_name}`);
    console.log(`   Status: ${issuerResult.issuer.status}`);
  }
  console.log();

  // Resolve unknown issuer
  console.log('5. Resolving unknown issuer:');
  const unknownResult = resolver.resolveIssuer('org:unknown:test');
  console.log(`   Found: ${unknownResult.found}`);
  console.log(`   Error: ${unknownResult.error}`);
  console.log();

  // Resolve suspended issuer
  console.log('6. Resolving suspended issuer:');
  const suspendedResult = resolver.resolveIssuer('org:example:suspended:demo');
  console.log(`   Found: ${suspendedResult.found}`);
  console.log(`   Error: ${suspendedResult.error}`);
  console.log();

  // Resolve key
  console.log('7. Resolving active key:');
  const keyResult = resolver.resolveKey(
    'org:gazacare:field-ops:triage-system',
    'signing-key-2026-q1'
  );
  console.log(`   Found: ${keyResult.found}`);
  if (keyResult.key) {
    console.log(`   Key ID: ${keyResult.key.key_id}`);
    console.log(`   Algorithm: ${keyResult.key.algorithm}`);
    console.log(`   Status: ${keyResult.key.status}`);
    console.log(`   Valid: ${keyResult.key.valid_from} to ${keyResult.key.valid_until}`);
  }
  console.log();

  // Resolve expired key
  console.log('8. Resolving expired key:');
  const expiredKeyResult = resolver.resolveKey(
    'org:example:expired:key-demo',
    'expired-key-2025'
  );
  console.log(`   Found: ${expiredKeyResult.found}`);
  console.log(`   Error: ${expiredKeyResult.error}`);
  console.log();

  console.log('='.repeat(60));
  console.log('Registry resolver demonstration complete');
  console.log('='.repeat(60));
  console.log();
  console.log('This prototype demonstrates:');
  console.log('- Loading issuer registry from JSON file');
  console.log('- Resolving issuers by ID with status validation');
  console.log('- Resolving keys with validity period checking');
  console.log('- Error handling for missing/expired/revoked entries');
  console.log();
  console.log('See docs/DigiEmu_Secure_v0_3_Issuer_Registry_Profile.md for full specification.');
}
