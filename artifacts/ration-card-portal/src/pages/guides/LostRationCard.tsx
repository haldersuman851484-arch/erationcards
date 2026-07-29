import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { useJsonLd } from "@/lib/jsonld";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";

const CANONICAL = "https://erationcards.in/guides/lost-ration-card-west-bengal";

export default function LostRationCard() {
  const PRICING = usePricing();

  useSeo({
    title: "Lost Ration Card West Bengal? How to Get It Back Free (2026 Guide)",
    description: `Lost or damaged your West Bengal ration card? Your record is digital — re-download the e-Ration Card PDF free at food.wb.gov.in, no penalty or FIR needed. Optional waterproof PVC reprint from ₹${PRICING.ration.multi.public}.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is there a fine or fee for losing my ration card?",
      a: "No. Your ration card record lives in the government's digital system, not in the piece of paper. Downloading a fresh e-Ration Card PDF from food.wb.gov.in is free, any number of times. Nobody can legitimately charge you a 'duplicate card fee' for the digital copy.",
    },
    {
      q: "Do I need to file a police complaint (FIR) for a lost ration card?",
      a: "Not just to get your card back — re-downloading the e-Ration Card is free and needs no FIR. If you're worried the lost card could be misused, inform your local food & supplies office; they can advise on any extra steps, since your entitlements are tied to the government's digital record rather than the physical card alone. Exact requirements can vary by local office.",
    },
    {
      q: "I don't remember my ration card number at all. What now?",
      a: "Three easy routes: (1) ask your ration dealer — they can look you up; (2) check another family member's card, since family records are linked; (3) use the search options on food.wb.gov.in or visit your nearest food & supplies office with your ID (Aadhaar is usually asked for; the exact process may vary by office). Once you have the number, download the PDF free.",
    },
    {
      q: "My ration card is damaged but readable. Should I replace it?",
      a: "Your entitlements are unaffected — the record is digital. But if the printed copy is fading or torn, download a fresh PDF free and consider a waterproof PVC print so it doesn't happen again. Shopkeepers are also far less likely to question a clean, bank-card style copy.",
    },
    {
      q: "I lost the PVC card you printed for me. Can I reorder?",
      a: `Yes, anytime. Place a new order with the same e-Ration Card PDF — ₹${PRICING.ration.single.public} for one card or ₹${PRICING.ration.multi.public} per card for 2 or more, dispatched within 24–48 hours. There is no penalty; it's simply a fresh print.`,
    },
    {
      q: "রেশন কার্ড হারিয়ে গেলে কী করব?",
      a: `চিন্তার কিছু নেই — আপনার রেশন কার্ডের রেকর্ড সরকারের ডিজিটাল সিস্টেমে সুরক্ষিত আছে। food.wb.gov.in থেকে যেকোনো সময় বিনামূল্যে e-Ration Card PDF আবার ডাউনলোড করুন — কোনো জরিমানা নেই, FIR লাগে না। চাইলে erationcards.in থেকে ওয়াটারপ্রুফ PVC কপি প্রিন্ট করান — একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useJsonLd("guide-lost-faq-ld", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: ["en-IN", "bn"],
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      ...(f.lang ? { inLanguage: f.lang } : {}),
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
  useJsonLd("guide-lost-breadcrumb-ld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://erationcards.in/" },
      { "@type": "ListItem", position: 2, name: "Lost Ration Card Guide", item: CANONICAL },
    ],
  });

  return (
    <GuideLayout
      title="Lost or Damaged Ration Card in West Bengal? Here's What to Do"
      intro="No panic, no penalty — your card is digital and the copy is free to recover."
      quickAnswer={
        <>
          Your West Bengal ration card record is stored digitally by the government, so a lost or damaged card is
          never gone. Re-download your <strong>e-Ration Card PDF free at food.wb.gov.in</strong> — no fee, no FIR,
          no application. If you don't remember the card number, your ration dealer or nearest food &amp; supplies
          office can look it up. To stop it happening again, get the PDF printed on a waterproof PVC card (₹
          {PRICING.ration.single.public} single / ₹{PRICING.ration.multi.public} each for 2+).
        </>
      }
      related={[
        { href: "/guides/download-e-ration-card", label: "How to download your e-Ration Card PDF (free)" },
        { href: "/guides/ration-card-types-west-bengal", label: "AAY, PHH, SPHH, RKSY-I & RKSY-II — card types explained" },
        { href: "/track", label: "Track an existing PVC card order" },
      ]}
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Pick your situation</h2>
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Lost the paper or laminated card</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Download a fresh e-Ration Card PDF from food.wb.gov.in using your card number and category — takes
              about five minutes and costs nothing. Full steps in our{" "}
              <Link href="/guides/download-e-ration-card" className="text-primary hover:underline">
                download guide
              </Link>
              .
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Lost the PDF file too</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              The download isn't one-time — you can re-download the PDF from the official portal as many times as
              you need, free. Save a copy to Google Drive or email it to yourself so it's always recoverable.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Don't know the ration card number</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ask your local ration dealer (they can look up your family), check a family member's card, or visit
              your nearest food &amp; supplies office. The official portal also offers search options, though these
              change as the site is updated. Once you have the number, the PDF is one download away.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Card details are wrong or outdated</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Corrections (name, address, family members) are a free government service at food.wb.gov.in or the
              food &amp; supplies office. Fix the record first — then any copy you print will be correct.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Want a copy that can't be lost to rain or a torn pocket</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Once you have the PDF, we print it on bank-card grade waterproof PVC — the same material as an ATM
              card — for ₹{PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2+), delivered
              by Speed Post to all 23 districts within days.
            </p>
          </div>
        </div>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Never lose it again"
        body={`Waterproof, tear-proof, wallet-size — your ration card on real PVC for ₹${PRICING.ration.single.public} single or ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
