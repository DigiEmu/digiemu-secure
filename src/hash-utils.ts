import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256Uri(input: string | Buffer): string {
  return `sha256:${sha256Hex(input)}`;
}

export function sha256FileUri(path: string): string {
  return sha256Uri(readFileSync(path));
}
