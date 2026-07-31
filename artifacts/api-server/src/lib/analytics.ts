/**
 * Optional first-party analytics injection (GA4 + Microsoft Clarity).
 *
 * IDs are read from env at serve time — set GA4_MEASUREMENT_ID and/or
 * CLARITY_PROJECT_ID in the hosting panel and restart the app; no rebuild is
 * needed. When neither var is set (the dev default) nothing is injected and
 * /__analytics.js answers 404, so the bundle behaves exactly as before.
 *
 * Loader design: external <script src> tags only — the gtag/Clarity bootstrap
 * lives in a tiny first-party script served from /__analytics.js, so the CSP
 * never needs 'unsafe-inline' (or nonces) for scripts.
 *
 * Staff/tool pages are never tracked, both for privacy and because their URLs
 * embed order numbers.
 */

const STAFF_PREFIXES = [
  "/admin",
  "/processing",
  "/order-upload",
  "/receipt",
  "/operator/dashboard",
  "/operator/order",
  "/operator/track",
  "/operator/download",
];

export function isStaffPath(p: string): boolean {
  const lower = p.toLowerCase();
  return STAFF_PREFIXES.some((pre) => lower === pre || lower.startsWith(`${pre}/`));
}

function gaId(): string | undefined {
  const v = process.env.GA4_MEASUREMENT_ID?.trim();
  return v ? v : undefined;
}

function clarityId(): string | undefined {
  const v = process.env.CLARITY_PROJECT_ID?.trim();
  return v ? v : undefined;
}

export function analyticsEnabled(): boolean {
  return Boolean(gaId() ?? clarityId());
}

/** Body of GET /__analytics.js — configures gtag and/or loads Clarity. */
export function analyticsLoaderJs(): string {
  const parts: string[] = [];
  const ga = gaId();
  if (ga) {
    parts.push(
      "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}" +
        `gtag('js',new Date());gtag('config',${JSON.stringify(ga)});`,
    );
  }
  const clarity = clarityId();
  if (clarity) {
    parts.push(
      '(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};' +
        't=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;' +
        "y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})" +
        `(window,document,"clarity","script",${JSON.stringify(clarity)});`,
    );
  }
  return parts.join("\n");
}

/**
 * Inject the analytics <script> tags before </head> of a served HTML page.
 * No-op when analytics is unconfigured, on staff pages, or when the HTML has
 * no </head> (never the case for real builds — defensive).
 */
export function injectAnalytics(html: string, reqPath: string): string {
  if (!analyticsEnabled() || isStaffPath(reqPath)) return html;
  const idx = html.indexOf("</head>");
  if (idx === -1) return html;
  const tags: string[] = [];
  const ga = gaId();
  if (ga) {
    tags.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga)}"></script>`);
  }
  tags.push('<script defer src="/__analytics.js"></script>');
  return `${html.slice(0, idx)}  ${tags.join("\n    ")}\n  ${html.slice(idx)}`;
}
