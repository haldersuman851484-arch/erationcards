import { Request } from "express";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret) throw new Error("SESSION_SECRET environment variable is not set");
  return secret;
}

export function getAdminCredentials(): { email: string; password: string } {
  const email = process.env["ADMIN_EMAIL"];
  const password = process.env["ADMIN_PASSWORD"];
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables must be set");
  }
  return { email, password };
}

export function parseOperatorToken(req: Request): number | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { operatorId: number };
    return decoded.operatorId;
  } catch {
    return null;
  }
}

export function parseAdminToken(req: Request): { email: string; role: string } | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { email?: string; role?: string };
    // Reject tokens that are missing required admin claims (e.g. operator tokens)
    if (!decoded.email || decoded.role !== "admin") return null;
    return { email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}

export function createOperatorToken(operatorId: number): string {
  return jwt.sign({ operatorId }, getJwtSecret(), { expiresIn: "7d" });
}

export function createAdminToken(email: string, role: string): string {
  return jwt.sign({ email, role }, getJwtSecret(), { expiresIn: "7d" });
}

export function generateOrderNumber(): string {
  return Date.now().toString().slice(-10);
}

export function hashPassword(password: string): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.createHash("sha256").update(password + "pvc_salt_2024").digest("hex");
}
