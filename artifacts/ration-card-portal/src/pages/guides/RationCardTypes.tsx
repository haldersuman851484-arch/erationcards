import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { useJsonLd } from "@/lib/jsonld";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";

const CANONICAL = "https://erationcards.in/guides/ration-card-types-west-bengal";

const TYPES = [
  {
    code: "AAY",
    fullName: "Antyodaya Anna Yojana",
    scheme: "NFSA (central)",
    who: "The poorest of poor households, identified by the government for the highest level of food support.",
  },
  {
    code: "PHH",
    fullName: "Priority Household",
    scheme: "NFSA (central)",
    who: "Households that qualify for subsidised foodgrains under the National Food Security Act — the most common category.",
  },
  {
    code: "SPHH",
    fullName: "Special Priority Household",
    scheme: "NFSA (central)",
    who: "Priority households given special status in West Bengal's classification.",
  },
  {
    code: "RKSY-I",
    fullName: "Rajya Khadya Suraksha Yojana — I",
    scheme: "West Bengal state scheme",
    who: "Households outside the central NFSA list that the state supports with subsidised foodgrains under Khadya Sathi.",
  },
  {
    code: "RKSY-II",
    fullName: "Rajya Khadya Suraksha Yojana — II",
    scheme: "West Bengal state scheme",
    who: "Remaining households covered by the state scheme with a smaller entitlement than RKSY-I.",
  },
];

export default function RationCardTypes() {
  const PRICING = usePricing();

  useSeo({
    title: "AAY vs PHH vs SPHH vs RKSY — West Bengal Ration Card Types Explained",
    description: `What AAY, PHH, SPHH, RKSY-I and RKSY-II mean on a West Bengal ration card, how to check which type you have, and how to get any of them printed on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "How do I check which ration card type I have?",
      a: "The category code (AAY, PHH, SPHH, RKSY-I or RKSY-II) is printed on the card itself — on the e-Ration Card PDF it appears near the top alongside your card number. If you can't find it, your local ration dealer can tell you instantly from your card number.",
    },
    {
      q: "Can I choose or change my ration card category?",
      a: "No — the category is assigned by the government based on eligibility criteria. If you believe your category is wrong, you can apply for a review through food.wb.gov.in or your nearest food & supplies office. That service is free; nobody can legitimately charge you to 'upgrade' a card.",
    },
    {
      q: "What do AAY, PHH, SPHH and RKSY entitle me to?",
      a: "Each category carries a different foodgrain entitlement set by the central NFSA or the West Bengal Khadya Sathi scheme. The exact quantities are decided by the government and can change, so check the current entitlement chart on food.wb.gov.in or ask your ration dealer.",
    },
    {
      q: "Do all card types work for PVC printing?",
      a: `Yes. We print every West Bengal ration card category — AAY, PHH, SPHH, RKSY-I and RKSY-II — at the same price: ₹${PRICING.ration.single.public} for a single card, ₹${PRICING.ration.multi.public} per card for 2 or more. The printed PVC card follows the official design of your category.`,
    },
    {
      q: "Is the PVC card valid at the ration shop?",
      a: "The PVC card is a durable printed copy of your official e-Ration Card — same number, same details, same QR/barcode as the PDF. Your entitlements always come from the government's digital record; the plastic card just means the copy in your wallet doesn't tear or fade.",
    },
    {
      q: "আমার রেশন কার্ড কোন ক্যাটাগরির, কীভাবে বুঝব?",
      a: `কার্ডের উপরের দিকে ক্যাটাগরি কোড লেখা থাকে — AAY, PHH, SPHH, RKSY-I বা RKSY-II। e-Ration Card PDF-এও কার্ড নম্বরের পাশে এটি দেখা যায়। যেকোনো ক্যাটাগরির কার্ড আমরা PVC-তে প্রিন্ট করি — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useJsonLd("guide-types-faq-ld", {
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
  useJsonLd("guide-types-breadcrumb-ld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://erationcards.in/" },
      { "@type": "ListItem", position: 2, name: "Ration Card Types Guide", item: CANONICAL },
    ],
  });

  return (
    <GuideLayout
      title="West Bengal Ration Card Types: AAY, PHH, SPHH, RKSY-I & RKSY-II Explained"
      intro="What each category code on your card means, who gets it, and how to check yours."
      quickAnswer={
        <>
          West Bengal ration cards come in five categories: <strong>AAY</strong> (Antyodaya Anna Yojana — poorest
          households), <strong>PHH</strong> (Priority Household) and <strong>SPHH</strong> (Special Priority
          Household) under the central NFSA, plus <strong>RKSY-I</strong> and <strong>RKSY-II</strong> under the
          state's Rajya Khadya Suraksha Yojana. Your category is printed on the card — you don't choose it, the
          government assigns it. All five can be printed on a waterproof PVC card for ₹
          {PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2+).
        </>
      }
      related={[
        { href: "/guides/download-e-ration-card", label: "How to download your e-Ration Card PDF (free)" },
        { href: "/guides/lost-ration-card-west-bengal", label: "Lost or damaged ration card? Here's what to do" },
        { href: "/faq", label: "All questions about PVC ration card printing" },
      ]}
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-4">The five categories at a glance</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full text-sm" data-testid="table-card-types">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-900">Code</th>
                <th className="px-4 py-3 font-semibold text-slate-900">Full name</th>
                <th className="px-4 py-3 font-semibold text-slate-900">Scheme</th>
                <th className="px-4 py-3 font-semibold text-slate-900">Who gets it</th>
              </tr>
            </thead>
            <tbody>
              {TYPES.map((t) => (
                <tr key={t.code} className="border-t border-slate-200 align-top">
                  <td className="px-4 py-3 font-bold text-primary whitespace-nowrap">{t.code}</td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{t.fullName}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{t.scheme}</td>
                  <td className="px-4 py-3 text-slate-600 leading-relaxed">{t.who}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Foodgrain entitlements per category are set by the government and revised from time to time — check
          food.wb.gov.in for the current chart.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Where to find your category</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Open your e-Ration Card PDF (or look at your old paper card): the category code is printed near the top,
          next to your ration card number. Every family member has their own card and the category can differ
          between members of the same family. Don't have the PDF yet? Follow our{" "}
          <Link href="/guides/download-e-ration-card" className="text-primary hover:underline">
            free download guide
          </Link>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Does the type change the PVC print price?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          No. Every ration card category — AAY, PHH, SPHH, RKSY-I, RKSY-II — costs the same to print: ₹
          {PRICING.ration.single.public} for a single card or ₹{PRICING.ration.multi.public} per card for 2 or more,
          printing and Speed Post delivery included. Each category keeps its official card design and colour. We
          also print ABHA, E-SHRAM and other general cards at ₹{PRICING.special.single.public} single / ₹
          {PRICING.special.multi.public} each for 2+.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Whatever your category — make it wallet-proof"
        body={`Upload your e-Ration Card PDF and we print it on bank-card grade PVC in the official design of your category. ₹${PRICING.ration.single.public} single, ₹${PRICING.ration.multi.public} per card for 2 or more, delivered across all 23 districts.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
