import { generateKeyPairSync } from "node:crypto";

export function createEphemeralEd25519KeyPair() {
  return generateKeyPairSync("ed25519");
}
