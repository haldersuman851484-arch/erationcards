/**
 * Tiny GA4 event helper for the public portal.
 *
 * The gtag loader is injected server-side (only when GA4_MEASUREMENT_ID is
 * set, and never on staff pages). In dev/tests gtag is absent, so this must
 * be a silent no-op and can never throw into calling code.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params ?? {});
    }
  } catch {
    // Analytics must never break the app.
  }
}
