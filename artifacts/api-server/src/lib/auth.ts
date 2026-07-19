import { Request } from "express";

export const ADMIN_EMAIL = process.env["ADMIN_EMAIL"] ?? "admin@rationcard.in";
export const ADMIN_PASSWORD = process.env["ADMIN_PASSWORD"] ?? "Admin@1234";

export function parseOperatorToken(req: Request): number | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const data = JSON.parse(decoded) as { operatorId: number; exp: number };
    if (data.exp < Date.now()) return null;
    return data.operatorId;
  } catch {
    return null;
  }
}

export function parseAdminToken(req: Request): { email: string; role: string } | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const data = JSON.parse(decoded) as { email: string; role: string; exp: number };
    if (data.exp < Date.now()) return null;
    return { email: data.email, role: data.role };
  } catch {
    return null;
  }
}

export function createOperatorToken(operatorId: number): string {
  const payload = JSON.stringify({
    operatorId,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return Buffer.from(payload).toString("base64");
}

export function createAdminToken(email: string, role: string): string {
  const payload = JSON.stringify({
    email,
    role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return Buffer.from(payload).toString("base64");
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `${ts}${rand}`;
}

export function hashPassword(password: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha256").update(password + "pvc_salt_2024").digest("hex");
}
