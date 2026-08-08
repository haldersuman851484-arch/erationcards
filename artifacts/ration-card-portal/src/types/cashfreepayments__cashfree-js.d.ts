/**
 * The Cashfree JS SDK ships plain JavaScript with no type declarations
 * (v1.0.7 resolves to dist/script.js). This local declaration types the one
 * entry point we use — `load()` — matching the SDK's documented behavior.
 */
declare module "@cashfreepayments/cashfree-js" {
  export interface CashfreeCheckoutOptions {
    paymentSessionId: string;
    /** "_modal" keeps the payment inside a popup on our page. */
    redirectTarget?: "_modal" | "_self" | "_blank" | "_top";
  }

  export interface CashfreeSdkInstance {
    checkout(options: CashfreeCheckoutOptions): Promise<unknown>;
  }

  export function load(options: {
    mode: "sandbox" | "production";
  }): Promise<CashfreeSdkInstance | null>;
}
