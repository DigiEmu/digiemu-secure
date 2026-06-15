import { readFileSync } from "node:fs";
import { createPublicKey, verify } from "node:crypto";
import { canonicalJson } from "./canonical-json.js";
import type { SecureReceiptSigned, SecureVerificationReport } from "./types.js";

const receiptPath = process.argv[2];
const publicKeyPath = process.argv[3] ?? "examples/test-public-key.pem";

if (!receiptPath) {
  console.error("Usage: tsx src/verify-receipt.ts <signed-receipt.json> [public-key.pem]");
  process.exit(1);
}

const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as SecureReceiptSigned;
const { signature, ...unsignedPayload } = receipt;

const structureValid = Boolean(receipt.receipt_id && receipt.signature?.value && receipt.issuer?.key_id);
const profileSupported = receipt.receipt_version === "DigiEmu-Secure-Receipt-v0.1" && receipt.core_profile === "DigiEmu-Core-2.0";

let issuerKeyResolved = false;
let signatureValid = false;

try {
  const publicKey = createPublicKey(readFileSync(publicKeyPath, "utf8"));
  issuerKeyResolved = true;
  signatureValid = verify(
    null,
    Buffer.from(canonicalJson(unsignedPayload)),
    publicKey,
    Buffer.from(signature.value, "base64")
  );
} catch {
  issuerKeyResolved = false;
  signatureValid = false;
}

const outcome = structureValid && profileSupported && issuerKeyResolved && signatureValid
  ? "SECURE_PASS"
  : "SECURE_FAIL";

const report: SecureVerificationReport = {
  report_version: "DigiEmu-Secure-Verification-Report-v0.1",
  receipt_id: receipt.receipt_id ?? "UNKNOWN",
  outcome,
  checks: {
    structure_valid: structureValid,
    profile_supported: profileSupported,
    issuer_key_resolved: issuerKeyResolved,
    signature_valid: signatureValid
  },
  verified_at: new Date().toISOString()
};

console.log(JSON.stringify(report, null, 2));
