import { useGetPricingConfig, getGetPricingConfigQueryKey } from "@workspace/api-client-react";
import { DEFAULT_PRICING, TOKEN_PRICING, type PricingMatrix } from "@workspace/pricing";

declare global {
  interface Window {
    /**
     * Set by the build-time prerenderer (scripts/prerender.mjs) BEFORE the app
     * loads. When true, every price renders as a %%PRICE_*%% SEO token; the
     * API server substitutes the live prices into the captured HTML on every
     * request, so AI crawlers always see current prices.
     */
    __PRERENDER_TOKENS__?: boolean;
  }
}

/**
 * Live card prices, fetched from the API (admin-editable in the dashboard
 * Settings tab). Falls back to the built-in launch defaults while loading or
 * if the request fails, so order forms and copy always render prices.
 *
 * The server always recomputes the authoritative amount from the same saved
 * matrix on order creation, so a briefly stale client value can never change
 * what is charged.
 */
export function usePricing(): PricingMatrix {
  const { data } = useGetPricingConfig({
    query: {
      queryKey: getGetPricingConfigQueryKey(),
      staleTime: 60_000,
    },
  } as any);
  if (typeof window !== "undefined" && window.__PRERENDER_TOKENS__) {
    return TOKEN_PRICING;
  }
  return (data?.pricing as PricingMatrix | undefined) ?? DEFAULT_PRICING;
}
