import { readFileSync, writeFileSync } from "node:fs";
import { sign } from "node:crypto";
import { canonicalJson } from "./canonical-json.js";
import { createEphemeralEd25519KeyPair } from "./test-key.js";
import type { SecureReceiptSigned, SecureReceiptUnsigned } from "./types.js";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: tsx src/sign-receipt.ts <unsigned-receipt.json>");
  process.exit(1);
}

const receipt = JSON.parse(readFileSync(inputPath, "utf8")) as SecureReceiptUnsigned;
const { privateKey, publicKey } = createEphemeralEd25519KeyPair();
const payload = Buffer.from(canonicalJson(receipt));
const signature = sign(null, payload, privateKey).toString("base64");

const signedReceipt: SecureReceiptSigned = {
  ...receipt,
  signature: {
    algorithm: "Ed25519",
    value: signature
  }
};

writeFileSync("examples/secure-receipt.signed.example.json", JSON.stringify(signedReceipt, null, 2));
writeFileSync("examples/test-public-key.pem", publicKey.export({ type: "spki", format: "pem" }).toString());

console.log("Signed receipt written to examples/secure-receipt.signed.example.json");
console.log("Test public key written to examples/test-public-key.pem");
