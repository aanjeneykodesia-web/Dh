import { randomBytes, randomInt } from "node:crypto";

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(10).toString("hex")}`;
}

export function newOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const r = randomBytes(2).toString("hex").toUpperCase();
  return `ORD-${ts}-${r}`;
}

export function newTrackingNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const r = randomBytes(2).toString("hex").toUpperCase();
  return `TR-${ts}-${r}`;
}

export function newPin(): string {
  return String(randomInt(100000, 999999));
}
