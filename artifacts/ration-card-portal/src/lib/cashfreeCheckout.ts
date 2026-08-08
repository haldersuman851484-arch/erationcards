import { getCashfreePaymentStatus } from "@workspace/api-client-react";

/**
 * Thin wrapper around the Cashfree JS SDK checkout modal.
 *
 * The SDK is imported dynamically so its script never lands in the initial
 * bundle (mobile speed budget). Playwright specs set
 * `window.__cashfreeTestFactory` to swap in a fake SDK — the wrapper checks
 * it before touching the real loader, so tests run fully offline.
 */

export type CashfreeMode = "sandbox" | "production";

export interface CashfreeCheckoutHandle {
  checkout(options: { paymentSessionId: string; redirectTarget: "_modal" }): Promise<unknown>;
}

declare global {
  interface Window {
    __cashfreeTestFactory?: (options: {
      mode: CashfreeMode;
    }) => CashfreeCheckoutHandle | Promise<CashfreeCheckoutHandle>;
  }
}

/**
 * Opens the Cashfree checkout modal and resolves when it closes — paid,
 * failed, or simply dismissed; the SDK does not reliably say which. Callers
 * must poll the server for the real outcome (the server is the source of
 * truth, synced via webhook + status re-check).
 */
export async function openCashfreeCheckout(
  paymentSessionId: string,
  mode: CashfreeMode,
): Promise<void> {
  const factory = window.__cashfreeTestFactory;
  let cashfree: CashfreeCheckoutHandle | null;
  if (factory) {
    cashfree = await factory({ mode });
  } else {
    const { load } = await import("@cashfreepayments/cashfree-js");
    cashfree = await load({ mode });
  }
  if (!cashfree) throw new Error("Payment window could not be loaded");
  await cashfree.checkout({ paymentSessionId, redirectTarget: "_modal" });
}

export type PolledPaymentStatus = "paid" | "failed" | "pending";

/**
 * Polls the server-synced payment status. Returns as soon as a terminal
 * state shows up. A final "pending" means "not confirmed yet" — never
 * "definitely unpaid" — so callers must offer a manual re-check instead of
 * assuming failure.
 */
export async function pollPaymentStatus(
  orderNumber: string,
  attempts: number,
  intervalMs: number,
): Promise<PolledPaymentStatus> {
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, intervalMs));
    try {
      const res = await getCashfreePaymentStatus({ orderNumber });
      if (res.paymentStatus === "paid" || res.paymentStatus === "confirmed") return "paid";
      if (res.paymentStatus === "failed" || res.paymentStatus === "rejected") return "failed";
    } catch {
      // Transient network/server hiccup — keep polling; the final "pending"
      // answer already routes the customer to a manual re-check.
    }
  }
  return "pending";
}
