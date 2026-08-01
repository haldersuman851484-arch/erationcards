import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/reactivate-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Confirm the card really is deactivated",
    text: 'On food.wb.gov.in, run "Check the status of your Ration Card" with the card number and category. Note what the eKYC/Aadhaar column shows — pending eKYC is the usual culprit.',
  },
  {
    name: "Open the deactivated-card eKYC option",
    text: 'In the "E-Citizen" section, look for the option to link Aadhaar with a de-activated ration card through mobile OTP. The portal keeps a dedicated flow for exactly this situation.',
  },
  {
    name: "Enter the card number and Aadhaar number",
    text: "Fill in the deactivated card's number and the member's Aadhaar. Details must belong to the same person — that's what the verification checks.",
  },
  {
    name: "Confirm with the OTP on the Aadhaar-linked mobile",
    text: "Enter the OTP sent to the mobile registered with that Aadhaar. If no mobile is linked to the Aadhaar, use the fingerprint route instead — your ration dealer's e-PoS machine does the same linking free.",
  },
  {
    name: "Wait for verification, then re-check the status",
    text: "After successful eKYC the card is reactivated once the department's verification completes — typically visible within days. Run the status check again until it shows Active.",
  },
  {
    name: "Resume drawing ration — and download a fresh PDF",
    text: "Benefits resume from the next distribution once Active. Download a fresh e-Ration Card PDF so your copy reflects the current status.",
  },
];

export default function ReactivateCard() {
  const PRICING = usePricing();

  useSeo({
    title: "Ration Card Deactivated? How to Reactivate It in West Bengal (Aadhaar eKYC by OTP)",
    description: `Reactivate a deactivated West Bengal ration card free: complete the pending Aadhaar eKYC on food.wb.gov.in via mobile OTP (or fingerprint at the ration shop) and the card returns to Active. Then print it on waterproof PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Why was my ration card deactivated?",
      a: "In most cases: Aadhaar eKYC was pending. The government deactivates unlinked cards to weed out duplicates. Less common reasons include suspected duplicate cards or very long non-use. The status check on food.wb.gov.in shows the eKYC column.",
    },
    {
      q: "Does reactivation cost anything?",
      a: "No — completing eKYC and reactivating a genuine card is free, whether by OTP on the portal or fingerprint at the ration shop. Never pay an agent for it.",
    },
    {
      q: "How long does reactivation take after eKYC?",
      a: "The linking itself takes two minutes; the card usually shows Active again within days once verification completes. Keep re-checking the status page.",
    },
    {
      q: "There's no mobile linked to my Aadhaar — OTP is impossible.",
      a: "Two free fixes: (1) your ration dealer's e-PoS machine links Aadhaar by fingerprint, no mobile needed; (2) update your mobile at an Aadhaar Seva Kendra, then use the OTP flow. Elderly members with worn fingerprints should carry Aadhaar to the dealer — iris/alternative verification may be available at food offices.",
    },
    {
      q: "Will I get the ration I missed while deactivated?",
      a: "Entitlements resume from the next distribution after the card is Active. Missed past months generally aren't back-paid, which is why fixing eKYC promptly matters.",
    },
    {
      q: "The card shows Active but the name is wrong now.",
      a: "Separate issue — run a free Form-5 correction so the record matches Aadhaar. Our correction guide covers it.",
    },
    {
      q: "ডিঅ্যাক্টিভেট হওয়া রেশন কার্ড কীভাবে চালু করব?",
      a: `বেশিরভাগ ক্ষেত্রে আধার eKYC বাকি থাকায় কার্ড বন্ধ হয়। food.wb.gov.in-এ ডিঅ্যাক্টিভেটেড কার্ডের জন্য আলাদা OTP অপশন আছে — কার্ড নম্বর ও আধার দিন, OTP দিলে যাচাইয়ের পর কার্ড আবার Active হয়। সম্পূর্ণ বিনামূল্যে। কার্ড চালু হলে erationcards.in থেকে PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-reactivate",
    canonical: CANONICAL,
    breadcrumbName: "Reactivate Ration Card Guide",
    howTo: {
      name: "How to reactivate a deactivated West Bengal ration card (eKYC, free)",
      description:
        "Reactivate a deactivated West Bengal ration card free by completing Aadhaar eKYC — mobile OTP flow on food.wb.gov.in or fingerprint at the ration shop.",
      totalTime: "PT10M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="Ration Card Deactivated? How to Reactivate It in West Bengal"
      intro="Nine times out of ten it's pending Aadhaar eKYC — and the fix is a free 2-minute OTP on food.wb.gov.in."
      quickAnswer={
        <>
          A deactivated West Bengal ration card is almost always waiting for <strong>Aadhaar eKYC</strong>. On{" "}
          <strong>food.wb.gov.in</strong> (official, free), use the dedicated option to link Aadhaar with a
          de-activated ration card via mobile OTP — enter the card number and Aadhaar, confirm the OTP, and the card
          returns to Active after verification (fingerprint at your ration dealer works too). Benefits resume from
          the next distribution. Once Active, erationcards.in prints your card on waterproof PVC for ₹
          {PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or more), delivered to your
          door.
        </>
      }
      related={[
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "The full Aadhaar & mobile linking guide (eKYC)" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check your card's live status" },
        { href: "/guides/download-e-ration-card", label: "Download a fresh e-Ration Card PDF once Active" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: reactivate your card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">If eKYC doesn't fix it</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          When the status check shows the card deactivated for a reason other than pending eKYC — or it stays
          deactivated weeks after successful linking — take your Aadhaar and card number to the local food
          inspector's office or ration dealer, or use the grievance/helpline options listed on food.wb.gov.in. A
          genuine single card for a living person is always recoverable; only duplicates and ineligible cards stay
          closed.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Card active again? Keep it that way — in your wallet"
        body={`Print the reactivated card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
