import { useEffect } from "react";

/**
 * Structured-data (JSON-LD) helpers.
 *
 * Scripts injected here end up in TWO crawler-visible places:
 *   1. Googlebot renders JavaScript, so it sees them on the live SPA.
 *   2. The build-time prerenderer (scripts/prerender.mjs) captures the DOM
 *      after these effects run, so the JSON-LD is baked into the static HTML
 *      snapshots that non-JS AI crawlers (GPTBot, PerplexityBot, ClaudeBot)
 *      receive.
 */
export function injectJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

/** Keeps a JSON-LD script in <head> while the component is mounted. */
export function useJsonLd(id: string, data: object | null) {
  const serialized = data === null ? null : JSON.stringify(data);
  useEffect(() => {
    if (serialized === null) return;
    injectJsonLd(id, JSON.parse(serialized));
    return () => removeJsonLd(id);
  }, [id, serialized]);
}
