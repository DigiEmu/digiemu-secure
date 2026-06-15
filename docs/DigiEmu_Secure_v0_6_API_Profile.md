# DigiEmu Secure v0.6 API Profile

This document defines the normative HTTP API surface for DigiEmu Secure, establishing standard endpoints, request/response formats, and behavior for REST API implementations.

## Purpose

The API profile ensures that:

- HTTP API implementations are consistent across different services
- API consumers can rely on predictable endpoint behavior
- HTTP status codes unambiguously indicate success or failure
- API responses support programmatic integration
- Deterministic verification semantics are preserved over HTTP transport

## API Conformance

Implementations MUST support the endpoints and formats defined in this profile to achieve API conformance. Optional extensions are marked with OPTIONAL.

## Base URL and Versioning

API versioning is included in the URL path:

```
https://api.example.com/v1/secure/{endpoint}
```

Version mapping:

| API Version | DigiEmu Secure Version | Status |
|-------------|------------------------|--------|
| v1 | v0.4 - v0.6 | Current |
| v2 | v1.0+ | Future |

## HTTP Status Code Mapping

| Status Code | Meaning | Secure Outcome |
|-------------|---------|----------------|
| **200** OK | Operation successful | SECURE_PASS or success |
| **400** Bad Request | Invalid input | Input validation error |
| **401** Unauthorized | Authentication required | Access denied |
| **403** Forbidden | Insufficient permissions | Access denied |
| **404** Not Found | Issuer or key not found | ISSUER_NOT_FOUND or KEY_NOT_FOUND |
| **409** Conflict | Verification failure | SECURE_FAIL |
| **422** Unprocessable Entity | Semantic errors | Bundle validation error |
| **500** Internal Server Error | Server error | Runtime error |
| **503** Service Unavailable | Registry unavailable | SECURE_INCOMPLETE |

## Endpoints

### POST /sign

Sign evidence and create a signed receipt.

**Request:**

```http
POST /v1/secure/sign HTTP/1.1
Content-Type: application/json
Authorization: Bearer {token}

{
  "evidence": {
    "event_type": "TRIAGE_ASSESSMENT",
    "event_id": "TRG-2026-0847-001",
    "timestamp": "2026-01-15T14:32:17Z",
    "data": { ... }
  },
  "issuer": "org:gazacare:field-ops:triage-system",
  "key_id": "signing-key-2026-q1"
}
```

**Response (200 OK):**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "receipt": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "version": "0.2",
    "created_at": "2026-01-15T14:32:18Z",
    "canonical_snapshot": { ... },
    "snapshot_hash": {
      "algorithm": "SHA-256",
      "value": "a3f5c8e9d2b1476f8019a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d"
    },
    "signature": {
      "algorithm": "Ed25519",
      "issuer": "org:gazacare:field-ops:triage-system",
      "key_id": "signing-key-2026-q1",
      "public_key": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=",
      "signature_value": "3f2a8b4c...",
      "signed_at": "2026-01-15T14:32:18Z"
    }
  }
}
```

**Error Response (400 Bad Request):**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_INPUT",
    "message": "Missing required field: evidence.timestamp",
    "failure_code": "SEC-001",
    "details": {
      "field": "evidence.timestamp",
      "constraint": "required"
    }
  }
}
```

**Error Response (401 Unauthorized):**

```json
{
  "status": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Valid authentication token required"
  }
}
```

**Error Response (403 Forbidden):**

```json
{
  "status": "error",
  "error": {
    "code": "FORBIDDEN",
    "message": "Issuer org:gazacare:field-ops:triage-system not authorized for this credential"
  }
}
```

### POST /verify

Verify evidence receipt.

**Request:**

```http
POST /v1/secure/verify HTTP/1.1
Content-Type: application/json

{
  "receipt": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "signature": {
      "issuer": "org:gazacare:field-ops:triage-system",
      "key_id": "signing-key-2026-q1",
      "signature_value": "3f2a8b4c..."
    }
  },
  "canonical_snapshot": { ... },
  "snapshot_hash": { ... }
}
```

**Response (200 OK - SECURE_PASS):**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "status": "success",
  "outcome": "SECURE_PASS",
  "verification": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "issuer": "org:gazacare:field-ops:triage-system",
    "key_id": "signing-key-2026-q1",
    "verified_at": "2026-01-15T16:20:00Z",
    "checks": [
      { "step": 1, "check": "BUNDLE_STRUCTURE", "status": "PASS" },
      { "step": 4, "check": "SNAPSHOT_HASH", "status": "PASS" },
      { "step": 8, "check": "SIGNATURE_VERIFICATION", "status": "PASS" }
    ],
    "summary": {
      "total_checks": 8,
      "passed": 8,
      "failed": 0
    },
    "conclusion": "Evidence cryptographically authentic and integrity verified."
  }
}
```

**Response (409 Conflict - SECURE_FAIL):**

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "status": "failure",
  "outcome": "SECURE_FAIL",
  "verification": {
    "receipt_id": "RCPT-2026-0847-001-A7F3",
    "checks": [
      { "step": 1, "check": "BUNDLE_STRUCTURE", "status": "PASS" },
      { "step": 4, "check": "SNAPSHOT_HASH", "status": "FAIL" }
    ],
    "failure_codes": [
      {
        "code": "SEC-004",
        "name": "HASH_MISMATCH",
        "severity": "CRITICAL",
        "description": "Computed hash does not match stored hash"
      }
    ],
    "summary": {
      "total_checks": 8,
      "passed": 3,
      "failed": 1
    }
  }
}
```

**Response (404 Not Found):**

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "status": "error",
  "error": {
    "code": "ISSUER_NOT_FOUND",
    "message": "Issuer not found in registry",
    "failure_code": "SEC-006",
    "details": {
      "issuer": "org:unknown:division",
      "registry_queried": "production"
    }
  }
}
```

**Response (503 Service Unavailable):**

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
Retry-After: 300

{
  "status": "incomplete",
  "outcome": "SECURE_INCOMPLETE",
  "error": {
    "code": "ISSUER_REGISTRY_UNREACHABLE",
    "message": "Cannot contact issuer registry",
    "failure_code": "SEC-013",
    "retry_recommended": true,
    "retry_after_seconds": 300
  }
}
```

### POST /bundle/create

Create a complete evidence bundle.

**Request:**

```http
POST /v1/secure/bundle/create HTTP/1.1
Content-Type: application/json
Authorization: Bearer {token}

{
  "evidence": { ... },
  "issuer": "org:gazacare:field-ops:triage-system",
  "key_id": "signing-key-2026-q1",
  "metadata": {
    "purpose": "triage_evidence",
    "retention_policy": "healthcare_7_year"
  }
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "bundle": {
    "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
    "bundle_version": "0.4",
    "created_at": "2026-01-15T14:35:42Z",
    "canonical_snapshot": { ... },
    "snapshot_hash": { ... },
    "signed_receipt": { ... },
    "metadata": { ... }
  }
}
```

### POST /bundle/verify

Verify a complete evidence bundle.

**Request:**

```http
POST /v1/secure/bundle/verify HTTP/1.1
Content-Type: application/json

{
  "bundle": {
    "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
    "bundle_version": "0.4",
    "canonical_snapshot": { ... },
    "snapshot_hash": { ... },
    "signed_receipt": { ... }
  }
}
```

**Response (200 OK - SECURE_PASS):**

```json
{
  "status": "success",
  "outcome": "SECURE_PASS",
  "bundle_id": "BNDL-2026-0847-001-A7F3-9X2M",
  "verification": {
    "report_id": "VRPT-2026-0847-001-A7F3-20260115",
    "verified_at": "2026-01-15T16:20:00Z",
    "checks": [
      { "step": 1, "check": "BUNDLE_STRUCTURE", "status": "PASS" },
      { "step": 2, "check": "BUNDLE_VERSION", "status": "PASS" },
      { "step": 3, "check": "CANONICAL_SNAPSHOT", "status": "PASS" },
      { "step": 4, "check": "SNAPSHOT_HASH", "status": "PASS" },
      { "step": 5, "check": "RECEIPT_STRUCTURE", "status": "PASS" },
      { "step": 6, "check": "ISSUER_RESOLUTION", "status": "PASS" },
      { "step": 7, "check": "KEY_RESOLUTION", "status": "PASS" },
      { "step": 8, "check": "SIGNATURE_VERIFICATION", "status": "PASS" },
      { "step": 9, "check": "REPORT_CONSISTENCY", "status": "PASS" },
      { "step": 10, "check": "OUTCOME_GENERATION", "status": "PASS" }
    ],
    "summary": {
      "total_checks": 10,
      "passed": 10,
      "failed": 0
    }
  }
}
```

### GET /issuer/{issuer_id}

Retrieve issuer information from registry.

**Request:**

```http
GET /v1/secure/issuer/org:gazacare:field-ops:triage-system HTTP/1.1
Accept: application/json
```

**Response (200 OK):**

```json
{
  "status": "success",
  "issuer": {
    "issuer_id": "org:gazacare:field-ops:triage-system",
    "issuer_name": "GazaCare Field Operations Triage System",
    "status": "active",
    "keys": [
      {
        "key_id": "signing-key-2026-q1",
        "algorithm": "Ed25519",
        "status": "active",
        "valid_from": "2026-01-01T00:00:00Z",
        "valid_until": "2026-06-30T23:59:59Z"
      }
    ]
  }
}
```

**Response (404 Not Found):**

```json
{
  "status": "error",
  "error": {
    "code": "ISSUER_NOT_FOUND",
    "message": "Issuer not found",
    "failure_code": "SEC-006"
  }
}
```

### GET /trust-anchor/{anchor_id}

Retrieve trust anchor information.

**Request:**

```http
GET /v1/secure/trust-anchor/gazacare-production-2026 HTTP/1.1
Accept: application/json
```

**Response (200 OK):**

```json
{
  "status": "success",
  "trust_anchor": {
    "anchor_id": "gazacare-production-2026",
    "version": "0.3",
    "issuer": {
      "issuer_id": "org:gazacare:field-ops:triage-system",
      "key_id": "signing-key-2026-q1"
    },
    "public_key": "g4OhNqDwR2XJqzBzTl9K8vLpQm3YsWvEiFxRnHd7J0k=",
    "algorithm": "Ed25519",
    "valid_from": "2026-01-01T00:00:00Z",
    "valid_until": "2026-06-30T23:59:59Z",
    "status": "active"
  }
}
```

## Authentication

API implementations MUST support one of these authentication methods:

| Method | Description | Use Case |
|--------|-------------|----------|
| **Bearer Token** | JWT or API key in Authorization header | Production APIs |
| **Mutual TLS** | Client certificate authentication | High-security environments |
| **API Key** | Key in header or query parameter | Internal services |

### Bearer Token Example

```http
Authorization: Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token claims should include:
- `sub`: Subject (service or user identifier)
- `iss`: Issuer (authentication service)
- `aud`: Audience (DigiEmu Secure API)
- `exp`: Expiration
- `scope`: Authorized operations (e.g., "secure:sign", "secure:verify")

## Rate Limiting

API implementations SHOULD implement rate limiting:

| Endpoint | Recommended Limit |
|----------|-----------------|
| POST /sign | 100/minute per issuer |
| POST /verify | 1000/minute per client |
| POST /bundle/create | 100/minute per issuer |
| POST /bundle/verify | 1000/minute per client |
| GET /issuer/* | 100/minute per client |
| GET /trust-anchor/* | 100/minute per client |

Rate limit headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642260000
```

## Deterministic Verification Semantics

API implementations MUST preserve deterministic verification:

1. **Canonicalization:** Server-side canonicalization MUST match client-side exactly
2. **Hash computation:** SHA-256 computation MUST be byte-for-byte identical
3. **Signature verification:** Ed25519 verification MUST use standard algorithm
4. **No server-side state:** Verification MUST NOT depend on server state (use registry only)
5. **Reproducibility:** Same input MUST produce same output, regardless of server

### Verification Consistency Guarantee

```
Client A ──▶ POST /verify(bundle) ──▶ Server 1 ──▶ Response: SECURE_PASS
                                                    │
Client B ──▶ POST /verify(bundle) ──▶ Server 2 ──▶ Response: SECURE_PASS
                                                    │
Result: Same bundle, different servers = same outcome
```

## Relationship to Other Profiles

### CLI Profile

API endpoints correspond to CLI commands:

| CLI Command | API Endpoint |
|-------------|--------------|
| `secure sign` | POST /sign |
| `secure verify` | POST /verify |
| `secure bundle create` | POST /bundle/create |
| `secure bundle verify` | POST /bundle/verify |
| `secure registry validate` | GET /issuer/{issuer_id} |

CLI and API implementations MUST produce identical verification outcomes for the same input.

### Verification Profile

API verification endpoints implement Verification Profile steps:

| API Endpoint | Verification Profile Steps |
|--------------|---------------------------|
| POST /verify | Steps 1, 4, 5, 8 (receipt verification) |
| POST /bundle/verify | Steps 1-10 (full bundle verification) |

API responses include the complete verification report matching the Verification Report Profile.

## Error Response Schema

All error responses follow this schema:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "failure_code": "SEC-XXX",
    "details": {
      "field": "...",
      "constraint": "..."
    },
    "request_id": "req-uuid-for-tracing"
  }
}
```

## CORS Support

For browser-based clients, APIs SHOULD support CORS:

```http
Access-Control-Allow-Origin: https://trusted-client.example.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Webhook Support (Optional)

For asynchronous operations, APIs MAY support webhooks:

```http
POST /sign HTTP/1.1
Content-Type: application/json

{
  "evidence": { ... },
  "issuer": "org:example",
  "key_id": "key-2026",
  "webhook_url": "https://client.example.com/webhooks/signing-complete"
}
```

Webhook payload:

```json
{
  "event": "signing.complete",
  "request_id": "req-123",
  "status": "success",
  "receipt": { ... }
}
```

## Summary

| Aspect | Specification |
|--------|---------------|
| **Endpoints** | 6 normative endpoints |
| **Status codes** | 9 standard HTTP codes |
| **Authentication** | Bearer token, mTLS, or API key |
| **Rate limiting** | Per-endpoint recommended limits |
| **Determinism** | Server-side verification MUST match client |
| **CLI parity** | API and CLI produce identical results |

The API profile provides a RESTful interface for DigiEmu Secure that preserves all verification semantics while enabling service-oriented architectures.
