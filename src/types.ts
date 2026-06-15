export type VerificationResult = "PASS" | "FAIL" | "INDETERMINATE";

export interface SecureIssuer {
  name: string;
  key_id: string;
}

export interface SecureSignature {
  algorithm: "Ed25519";
  value: string;
}

export interface SecureReceiptUnsigned {
  receipt_version: "DigiEmu-Secure-Receipt-v0.1";
  receipt_id: string;
  core_profile: "DigiEmu-Core-2.0";
  snapshot_id: string;
  snapshot_hash: string;
  verification_result: VerificationResult;
  issued_at: string;
  issuer: SecureIssuer;
}

export interface SecureReceiptSigned extends SecureReceiptUnsigned {
  signature: SecureSignature;
}

export interface SecureVerificationReport {
  report_version: "DigiEmu-Secure-Verification-Report-v0.1";
  receipt_id: string;
  outcome: "SECURE_PASS" | "SECURE_FAIL" | "SECURE_INDETERMINATE";
  checks: {
    structure_valid: boolean;
    profile_supported: boolean;
    issuer_key_resolved: boolean;
    signature_valid: boolean;
  };
  verified_at: string;
}
