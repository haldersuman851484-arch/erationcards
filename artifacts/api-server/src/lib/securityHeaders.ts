import type { NextFunction, Request, Response } from "express";

/**
 * Global security headers.
 *
 * The Content-Security-Policy is built from what the app actually loads:
 * - All JS/CSS/fonts are self-hosted (vite build under /assets).
 * - Inline <style> boot shell in index.html + React style attributes need
 *   style-src 'unsafe-inline' (scripts do NOT — no inline scripts anywhere;
 *   JSON-LD <script type="application/ld+json"> blocks are data, not code).
 * - Testimonial photos load from images.unsplash.com.
 * - Payment-screenshot previews use blob: object URLs; QR codes are inline
 *   SVG (qrcode.react), so no extra source needed for them.
 * - Optional analytics (gtag + Microsoft Clarity, see lib/analytics.ts) is
 *   allowed even while unconfigured, so enabling it later via env vars never
 *   requires touching this policy.
 *
 * HSTS / X-Frame-Options / CSP are production-only: the Replit dev preview
 * loads the app inside a cross-origin iframe, and HSTS is meaningless (and
 * ignored) over plain HTTP.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com https://*.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.google-analytics.com https://*.googletagmanager.com https://*.clarity.ms",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // The camera capture on the order form uses <input capture> (a native file
  // picker, not getUserMedia), and the courier barcode scanner is a keyboard
  // wedge — so all three features can be locked off entirely.
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Content-Security-Policy", CSP);
  }
  next();
}
