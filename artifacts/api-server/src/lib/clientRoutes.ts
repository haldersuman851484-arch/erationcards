/**
 * Client-side route allow-list for the SPA fallback.
 *
 * Unknown URLs must answer HTTP 404 (still with the SPA shell so humans see
 * the friendly not-found page) instead of a 200 homepage copy — otherwise
 * non-JS crawlers index every mistyped link as a duplicate homepage.
 *
 * This list MUST mirror the <Route path="..."> patterns in
 * artifacts/ration-card-portal/src/App.tsx. A guard test
 * (clientRoutes.test.ts) parses App.tsx and fails when the two drift, so a
 * newly added client route cannot silently start returning 404.
 */
export const CLIENT_ROUTE_PATTERNS: readonly string[] = [
  "/",
  "/order",
  "/order-upload/:orderNumber",
  "/receipt/:orderNumber",
  "/track",
  "/download",
  "/about",
  "/contact",
  "/faq",
  "/privacy",
  "/terms",
  "/refund",
  "/shipping",
  "/pvc-ration-card/:district",
  "/pvc-card/:type",
  "/guides/download-e-ration-card",
  "/guides/ration-card-types-west-bengal",
  "/guides/lost-ration-card-west-bengal",

  "/operator/register",
  "/operator/login",
  "/operator/dashboard",
  "/operator/order",
  "/operator/track",
  "/operator/download",

  "/admin/login",
  "/admin/dashboard",

  "/processing",
  "/processing/courier/public",
  "/processing/courier/operator",
  "/processing/shipping-label/:orderNumber",

  // Old bookmarked mPanel URLs — App.tsx client-side-redirects these.
  "/admin/courier/public",
  "/admin/courier/operator",
  "/admin/shipping-label/:orderNumber",
];

/** Pattern → matcher: ":param" segments match any single non-empty segment. */
function segmentsOf(p: string): string[] {
  return p === "/" ? [] : p.slice(1).split("/");
}

const STATIC_ROUTES = new Set(
  CLIENT_ROUTE_PATTERNS.filter((p) => !p.includes(":")).map((p) => p.toLowerCase()),
);
const PARAM_ROUTES = CLIENT_ROUTE_PATTERNS.filter((p) => p.includes(":")).map(segmentsOf);

/**
 * Does the request path match a real client route? Trailing slashes are
 * collapsed and matching is case-insensitive on the static segments (the
 * portal's snapshot lookup is case-insensitive too). Param segments accept
 * any non-empty value — order numbers, district slugs, etc.
 */
export function isClientRoute(reqPath: string): boolean {
  if (!reqPath.startsWith("/")) return false;
  let p = reqPath.replace(/\/+$/, "");
  if (p.length === 0) p = "/";
  if (p.includes("//")) return false;
  if (STATIC_ROUTES.has(p.toLowerCase())) return true;
  const segs = segmentsOf(p);
  outer: for (const pattern of PARAM_ROUTES) {
    if (pattern.length !== segs.length) continue;
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i].startsWith(":")) {
        if (segs[i].length === 0) continue outer;
      } else if (pattern[i].toLowerCase() !== segs[i].toLowerCase()) {
        continue outer;
      }
    }
    return true;
  }
  return false;
}
