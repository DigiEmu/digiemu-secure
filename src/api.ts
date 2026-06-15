/**
 * DigiEmu Secure API MVP
 *
 * HTTP API for evidence verification.
 * Implements endpoints from v0.6 API Profile.
 *
 * Endpoints:
 *   POST /verify       - Verify evidence bundle
 *   POST /bundle/verify - Verify evidence bundle (alias)
 *
 * This is an educational prototype demonstrating the API
 * as defined in DigiEmu_Secure_v0_6_API_Profile.md
 */

import express, { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { BundleVerifier } from './bundle-verifier.js';
import { RegistryResolver } from './registry-resolver.js';
import { TrustAnchorResolver } from './trust-anchor-resolver.js';

// Types
interface VerifyRequest {
  bundle: {
    bundle_id?: string;
    bundle_version?: string;
    canonical_snapshot?: unknown;
    snapshot_hash?: { algorithm: string; value: string };
    signed_receipt?: {
      receipt_id?: string;
      version?: string;
      signature?: {
        algorithm?: string;
        issuer?: string;
        key_id?: string;
        public_key?: string;
        signature_value?: string;
        signed_at?: string;
      };
    };
  };
  strict_registry?: boolean;
}

interface VerifyResponse {
  status: 'success' | 'failure' | 'incomplete';
  outcome: 'SECURE_PASS' | 'SECURE_FAIL' | 'SECURE_INCOMPLETE';
  bundle_id?: string;
  receipt_id?: string;
  checks_passed: number;
  checks_total: number;
  failure_codes?: Array<{ code: string; name: string; severity: string; step: number; description: string }>;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Secure API Server
 *
 * Express server implementing Secure verification endpoints.
 */
class SecureAPI {
  private app = express();
  private verifier = new BundleVerifier();
  private registryResolver: RegistryResolver | null = null;
  private trustAnchorResolver: TrustAnchorResolver | null = null;
  private port: number;

  constructor(port: number = 3000) {
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // JSON body parsing with 10MB limit
    this.app.use(express.json({ 
      limit: '10mb',
      type: 'application/json'
    }));

    // Handle payload too large errors
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      if (err.type === 'entity.too.large') {
        res.status(413).json({
          status: 'error',
          error: {
            code: 'PAYLOAD_TOO_LARGE',
            message: 'Request body exceeds 10MB limit'
          }
        });
        return;
      }
      next(err);
    });

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });

    // CORS (allow all for prototype)
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * Content-Type validation middleware for POST endpoints
   */
  private requireJsonContentType(req: Request, res: Response, next: NextFunction): void {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      res.status(415).json({
        status: 'error',
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: 'Content-Type must be application/json'
        }
      });
      return;
    }
    next();
  }

  /**
   * Configure API routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', service: 'digiemu-secure-api', version: '0.9.0' });
    });

    // Verify endpoint (POST /verify) - requires application/json
    this.app.post('/verify', this.requireJsonContentType.bind(this), this.handleVerify.bind(this));

    // Bundle verify endpoint (POST /bundle/verify - alias) - requires application/json
    this.app.post('/bundle/verify', this.requireJsonContentType.bind(this), this.handleVerify.bind(this));

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        status: 'error',
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${req.method} ${req.path} not found`
        }
      });
    });
  }

  /**
   * Error handling middleware
   */
  private setupErrorHandling(): void {
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      console.error('API Error:', err);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        }
      });
    });
  }

  /**
   * Handle verify request
   */
  private handleVerify(req: Request, res: Response): void {
    try {
      const request = req.body as VerifyRequest;

      // Validate request
      if (!request.bundle) {
        res.status(400).json({
          status: 'error',
          error: {
            code: 'INVALID_INPUT',
            message: 'Missing required field: bundle'
          }
        });
        return;
      }

      // Set strict registry mode if requested
      if (request.strict_registry) {
        this.verifier.setStrictMode(true);
      }

      // Create temporary file for bundle (bundle verifier expects file path)
      // Use crypto.randomUUID() to prevent race condition attacks
      const tempDir = process.env.TEMP || process.env.TMP || '/tmp';
      const tempPath = `${tempDir}/secure-api-bundle-${crypto.randomUUID()}.json`;
      fs.writeFileSync(tempPath, JSON.stringify(request.bundle, null, 2));

      try {
        // Verify bundle
        const result = this.verifier.verifyBundle(tempPath);

        // Clean up temp file
        fs.unlinkSync(tempPath);

        // Map verification result to API response
        const response: VerifyResponse = {
          status: result.outcome === 'SECURE_PASS' ? 'success' :
                  result.outcome === 'SECURE_FAIL' ? 'failure' : 'incomplete',
          outcome: result.outcome,
          bundle_id: result.bundle_id,
          receipt_id: result.receipt_id,
          checks_passed: result.summary.passed,
          checks_total: result.summary.total,
          failure_codes: result.failure_codes
        };

        // Determine HTTP status code
        const statusCode = result.outcome === 'SECURE_PASS' ? 200 :
                          result.outcome === 'SECURE_FAIL' ? 409 :
                          503;

        res.status(statusCode).json(response);

      } catch (verifyError) {
        // Clean up temp file
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore cleanup errors
        }
        throw verifyError;
      }

    } catch (error) {
      console.error('Verify error:', error);
      res.status(500).json({
        status: 'error',
        error: {
          code: 'VERIFICATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  /**
   * Set up registry for registry-backed verification
   */
  setRegistry(registryPath: string, trustAnchorPath: string): boolean {
    this.registryResolver = new RegistryResolver(registryPath);
    this.trustAnchorResolver = new TrustAnchorResolver(trustAnchorPath);

    const registryLoaded = this.registryResolver.load();
    const trustAnchorLoaded = this.trustAnchorResolver.load();

    if (registryLoaded && trustAnchorLoaded) {
      this.verifier.setRegistry(registryPath, trustAnchorPath);
      console.log('Registry configured for API');
      return true;
    } else {
      console.warn('Failed to load registry or trust anchor');
      return false;
    }
  }

  /**
   * Start the API server
   */
  start(): void {
    this.app.listen(this.port, () => {
      console.log('='.repeat(60));
      console.log('DigiEmu Secure API Server');
      console.log('='.repeat(60));
      console.log();
      console.log(`Server running on http://localhost:${this.port}`);
      console.log();
      console.log('Endpoints:');
      console.log(`  POST http://localhost:${this.port}/verify`);
      console.log(`  POST http://localhost:${this.port}/bundle/verify`);
      console.log(`  GET  http://localhost:${this.port}/health`);
      console.log();
      console.log('Example request:');
      console.log(`  curl -X POST http://localhost:${this.port}/verify \\\n    -H "Content-Type: application/json" \\\n    -d '{"bundle": {...}}'`);
      console.log();
      console.log('Press Ctrl+C to stop');
      console.log('='.repeat(60));
    });
  }
}

// Main execution
import { fileURLToPath } from 'node:url';

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  const port = parseInt(process.env.PORT || '3000', 10);
  const api = new SecureAPI(port);

  // Configure registry if paths provided via environment
  const registryPath = process.env.REGISTRY_PATH;
  const trustAnchorPath = process.env.TRUST_ANCHOR_PATH;

  if (registryPath && trustAnchorPath) {
    api.setRegistry(registryPath, trustAnchorPath);
  }

  api.start();
}

export { SecureAPI };
