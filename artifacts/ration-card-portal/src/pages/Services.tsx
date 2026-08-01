import { Link } from "wouter";
import {
  CreditCard,
  PackageSearch,
  Download,
  ShieldCheck,
  FilePlus2,
  FilePenLine,
  Store,
  FileX2,
  ArrowUpDown,
  Copy,
  FileText,
  Fingerprint,
  RefreshCcw,
  Split,
  UserRoundPlus,
  HeartHandshake,
  Wand2,
  ArrowRight,
  Smartphone,
  PhoneOff,
  Zap,
} from "lucide-react";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/hooks/use-seo";
import { useJsonLd } from "@/lib/jsonld";
import { usePricing } from "@/hooks/use-pricing";
import { GuideDisclaimer } from "./guides/GuideLayout";

const CANONICAL = "https://erationcards.in/services";

interface ServiceTile {
  href: string;
  title: string;
  desc: string;
  icon: typeof CreditCard;
  /** Our own portal features (vs free government guides). */
  portal?: boolean;
}

const TILES: ServiceTile[] = [
  {
    href: "/order",
    title: "Order PVC Printed Card",
    desc: "Get your e-Ration Card printed on waterproof, wallet-size PVC — delivered to your door.",
    icon: CreditCard,
    portal: true,
  },
  {
    href: "/track",
    title: "Check Order Status",
    desc: "Track your PVC card order anytime with the order number.",
    icon: PackageSearch,
    portal: true,
  },
  {
    href: "/download",
    title: "Download Your Ration Card",
    desc: "Official links to download the e-Ration Card, ABHA and e-Shram PDFs free.",
    icon: Download,
    portal: true,
  },
  {
    href: "/guides/verify-ration-card-west-bengal",
    title: "Verify Your Ration Card",
    desc: "Check Active/Deactivated status, category and eKYC in 2 minutes.",
    icon: ShieldCheck,
  },
  {
    href: "/guides/apply-new-ration-card-west-bengal",
    title: "Apply for New Ration Card",
    desc: "Form-3 for a new family, Form-4 to add a newborn or new member.",
    icon: FilePlus2,
  },
  {
    href: "/guides/ration-card-correction-west-bengal",
    title: "Modify / Correct Card Details",
    desc: "Fix name, date of birth, address or guardian name with Form-5.",
    icon: FilePenLine,
  },
  {
    href: "/guides/change-ration-shop-west-bengal",
    title: "Change Ration Shop (Form-6)",
    desc: "Move your card to a nearer fair-price shop after shifting home.",
    icon: Store,
  },
  {
    href: "/guides/surrender-ration-card-west-bengal",
    title: "Surrender Card (Form-7)",
    desc: "Close a card after a death, migration, or voluntarily.",
    icon: FileX2,
  },
  {
    href: "/guides/ration-card-category-change-west-bengal",
    title: "Category Change (Form-8)",
    desc: "Request a different card category — e.g. RKSY-II to PHH.",
    icon: ArrowUpDown,
  },
  {
    href: "/guides/duplicate-ration-card-west-bengal",
    title: "Duplicate Card (Form-9)",
    desc: "Lost or damaged card? Re-download free, or request a formal duplicate.",
    icon: Copy,
  },
  {
    href: "/guides/non-subsidised-ration-card-west-bengal",
    title: "Non-Subsidised Card (Form-10)",
    desc: "A valid card without foodgrain subsidy — ideal as ID and record.",
    icon: FileText,
  },
  {
    href: "/guides/link-aadhaar-ration-card-west-bengal",
    title: "Link Aadhaar & Mobile (eKYC)",
    desc: "The 2-minute OTP linking that keeps your card active.",
    icon: Fingerprint,
  },
  {
    href: "/guides/reactivate-ration-card-west-bengal",
    title: "Reactivate Deactivated Card",
    desc: "Card deactivated? Complete eKYC and bring it back to Active.",
    icon: RefreshCcw,
  },
  {
    href: "/guides/split-ration-card-family-west-bengal",
    title: "Split Family Card (Form-13)",
    desc: "Separate one card family into independent family units.",
    icon: Split,
  },
  {
    href: "/guides/ration-card-member-transfer-west-bengal",
    title: "Member Transfer (Form-14)",
    desc: "Shift a card holder into another family — standard after marriage.",
    icon: UserRoundPlus,
  },
  {
    href: "/guides/ration-card-nomination-west-bengal",
    title: "Nominate a Collector (Form-15)",
    desc: "Authorise a trusted person to draw ration for elderly or ill members.",
    icon: HeartHandshake,
  },
  {
    href: "/guides/update-mobile-number-ration-card-west-bengal",
    title: "Update Mobile Number",
    desc: "Lost the old SIM? Change the card's mobile instantly with an Aadhaar OTP.",
    icon: Smartphone,
  },
  {
    href: "/guides/delink-mobile-number-ration-card-west-bengal",
    title: "Delink Mobile Number",
    desc: "Remove your number from an unknown ration card — free, OTP-verified.",
    icon: PhoneOff,
  },
];

const POPULAR_GUIDES = [
  { href: "/guides/download-e-ration-card", label: "How to download your e-Ration Card PDF (free, 5 steps)" },
  { href: "/guides/ration-card-types-west-bengal", label: "AAY, PHH, SPHH, RKSY-I & RKSY-II — card types explained" },
  { href: "/guides/lost-ration-card-west-bengal", label: "Lost or damaged ration card? Every free recovery route" },
];

/** The six OTP-based services food.wb.gov.in groups as "Instant With Aadhaar". */
const INSTANT_AADHAAR = [
  {
    href: "/guides/link-aadhaar-ration-card-west-bengal",
    title: "Link Aadhaar to Your Ration Card",
    bn: "আধার OTP-এর মাধ্যমে আপনার রেশন কার্ডের সাথে আধার লিঙ্ক করুন",
  },
  {
    href: "/guides/ration-card-correction-west-bengal",
    title: "Rectify or Instant Correction",
    bn: "আধার OTP-এর মাধ্যমে রেশন কার্ডের তথ্য সংশোধন করুন",
  },
  {
    href: "/guides/change-ration-shop-west-bengal",
    title: "Change Your Fair Price Shop",
    bn: "আপনার পরিবারের রেশন দোকান পরিবর্তন করুন",
  },
  {
    href: "/guides/split-ration-card-family-west-bengal",
    title: "Split Family (পরিবার বিভাজন)",
    bn: "আধারের মাধ্যমে পরিবার বিভাজন করুন",
  },
  {
    href: "/guides/update-mobile-number-ration-card-west-bengal",
    title: "Update Mobile Number",
    bn: "আপনার রেশন কার্ডের মোবাইল নম্বরটি আপডেট করুন",
  },
  {
    href: "/guides/delink-mobile-number-ration-card-west-bengal",
    title: "Delink Mobile Number",
    bn: "অজানা রেশন কার্ড থেকে আপনার মোবাইল নম্বরটি ডিলিঙ্ক করুন",
  },
];

export default function Services() {
  const PRICING = usePricing();

  useSeo({
    title: "All West Bengal Ration Card Services — Correction, eKYC, New Card, Forms 3–15 & PVC Printing",
    description: `Every West Bengal ration card service on one page: instant correction, Aadhaar eKYC, new card (Form-3/4), shop change, mobile number update, duplicate, split, transfer, nomination — free official steps for each — plus waterproof PVC printing from ₹${PRICING.ration.multi.public} per card, delivered.`,
    canonical: CANONICAL,
  });

  useJsonLd("services-itemlist-ld", {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "West Bengal ration card services",
    numberOfItems: TILES.length,
    itemListElement: TILES.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.title,
      url: `https://erationcards.in${t.href}`,
    })),
  });
  useJsonLd("services-breadcrumb-ld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://erationcards.in/" },
      { "@type": "ListItem", position: 2, name: "Services", item: CANONICAL },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            West Bengal Ration Card Services — Every Task, One Page
          </h1>
          <p className="text-slate-600 max-w-3xl">
            Step-by-step help for every official ration card service on food.wb.gov.in — corrections, eKYC, new
            cards, transfers and more (all free on the government portal) — plus our waterproof PVC card printing,
            delivered across all 23 districts.
          </p>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Highlighted banner — instant correction */}
          <Link
            href="/guides/ration-card-correction-west-bengal"
            className="block mb-10 rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 hover:border-primary/60 transition-colors group"
            data-testid="banner-instant-correction"
          >
            <div className="flex items-start gap-4">
              <span className="hidden sm:flex w-12 h-12 rounded-xl bg-primary/15 text-primary items-center justify-center flex-shrink-0">
                <Wand2 className="w-6 h-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Most requested</p>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">
                  Rectify or Instant Correction of Your Ration Card
                </h2>
                <p className="text-sm text-slate-600 max-w-2xl">
                  Wrong name spelling, date of birth or address? The OTP-based Form-5 correction on the official
                  portal is free — our guide shows every step, and we'll print the corrected card when it's done.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary mt-3 group-hover:gap-2 transition-all">
                  Read the correction guide <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>

          {/* Instant With Aadhaar — the official OTP-based service group */}
          <section className="mb-10" data-testid="section-instant-aadhaar">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Instant With Aadhaar</h2>
            </div>
            <p className="text-sm text-slate-600 mb-4 max-w-3xl">
              Six services on food.wb.gov.in work instantly with an Aadhaar OTP — free, fully online, no office
              visit. Tap one for the plain-language guide.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="grid-instant-aadhaar">
              {INSTANT_AADHAAR.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-start gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
                  data-testid={`tile-instant-${s.href.split("/").pop()}`}
                >
                  <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Fingerprint className="w-4 h-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors">
                      {s.title}
                    </span>
                    <span lang="bn" className="block text-xs text-slate-500 leading-relaxed mt-0.5">
                      {s.bn}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Services grid */}
          <h2 className="text-xl font-bold text-slate-900 mb-4">All services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-services">
            {TILES.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className="flex flex-col bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all group"
                  data-testid={`tile-${t.href.split("/").pop()}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    {t.portal ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary text-white rounded-full px-2 py-0.5">
                        Our service
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                        Free guide
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors mb-1">
                    {t.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                </Link>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
            <strong>Everything marked "Free guide" is a government service</strong> — free of charge on
            food.wb.gov.in or at your local food &amp; supplies office. Our guides simply walk you through the
            official steps in plain language. The only paid service on this page is our optional PVC card printing.
          </p>

          {/* Popular reading */}
          <section className="mt-12">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Popular reading</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              {POPULAR_GUIDES.map((g) => (
                <li key={g.href}>
                  <Link href={g.href} className="text-primary hover:underline">
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* PVC CTA */}
          <div className="mt-12 bg-primary/5 rounded-2xl p-8 text-center border border-primary/20">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Done with the paperwork? Make the card permanent</h2>
            <p className="text-slate-600 text-sm mb-5 max-w-2xl mx-auto">
              We print your e-Ration Card on bank-card grade waterproof PVC — ₹{PRICING.ration.single.public} for one
              card, ₹{PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West
              Bengal districts included.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/order">
                <Button className="bg-primary hover:bg-primary/90 px-8" data-testid="button-services-order">
                  Order PVC Card
                </Button>
              </Link>
              <Link href="/faq">
                <Button variant="outline" data-testid="button-services-faq">
                  Prices &amp; FAQ
                </Button>
              </Link>
            </div>
          </div>

          <GuideDisclaimer />
        </div>
      </main>
      <Footer />
    </div>
  );
}
