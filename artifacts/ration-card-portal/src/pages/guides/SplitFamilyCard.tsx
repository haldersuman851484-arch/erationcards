import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/split-ration-card-family-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Confirm a split is what you need",
    text: "Form-13 divides one ration card family into separate family units — right when part of the household now lives and cooks separately (brothers separating, a partition of the home). One person joining a different existing family (a bride joining in-laws) is Form-14 instead.",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. The family split is Form-13 — free online, or on paper at your food inspector or BDO office.',
  },
  {
    name: "Choose the Form-13 split option",
    text: 'Look for "Separation of family" or Form-13. Anything about splitting an existing ration card family into separate units is the right place.',
  },
  {
    name: "Select the members moving to the new family unit",
    text: "Enter the existing card numbers and mark which members form the new separate family, with the new unit's address and preferred fair-price shop if it differs.",
  },
  {
    name: "Upload the supporting document",
    text: "An address proof of the separated household helps (electricity bill, rent agreement). Aadhaar of the members should already match the card records.",
  },
  {
    name: "Verify with OTP, submit and track",
    text: "Confirm with the OTP on your registered mobile, save the application number, and track it on the portal while the inspector verifies the separation.",
  },
  {
    name: "Download fresh e-Ration Cards after approval",
    text: "Once approved, the members' digital cards reflect the new family grouping — download a fresh PDF per member, since old PDFs show the old family details.",
  },
];

export default function SplitFamilyCard() {
  const PRICING = usePricing();

  useSeo({
    title: "How to Split a Family Ration Card in West Bengal (Form-13) — Separate Family Units, Free",
    description: `Split one West Bengal ration card family into separate units free with Form-13 on food.wb.gov.in — for households now living and cooking separately. Steps, documents and Form-13 vs Form-14 explained. Print updated cards on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "When does a family need Form-13?",
      a: "When one card family genuinely becomes two households — separate kitchens, often separate addresses: brothers partitioning a home, a son's family moving out, and similar situations. The food department treats 'living and cooking separately' as the test.",
    },
    {
      q: "Is the family split free?",
      a: "Yes — Form-13 is free on food.wb.gov.in and at government offices, like every WB ration card service. No agent is needed.",
    },
    {
      q: "Do members get new card numbers after a split?",
      a: "Each member's individual card continues — what changes is the family grouping, address and tagged shop for the separated unit. Download fresh e-Ration Card PDFs after approval so your copies show the updated details.",
    },
    {
      q: "My daughter-in-law needs to join our card — is that a split?",
      a: "No, that's the opposite — one person moving into an existing family is a Form-14 member transfer. See our member transfer guide.",
    },
    {
      q: "Can the new unit pick its own ration shop?",
      a: "Yes — the separated family can be tagged to a shop near its address (that's part of the split), and can later change it anytime with Form-6.",
    },
    {
      q: "How long does the split take?",
      a: "Typically a few weeks — the inspector may verify that the households are genuinely separate before approval. Track the application number on the portal.",
    },
    {
      q: "রেশন কার্ডে পরিবার আলাদা করব কীভাবে?",
      a: `যখন এক পরিবারের সদস্যরা আলাদা বাড়িতে বা আলাদা হেঁশেলে থাকেন, তখন food.wb.gov.in-এ Form-13 দিয়ে বিনামূল্যে পরিবার ভাগ করা যায় — OTP দিয়ে যাচাই, ইন্সপেক্টর অনুমোদনের পর নতুন PDF ডাউনলোড করুন। আপডেট হওয়া কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-split",
    canonical: CANONICAL,
    breadcrumbName: "Split Family Card Guide",
    howTo: {
      name: "How to split a family ration card in West Bengal (Form-13, free)",
      description:
        "Divide one West Bengal ration card family into separate family units free using Form-13 on food.wb.gov.in — for households living and cooking separately.",
      totalTime: "PT15M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Split a Family Ration Card in West Bengal (Form-13)"
      intro="Two households under one old card? Form-13 separates the family units free on food.wb.gov.in."
      quickAnswer={
        <>
          Use <strong>Form-13</strong> on <strong>food.wb.gov.in</strong> (official, free) to split one ration card
          family into separate units when members now live and cook separately: select the members forming the new
          unit, give the new address (and shop if different), upload an address proof, verify with OTP and track the
          application. After approval, download fresh e-Ration Card PDFs — erationcards.in prints each on waterproof
          PVC for ₹{PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or more), delivered
          to your door.
        </>
      }
      related={[
        { href: "/guides/ration-card-member-transfer-west-bengal", label: "One person joining another family? Form-14 instead" },
        { href: "/guides/change-ration-shop-west-bengal", label: "Pick a nearer shop for the new unit (Form-6)" },
        { href: "/guides/download-e-ration-card", label: "Download the updated e-Ration Cards after approval" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: split the family card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Form-13 or Form-14? A 10-second check</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Whole group becomes its own new family</strong> (separate house/kitchen) → <strong>Form-13</strong>{" "}
            split.
          </li>
          <li>
            <strong>One person joins a different existing family</strong> (marriage, adoption) →{" "}
            <Link href="/guides/ration-card-member-transfer-west-bengal" className="text-primary hover:underline">
              Form-14 transfer
            </Link>
            .
          </li>
          <li>
            <strong>Someone leaves West Bengal permanently</strong> →{" "}
            <Link href="/guides/surrender-ration-card-west-bengal" className="text-primary hover:underline">
              Form-7 surrender
            </Link>{" "}
            of that member's card.
          </li>
        </ul>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="New family unit sorted? Give everyone a fresh card"
        body={`After approval, download each member's updated e-Ration Card and we'll print the set on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
