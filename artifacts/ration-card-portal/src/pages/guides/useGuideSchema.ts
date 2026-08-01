import { useJsonLd } from "@/lib/jsonld";
import type { GuideFaq } from "./GuideLayout";

/** One numbered step of a guide — feeds both the visible list and HowTo JSON-LD. */
export interface GuideStep {
  name: string;
  text: string;
  /** Bengali translation of the step, shown under the English text (not in JSON-LD). */
  bn: string;
}

const SITE_ORIGIN = "https://erationcards.in";

/**
 * Standard structured-data wiring for a /guides/* page: HowTo + FAQPage +
 * BreadcrumbList. The prerender build (scripts/prerender.mjs) fails when a
 * guide snapshot is missing FAQPage or BreadcrumbList JSON-LD, so every new
 * guide should register its schemas through this hook.
 *
 * Uses useJsonLd (serialized-data-dep) under the hood, so token-substituted
 * prices inside FAQ answers re-inject correctly — never plain useEffect.
 */
export function useGuideSchema(opts: {
  /** Unique per page, e.g. "guide-correction" → script ids "guide-correction-howto-ld" … */
  idPrefix: string;
  canonical: string;
  /** Breadcrumb label for this page (Home → label). */
  breadcrumbName: string;
  howTo: {
    name: string;
    description: string;
    /** ISO-8601 duration, e.g. "PT15M". */
    totalTime?: string;
    steps: GuideStep[];
  };
  faqs: GuideFaq[];
}) {
  const { idPrefix, canonical, breadcrumbName, howTo, faqs } = opts;

  useJsonLd(`${idPrefix}-howto-ld`, {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howTo.name,
    description: howTo.description,
    ...(howTo.totalTime ? { totalTime: howTo.totalTime } : {}),
    // Official WB ration-card services are free of charge.
    estimatedCost: { "@type": "MonetaryAmount", currency: "INR", value: "0" },
    step: howTo.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  });

  useJsonLd(`${idPrefix}-faq-ld`, {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    // Guides are fully bilingual: English entries feed the schema, the visible
    // page carries the Bengali (bnQ/bnA) alongside.
    inLanguage: ["en-IN", "bn"],
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });

  useJsonLd(`${idPrefix}-breadcrumb-ld`, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_ORIGIN}/services` },
      { "@type": "ListItem", position: 3, name: breadcrumbName, item: canonical },
    ],
  });
}

/** Shared visible step-list renderer used by the guide pages. */
export { default as GuideSteps } from "./GuideSteps";
