import { useEffect } from "react";

const SITE_NAME = "PVC Card Portal";
const DEFAULT_DESC =
  "Order a durable PVC printed ration card online for West Bengal. Wallet-size, waterproof, fast doorstep delivery. ₹70 only. Non-government printing service.";

interface SeoOptions {
  title?: string;
  description?: string;
  canonical?: string;
}

export function useSeo({ title, description, canonical }: SeoOptions = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Order PVC Ration Card Online`;
    document.title = fullTitle;

    setMeta("name", "description", description ?? DEFAULT_DESC);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description ?? DEFAULT_DESC);
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description ?? DEFAULT_DESC);

    if (canonical) {
      setLink("canonical", canonical);
    }

    return () => {
      document.title = SITE_NAME;
    };
  }, [title, description, canonical]);
}

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
