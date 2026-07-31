import type { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronDown } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface RelatedLink {
  href: string;
  label: string;
}

interface GuideLayoutProps {
  /** Page H1 — phrased like the question people ask search engines. */
  title: string;
  /** One-line subtitle under the H1. */
  intro: string;
  /**
   * 2–4 sentence direct answer rendered at the top. AI assistants often quote
   * this block verbatim, so it must stand alone: name the action, the cost
   * (live prices via usePricing in the page) and the official source.
   */
  quickAnswer: ReactNode;
  related?: RelatedLink[];
  children: ReactNode;
}

/**
 * Shared shell for the /guides/* pages.
 *
 * Content rendered inside MUST stay crawler-visible without JavaScript:
 * plain sections, tables, ordered lists and native <details> only — no JS
 * accordions or tabs. scripts/prerender.mjs captures these pages into static
 * snapshots served to AI crawlers (GPTBot, PerplexityBot, ClaudeBot), and any
 * price shown must come from usePricing() so snapshots carry %%PRICE_*%%
 * tokens for live substitution.
 */
export function GuideLayout({ title, intro, quickAnswer, related, children }: GuideLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          {/* Visible breadcrumb mirroring the BreadcrumbList JSON-LD (Home → this guide). */}
          <Breadcrumb className="mb-3" data-testid="breadcrumb-guide">
            <BreadcrumbList className="text-xs text-slate-500">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="hover:text-primary">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-slate-700 font-medium">{title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
          <p className="text-slate-600">{intro}</p>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div
            className="bg-white border border-slate-200 rounded-xl p-5 mb-10 shadow-sm"
            data-testid="text-guide-quick-answer"
          >
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Quick answer:</strong> {quickAnswer}
            </p>
            <p className="text-xs text-slate-400 mt-3">Last updated: July 2026 · Prices shown are current</p>
          </div>

          {children}

          {related && related.length > 0 && (
            <section className="mt-12">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Related reading</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm">
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} className="text-primary hover:underline">
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** FAQ entry for the guide pages; feeds both the visible list and JSON-LD. */
export interface GuideFaq {
  q: string;
  a: string;
  /** BCP-47 language of the entry (defaults to English). */
  lang?: "bn";
}

/** Native <details> FAQ block (crawler-visible without JavaScript). */
export function GuideFaqList({ faqs }: { faqs: GuideFaq[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Common questions</h2>
      <div className="space-y-2">
        {faqs.map((faq, idx) => (
          <details
            key={idx}
            open={idx === 0}
            lang={faq.lang}
            className="group border border-slate-200 rounded-lg bg-white shadow-sm"
            data-testid={`guide-faq-item-${idx}`}
          >
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-3.5 hover:text-primary [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary text-left">{faq.q}</h3>
              <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

/** Closing call-to-action shared by the guide pages. */
export function GuideCta({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mt-12 bg-primary/5 rounded-2xl p-8 text-center border border-primary/20">
      <h2 className="text-xl font-bold text-slate-900 mb-2">{heading}</h2>
      <p className="text-slate-600 text-sm mb-5">{body}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/order">
          <Button className="bg-primary hover:bg-primary/90 px-8" data-testid="button-guide-order">
            Order PVC Card
          </Button>
        </Link>
        <Link href="/faq">
          <Button variant="outline" data-testid="button-guide-faq">
            Read All FAQs
          </Button>
        </Link>
      </div>
    </div>
  );
}

/** Consistent trust/disclaimer line for every guide. */
export function GuideDisclaimer() {
  return (
    <p className="mt-10 text-xs text-slate-400 leading-relaxed">
      erationcards.in (PVC Card Portal) is a private printing service and is not affiliated with the Government of
      West Bengal or its Department of Food &amp; Supplies. Official ration card services — new applications,
      corrections, updates and e-Ration Card downloads — are free at food.wb.gov.in. Government portal menus can
      change; if a step looks different, look for the equivalent option on the official site.
    </p>
  );
}
