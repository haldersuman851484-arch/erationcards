import { Link, useParams } from "wouter";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/hooks/use-seo";
import { CreditCard, Truck, Download, ExternalLink, Shield, FileText, BadgeCheck } from "lucide-react";
import { usePricing } from "@/hooks/use-pricing";
import { useJsonLd } from "@/lib/jsonld";
import type { PricingMatrix } from "@workspace/pricing";

const SITE_URL = "https://erationcards.in";

interface FaqEntry {
  q: string;
  a: string;
  /** BCP-47 language of the entry (defaults to English). */
  lang?: "bn";
}

export interface CardTypeInfo {
  slug: string;
  /** Short display code, e.g. "AAY", "RKSY-I", "ABHA". */
  code: string;
  /** Name used in the SEO title and H1, e.g. "AAY Ration Card". */
  titleName: string;
  /** Full scheme/card name. */
  fullName: string;
  bengali: string;
  /** Which price family applies (ration vs ABHA/E-SHRAM/GENERAL). */
  category: "ration" | "special";
  badge: string;
  chip: string;
  /** Issuing scheme / authority, one line. */
  scheme: string;
  /** Plain-language explanation, 2–3 sentences. Also feeds the meta description intro. */
  whatIs: string;
  whoFor: string;
  /**
   * Where the card/PDF comes from. Government-issued types set officialUrl and
   * their copy may say "the official card is free"; GENERAL has no officialUrl —
   * the customer supplies their own file, so every free-government claim must
   * stay conditional on officialUrl (prerender guards the general snapshot).
   */
  officialName: string;
  officialUrl?: string;
  officialNote: string;
  extraFaqs: (P: PricingMatrix) => FaqEntry[];
}

// NOTE: scripts/prerender.mjs parses the `slug: "..."` lines below to build
// the prerender route list (like DISTRICTS in DistrictPage.tsx). Keep the
// one-line `slug: "...",` format when adding new card types.
export const CARD_TYPE_PAGES: Record<string, CardTypeInfo> = {
  aay: {
    slug: "aay",
    code: "AAY",
    titleName: "AAY Ration Card",
    fullName: "Antyodaya Anna Yojana",
    bengali: "অন্ত্যোদয় অন্ন যোজনা",
    category: "ration",
    badge: "bg-red-100 text-red-700",
    chip: "bg-red-50 border-red-200 text-red-700",
    scheme: "Central scheme under the National Food Security Act (NFSA), issued in West Bengal by the Department of Food & Supplies.",
    whatIs:
      "AAY (Antyodaya Anna Yojana) is the ration card category for the poorest households under the National Food Security Act, and it carries the highest food-grain entitlement of any category. The government selects AAY families — the category is printed on your e-Ration Card.",
    whoFor: "The poorest of poor families, as identified by the government under NFSA.",
    officialName: "food.wb.gov.in (WB Food & Supplies)",
    officialUrl: "https://food.wb.gov.in",
    officialNote:
      "Your AAY e-Ration Card PDF is free to download from food.wb.gov.in — no fee, no agent needed.",
    extraFaqs: () => [
      {
        q: "Who qualifies for an AAY ration card?",
        a: "AAY is meant for the poorest households, identified and approved by the government under the National Food Security Act. You cannot apply for AAY through any private service — eligibility and category assignment are decided entirely by the government. Check your current category on your e-Ration Card PDF.",
      },
      {
        q: "Can you change my card category or correct details on my AAY card?",
        a: "No. We are a printing service only — we reproduce your existing government-issued card exactly as it is. Category changes, name corrections and address updates are free government services at food.wb.gov.in or your local food & supplies office.",
      },
    ],
  },
  phh: {
    slug: "phh",
    code: "PHH",
    titleName: "PHH Ration Card",
    fullName: "Priority Household",
    bengali: "প্রায়োরিটি হাউসহোল্ড",
    category: "ration",
    badge: "bg-blue-100 text-blue-700",
    chip: "bg-blue-50 border-blue-200 text-blue-700",
    scheme: "Central scheme under the National Food Security Act (NFSA), issued in West Bengal by the Department of Food & Supplies.",
    whatIs:
      "PHH (Priority Household) is the most common ration card category in West Bengal, issued to eligible households under the National Food Security Act. Entitlements are calculated per family member, and the category is printed on your e-Ration Card.",
    whoFor: "Eligible priority households identified by the state government under NFSA.",
    officialName: "food.wb.gov.in (WB Food & Supplies)",
    officialUrl: "https://food.wb.gov.in",
    officialNote:
      "Your PHH e-Ration Card PDF is free to download from food.wb.gov.in — no fee, no agent needed.",
    extraFaqs: () => [
      {
        q: "What is the difference between PHH and SPHH?",
        a: "Both are priority categories under West Bengal's implementation of NFSA. SPHH (Special Priority Household) is a special classification assigned by the state government; PHH is the standard priority category. Your household's category is decided by the government and printed on your card — for current entitlement details, check food.wb.gov.in. PVC printing costs the same for both.",
      },
      {
        q: "Does printing my PHH card on PVC change my entitlements?",
        a: "No. The PVC card is a durable convenience copy of your existing card. Your entitlements come from the government's digital record, and shops verify against that record — the PVC print neither adds nor removes anything.",
      },
    ],
  },
  sphh: {
    slug: "sphh",
    code: "SPHH",
    titleName: "SPHH Ration Card",
    fullName: "Special Priority Household",
    bengali: "স্পেশাল প্রায়োরিটি হাউসহোল্ড",
    category: "ration",
    badge: "bg-purple-100 text-purple-700",
    chip: "bg-purple-50 border-purple-200 text-purple-700",
    scheme: "Central scheme under the National Food Security Act (NFSA), issued in West Bengal by the Department of Food & Supplies.",
    whatIs:
      "SPHH (Special Priority Household) is a special priority ration card category used in West Bengal under the National Food Security Act. It sits alongside PHH in the priority group, with the exact classification assigned by the state government and printed on your e-Ration Card.",
    whoFor: "Specially categorised priority households, as classified by the West Bengal government.",
    officialName: "food.wb.gov.in (WB Food & Supplies)",
    officialUrl: "https://food.wb.gov.in",
    officialNote:
      "Your SPHH e-Ration Card PDF is free to download from food.wb.gov.in — no fee, no agent needed.",
    extraFaqs: () => [
      {
        q: "How is SPHH different from PHH?",
        a: "SPHH is a special classification within West Bengal's priority group; PHH is the standard priority category. The government assigns your household's category — it is printed on your card and e-Ration Card PDF. For current entitlement details per category, check food.wb.gov.in. PVC printing costs the same for both.",
      },
      {
        q: "Will ration shops accept the PVC card?",
        a: "The PVC card reproduces your official e-Ration Card exactly, including the card number. Dealers verify your entitlements in the government's digital system, so the card works the same way your paper printout does — it is simply waterproof and far more durable.",
      },
    ],
  },
  "rksy-1": {
    slug: "rksy-1",
    code: "RKSY-I",
    titleName: "RKSY-I Ration Card",
    fullName: "Rajya Khadya Suraksha Yojana — Category I",
    bengali: "রাজ্য খাদ্য সুরক্ষা যোজনা — ১",
    category: "ration",
    badge: "bg-emerald-100 text-emerald-700",
    chip: "bg-emerald-50 border-emerald-200 text-emerald-700",
    scheme: "West Bengal's own state food security scheme, run by the Department of Food & Supplies.",
    whatIs:
      "RKSY-I (Rajya Khadya Suraksha Yojana Category I) is a West Bengal state government ration card for families covered by the state's own food security scheme rather than the central NFSA. The category is printed on your e-Ration Card.",
    whoFor: "Families covered under the West Bengal state food security scheme, Category I.",
    officialName: "food.wb.gov.in (WB Food & Supplies)",
    officialUrl: "https://food.wb.gov.in",
    officialNote:
      "Your RKSY-I e-Ration Card PDF is free to download from food.wb.gov.in — no fee, no agent needed.",
    extraFaqs: (P) => [
      {
        q: "What is the difference between RKSY-I and RKSY-II?",
        a: "Both are categories of West Bengal's own state food security scheme (separate from the central NFSA categories AAY, PHH and SPHH). RKSY-I and RKSY-II differ in the entitlements the state assigns; your category is printed on your card. For current scheme details, check food.wb.gov.in.",
      },
      {
        q: "My family has mixed card types — can I order them together?",
        a: `Yes. One order can include any mix of ration card categories. Every ration card PVC print costs the same — ₹${P.ration.single.public} for one card or ₹${P.ration.multi.public} per card for 2 or more — and each family member's PDF is printed as their own card.`,
      },
    ],
  },
  "rksy-2": {
    slug: "rksy-2",
    code: "RKSY-II",
    titleName: "RKSY-II Ration Card",
    fullName: "Rajya Khadya Suraksha Yojana — Category II",
    bengali: "রাজ্য খাদ্য সুরক্ষা যোজনা — ২",
    category: "ration",
    badge: "bg-amber-100 text-amber-700",
    chip: "bg-amber-50 border-amber-200 text-amber-700",
    scheme: "West Bengal's own state food security scheme, run by the Department of Food & Supplies.",
    whatIs:
      "RKSY-II (Rajya Khadya Suraksha Yojana Category II) is a West Bengal state government ration card for general beneficiary households under the state's own food security scheme. The category is printed on your e-Ration Card.",
    whoFor: "General beneficiary households under the West Bengal state food security scheme, Category II.",
    officialName: "food.wb.gov.in (WB Food & Supplies)",
    officialUrl: "https://food.wb.gov.in",
    officialNote:
      "Your RKSY-II e-Ration Card PDF is free to download from food.wb.gov.in — no fee, no agent needed.",
    extraFaqs: (P) => [
      {
        q: "What is an RKSY-II card used for?",
        a: "RKSY-II is part of West Bengal's state food security scheme and gives access to subsidised food grains as per the state's current rules. Many families also use the card day-to-day as an identity and address document, which is where a durable PVC copy helps.",
      },
      {
        q: "Can I print PVC cards for my whole family in one order?",
        a: `Yes. Upload each member's e-Ration Card PDF in one order — every card is printed separately. Pricing is ₹${P.ration.single.public} for a single card or ₹${P.ration.multi.public} per card for 2 or more, delivery included.`,
      },
    ],
  },
  abha: {
    slug: "abha",
    code: "ABHA",
    titleName: "ABHA Health Card",
    fullName: "Ayushman Bharat Health Account",
    bengali: "আভা (আয়ুষ্মান ভারত হেলথ অ্যাকাউন্ট)",
    category: "special",
    badge: "bg-sky-100 text-sky-700",
    chip: "bg-sky-50 border-sky-200 text-sky-700",
    scheme: "Ayushman Bharat Digital Mission (ABDM) — National Health Authority, Government of India.",
    whatIs:
      "The ABHA card carries your 14-digit Ayushman Bharat Health Account number — a national digital health ID that links your health records under the Ayushman Bharat Digital Mission. Creating an ABHA number and downloading the card are free on the official ABDM portal.",
    whoFor: "Anyone in India who has created an ABHA number and wants a durable wallet copy of the card.",
    officialName: "abha.abdm.gov.in (ABDM)",
    officialUrl: "https://abha.abdm.gov.in",
    officialNote:
      "Creating an ABHA number and downloading your ABHA card PDF are free at abha.abdm.gov.in.",
    extraFaqs: () => [
      {
        q: "What is the ABHA card used for?",
        a: "ABHA is a national digital health ID. It links your health records digitally under the Ayushman Bharat Digital Mission, so hospitals and clinics that participate in ABDM can access records you choose to share. Carrying the card in your wallet keeps your 14-digit number handy at appointments.",
      },
      {
        q: "Do you create ABHA numbers or health IDs?",
        a: "No. ABHA numbers are created free on the official ABDM portal (abha.abdm.gov.in), usually with Aadhaar-based verification. We only print your already-created ABHA card on durable PVC — download the card PDF from the portal and upload it with your order.",
      },
    ],
  },
  "e-shram": {
    slug: "e-shram",
    code: "E-SHRAM",
    titleName: "E-SHRAM Card",
    fullName: "e-Shram — national database for unorganised workers",
    bengali: "ই-শ্রম কার্ড",
    category: "special",
    badge: "bg-rose-100 text-rose-700",
    chip: "bg-rose-50 border-rose-200 text-rose-700",
    scheme: "Ministry of Labour & Employment, Government of India.",
    whatIs:
      "The E-SHRAM card is issued to unorganised workers registered in the national e-Shram database of the Ministry of Labour & Employment. It carries a Universal Account Number (UAN) and is used to access welfare schemes meant for unorganised workers, as per current government rules.",
    whoFor: "Unorganised-sector workers registered on the e-Shram portal — construction, domestic, gig, agricultural and similar work.",
    officialName: "eshram.gov.in (Ministry of Labour & Employment)",
    officialUrl: "https://eshram.gov.in",
    officialNote:
      "Registering and downloading your e-Shram (UAN) card PDF are free at eshram.gov.in.",
    extraFaqs: () => [
      {
        q: "What benefits does the E-SHRAM card give?",
        a: "The e-Shram database is the government's registry of unorganised workers, and registered workers can access the welfare and insurance schemes the government links to it. Scheme details change over time — check eshram.gov.in for what currently applies. Our PVC print does not add or change any benefit; it is a durable copy of your card.",
      },
      {
        q: "Do you register workers for e-Shram?",
        a: "No. Registration is free on the official portal eshram.gov.in (or via CSC centres). We only print your already-issued e-Shram card on durable PVC — download the card PDF from the portal and upload it with your order.",
      },
    ],
  },
  general: {
    slug: "general",
    code: "GENERAL",
    titleName: "General PVC Card",
    fullName: "Any other personal card or document on PVC",
    bengali: "জেনারেল পিভিসি কার্ড",
    category: "special",
    badge: "bg-slate-200 text-slate-700",
    chip: "bg-slate-50 border-slate-300 text-slate-700",
    scheme: "Your own already-issued card or document, printed on bank-card grade PVC.",
    whatIs:
      "A GENERAL PVC card is any other personal card or document you already hold, printed on durable, wallet-size PVC — the same material, print quality and delivery as our ration card prints. Popular examples are health-scheme cards, ID-style certificates and office or membership cards.",
    whoFor: "Anyone who wants a durable, wallet-size PVC copy of a personal card or document they already have.",
    officialName: "your own PDF or clear scan",
    officialNote:
      "There is no government portal for GENERAL prints — you upload a clear PDF or scan of your own card or document.",
    extraFaqs: () => [
      {
        q: "Which cards or documents can you print as a GENERAL PVC card?",
        a: "Personal cards and documents that belong to you — for example health-scheme cards, membership or office cards, and card-size certificates. We print them exactly as uploaded, without editing the content. We do not print anything unlawful, altered, or belonging to another person.",
      },
      {
        q: "What file quality do I need to upload?",
        a: "A clear, readable PDF or high-resolution scan of the card, ideally in a card-style layout. If the upload is too blurry to print well, our team contacts you on the mobile number from your order before printing.",
      },
    ],
  },
};

/** Shared FAQs every card-type page answers, tailored to the type. */
function buildCommonFaqs(info: CardTypeInfo, P: PricingMatrix): FaqEntry[] {
  const single = info.category === "ration" ? P.ration.single.public : P.special.single.public;
  const multi = info.category === "ration" ? P.ration.multi.public : P.special.multi.public;
  const priceFamily =
    info.category === "ration"
      ? "Every ration card category — AAY, PHH, SPHH, RKSY-I and RKSY-II — costs the same"
      : "ABHA, E-SHRAM and GENERAL cards share the same PVC pricing";
  return [
    {
      q: `How much does a ${info.titleName} PVC print cost?`,
      a: `₹${single} for one card, or ₹${multi} per card when you order 2 or more together. ${priceFamily}. Printing, packaging and Speed Post doorstep delivery are included — payment is by UPI (Google Pay, PhonePe, Paytm).`,
    },
    {
      q: `How do I order a PVC print of my ${info.code} card?`,
      a: `Go to erationcards.in/order, fill in your name, mobile number and delivery address, pay ₹${single} (or ₹${multi} per card for 2+) by UPI, and upload your ${info.code} card PDF. Cards are printed and dispatched within 24–48 hours of confirmation; Speed Post delivery takes 3–5 working days within West Bengal.`,
    },
    {
      q: info.officialUrl
        ? `Is the ${info.code} card itself free? Where do I get the official PDF?`
        : `Where does the ${info.code} card file come from?`,
      a: info.officialUrl
        ? `${info.officialNote} We are a private printing service, not a government website — we only print your already-issued card on durable, wallet-size PVC for ₹${single}.`
        : `${info.officialNote} We are a private printing service, not a government website — we print the file you upload on durable, wallet-size PVC for ₹${single}.`,
    },
    {
      q: `${info.code} কার্ডের PVC প্রিন্টের দাম কত?`,
      a: `একটি কার্ডের দাম ₹${single}, একসাথে ২টি বা তার বেশি অর্ডার করলে প্রতি কার্ড ₹${multi}। প্রিন্টিং ও বাড়িতে Speed Post ডেলিভারি — সব খরচ এই দামের মধ্যেই ধরা। erationcards.in/order-এ গিয়ে UPI দিয়ে পেমেন্ট করুন এবং আপনার ${info.code} কার্ডের PDF আপলোড করুন।`,
      lang: "bn",
    },
  ];
}

export default function CardTypePage() {
  const PRICING = usePricing();
  const params = useParams<{ type: string }>();
  const slug = params.type ?? "";
  const info = CARD_TYPE_PAGES[slug];

  const single = info
    ? info.category === "ration"
      ? PRICING.ration.single.public
      : PRICING.special.single.public
    : PRICING.ration.single.public;
  const multi = info
    ? info.category === "ration"
      ? PRICING.ration.multi.public
      : PRICING.special.multi.public
    : PRICING.ration.multi.public;

  const title = info
    ? `${info.titleName} PVC Print Online | ₹${single}, Doorstep Delivery`
    : "PVC Card Printing | West Bengal";
  const description = info
    ? `Order a wallet-size PVC print of your ${info.titleName} (${info.fullName} / ${info.bengali}) online. ₹${single} for one card, ₹${multi} each for 2+, Speed Post delivery across West Bengal. ${
        info.officialUrl
          ? `The official card is free — ${info.officialNote.charAt(0).toLowerCase()}${info.officialNote.slice(1)}`
          : info.officialNote
      }`
    : undefined;
  const canonical = info ? `${SITE_URL}/pvc-card/${info.slug}` : undefined;

  useSeo({ title, description, canonical });

  const faqs = info ? [...buildCommonFaqs(info, PRICING), ...info.extraFaqs(PRICING)] : [];

  // Serialized-dep hook: re-injects when live pricing loads, so JSON-LD never
  // bakes default prices over the server-substituted snapshot values.
  useJsonLd(
    "cardtype-faq-ld",
    info
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: ["en-IN", "bn"],
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            ...(f.lang ? { inLanguage: f.lang } : {}),
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }
      : null
  );

  useJsonLd(
    "cardtype-breadcrumb-ld",
    info
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
            {
              "@type": "ListItem",
              position: 2,
              name: `${info.titleName} PVC Print`,
              item: `${SITE_URL}/pvc-card/${info.slug}`,
            },
          ],
        }
      : null
  );

  if (!info) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">Card type not found</h1>
          <p className="text-slate-600 mb-8 max-w-md">
            We print AAY, PHH, SPHH, RKSY-I and RKSY-II ration cards plus ABHA, E-SHRAM and General PVC cards.
            Please check the URL or start from the home page.
          </p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const siblings = Object.values(CARD_TYPE_PAGES).filter((t) => t.slug !== info.slug);
  const isRation = info.category === "ration";

  const steps = [
    {
      icon: <Download className="w-6 h-6 text-blue-500" />,
      title: info.officialUrl ? "Get your official PDF (free)" : "Prepare your PDF or scan",
      desc:
        info.officialUrl
          ? `Download your ${info.code} card PDF free from ${info.officialName}. Menus on government portals change from time to time — look for the card download option.`
          : "Have a clear PDF or high-resolution scan of your card or document ready. We print it exactly as uploaded.",
    },
    {
      icon: <CreditCard className="w-6 h-6 text-emerald-500" />,
      title: "Order & pay by UPI",
      desc: `Fill the order form with your delivery address, pay ₹${single} (or ₹${multi} per card for 2+) via Google Pay, PhonePe, Paytm or any UPI app, and upload the payment screenshot.`,
    },
    {
      icon: <Truck className="w-6 h-6 text-orange-500" />,
      title: "Doorstep delivery",
      desc: "Your card is printed and dispatched within 24–48 hours of confirmation. Speed Post delivery takes 3–5 working days anywhere in West Bengal.",
    },
  ];

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <Shield className="w-4 h-4 text-blue-300" />
              <span>Private printing service · Not a government website</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 leading-tight">
              {info.titleName} — PVC Print
              <span className="block text-blue-300 text-2xl md:text-3xl mt-1">{info.bengali}</span>
            </h1>
            <p className="text-slate-400 text-sm mb-4">{info.fullName}</p>
            <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
              Get your {info.code} card as a durable, waterproof, wallet-size PVC card — delivered to your doorstep
              anywhere in West Bengal. ₹{single} for one card, ₹{multi} per card for 2 or more.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/order">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-400 text-white font-semibold w-full sm:w-auto" data-testid="button-cardtype-order">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Order {info.code} PVC Card
                </Button>
              </Link>
              <Link href="/track">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
                >
                  Track Your Order
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Quick answer — direct, quotable block for AI search engines */}
        <section className="py-10 px-4 bg-white border-b border-slate-100">
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5" data-testid="text-cardtype-quick-answer">
              <p className="text-sm text-slate-700 leading-relaxed">
                <strong>Quick answer:</strong> {info.whatIs}{" "}
                {info.officialUrl ? (
                  <>
                    The card itself is issued free by the government — {info.officialNote.charAt(0).toLowerCase()}
                    {info.officialNote.slice(1)}
                  </>
                ) : (
                  info.officialNote
                )}{" "}
                erationcards.in is a private service that prints your{" "}
                {info.officialUrl ? "already-issued " : ""}
                {info.code} card on bank-card grade PVC (85.6mm × 54mm) for ₹{single} (₹{multi} per card for 2+),
                including Speed Post doorstep delivery across West Bengal.
              </p>
              <p className="text-xs text-slate-400 mt-3">Last updated: July 2026 · Prices shown are current</p>
            </div>
          </div>
        </section>

        {/* What is this card */}
        <section className="py-14 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">
              What is the {info.titleName}? ({info.bengali})
            </h2>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>{info.whatIs}</p>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Who it's for</p>
                  <p className="text-sm">{info.whoFor}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Issued under</p>
                  <p className="text-sm">{info.scheme}</p>
                </div>
              </div>
              <div className="flex gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-5 mt-2">
                <BadgeCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm text-emerald-900">
                  <p className="font-semibold mb-1">
                    {info.officialUrl ? "The official card is free" : "You supply the file — we only print it"}
                  </p>
                  <p>
                    {info.officialNote}{" "}
                    {info.officialUrl ? (
                      <a
                        href={info.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-medium inline-flex items-center gap-1"
                        data-testid="link-cardtype-official"
                      >
                        Visit the official portal <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : null}{" "}
                    {info.officialUrl
                      ? "We only print it on durable PVC — we never issue, edit or modify government documents."
                      : "We print it on durable PVC exactly as uploaded — we never issue, edit or modify any document."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-14 px-4 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
              {info.code} PVC card price
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm max-w-lg mx-auto">
              <table className="w-full text-sm" data-testid="table-cardtype-price">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="text-left font-semibold px-4 py-3">Quantity</th>
                    <th className="text-right font-semibold px-4 py-3">Price per card</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">1 card</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{single}</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-700">2 or more cards (each)</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{multi}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-center text-xs text-slate-500 mt-4 max-w-md mx-auto">
              Printing, packaging and Speed Post doorstep delivery included — no hidden charges.{" "}
              {isRation
                ? "Same price for every ration category: AAY, PHH, SPHH, RKSY-I, RKSY-II."
                : "Same price for ABHA, E-SHRAM and GENERAL cards."}
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-14 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
              How to get your {info.code} card on PVC
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {steps.map((item, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center text-center bg-slate-50 rounded-xl p-6 border border-slate-100"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center mb-3">
                    {item.icon}
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Step {i + 1}</p>
                  <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500 mt-6">
              {isRation ? (
                <>
                  New to this?{" "}
                  <Link href="/guides/download-e-ration-card" className="text-primary hover:underline">
                    Step-by-step e-Ration Card download guide
                  </Link>
                  {" · "}
                  <Link href="/guides/ration-card-types-west-bengal" className="text-primary hover:underline">
                    All ration card types explained
                  </Link>
                </>
              ) : (
                <>
                  Official download links for ABHA, e-Shram and e-Ration Card are on our{" "}
                  <Link href="/download" className="text-primary hover:underline">
                    Download page
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14 px-4 bg-slate-50">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
              {info.titleName} PVC print — Frequently Asked Questions
            </h2>
            <div className="space-y-4" data-testid="list-cardtype-faq">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  lang={faq.lang}
                  className="group border border-slate-200 bg-white rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 list-none">
                    {faq.q}
                    <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform shrink-0">▼</span>
                  </summary>
                  <div className="px-5 py-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Other card types */}
        <section className="py-14 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-800 text-center mb-6">Other cards we print on PVC</h2>
            <div className="flex flex-wrap justify-center gap-3" data-testid="list-cardtype-siblings">
              {siblings.map((t) => (
                <Link
                  key={t.slug}
                  href={`/pvc-card/${t.slug}`}
                  className={`border rounded-full px-4 py-2 text-sm font-medium hover:shadow-sm transition-shadow ${t.chip}`}
                >
                  {t.code} <span className="opacity-70 font-normal">· {t.titleName}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-3">Order your {info.titleName} PVC print today</h2>
            <p className="text-blue-100 mb-8 text-sm">
              ₹{single} for one card, ₹{multi} per card for 2 or more — printed in 24–48 hours, delivered by Speed
              Post anywhere in West Bengal.
            </p>
            <Link href="/order">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold" data-testid="button-cardtype-cta">
                <FileText className="w-4 h-4 mr-2" />
                Start Your Order
              </Button>
            </Link>
            <p className="text-blue-200/80 text-xs mt-6 max-w-md mx-auto">
              erationcards.in is a private printing service and is not affiliated with any government department.{" "}
              {info.officialUrl
                ? `Official ${info.code} card services are free at ${info.officialName}.`
                : "We print the file you upload exactly as it is — we never issue or modify documents."}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
