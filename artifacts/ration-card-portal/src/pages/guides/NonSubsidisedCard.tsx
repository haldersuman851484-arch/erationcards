import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/non-subsidised-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Understand what the non-subsidised card is",
    text: "It's a valid West Bengal ration card with zero foodgrain entitlement — no subsidised grain, but a fully official card useful as an identity and family record document. It suits households that don't want or don't qualify for subsidy.",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. The non-subsidised card application/conversion is Form-10 — free online, or on paper at your food office.',
  },
  {
    name: "Choose new card or conversion",
    text: "Form-10 covers both: applying fresh for a non-subsidised card, or converting your family's existing subsidised cards to non-subsidised (a common step when income has grown and you want to give up the subsidy cleanly).",
  },
  {
    name: "Fill member details as per Aadhaar",
    text: "Enter each member's name, date of birth and Aadhaar number exactly as on Aadhaar, and the existing card numbers if converting.",
  },
  {
    name: "Verify with OTP and submit",
    text: "Confirm with the OTP sent to your mobile, submit, and save the application number to track progress on the portal.",
  },
  {
    name: "Download the e-Ration Card after approval",
    text: "Approved members get their digital cards showing the non-subsidised status — download one PDF per member from the portal.",
  },
];

export default function NonSubsidisedCard() {
  const PRICING = usePricing();

  useSeo({
    title: "Non-Subsidised Ration Card West Bengal (Form-10) — Who It's For & How to Apply Free",
    description: `West Bengal's non-subsidised ration card: a valid government card with no foodgrain subsidy — ideal as ID and family record. Apply or convert free with Form-10 on food.wb.gov.in. Print it on waterproof PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Why would anyone want a ration card with no subsidy?",
      a: "Because a ration card is more than grain — it's a widely accepted identity and family-record document, keeps every member inside the food-department system (helpful for future needs), and beats having no card at all if your household doesn't qualify for subsidised categories.",
    },
    {
      q: "Is the non-subsidised card free to get?",
      a: "Yes. Form-10 — whether a fresh application or converting existing cards — is free on food.wb.gov.in and at government offices.",
    },
    {
      q: "Is the non-subsidised card the same as RKSY-II?",
      a: "No. RKSY-II is a state scheme category that still carries a small subsidised entitlement. The non-subsidised card carries none — it's purely an official card and record.",
    },
    {
      q: "Can we switch back to a subsidised card later?",
      a: "You can apply — if your circumstances change, request a category with Form-8. The government verifies eligibility before approving any subsidised category; nothing is automatic.",
    },
    {
      q: "Does the non-subsidised card need Aadhaar eKYC too?",
      a: "Keeping Aadhaar linked is recommended for all cards — it keeps the record clean and avoids deactivation issues. The linking is free via OTP or at a ration shop.",
    },
    {
      q: "Can I print a non-subsidised card on PVC?",
      a: `Yes — it's a normal e-Ration Card PDF, and we print it exactly like any other ration card: ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, delivery included.`,
    },
    {
      q: "নন-সাবসিডাইজড রেশন কার্ড কী?",
      a: `এটি পশ্চিমবঙ্গের বৈধ সরকারি রেশন কার্ড, তবে ভর্তুকির খাদ্যশস্য পাওয়া যায় না — পরিচয়পত্র ও পারিবারিক রেকর্ড হিসেবে কাজে লাগে। food.wb.gov.in-এ Form-10 দিয়ে বিনামূল্যে আবেদন বা রূপান্তর করুন। PDF পেলে erationcards.in থেকে PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-nonsub",
    canonical: CANONICAL,
    breadcrumbName: "Non-Subsidised Card Guide",
    howTo: {
      name: "How to get a non-subsidised ration card in West Bengal (Form-10, free)",
      description:
        "Apply for or convert to West Bengal's non-subsidised ration card free using Form-10 on food.wb.gov.in — a valid card with no foodgrain subsidy.",
      totalTime: "PT15M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="Non-Subsidised Ration Card in West Bengal — What It Is & How to Apply (Form-10)"
      intro="A fully valid government card with zero foodgrain subsidy — the clean option for families who don't need the grain."
      quickAnswer={
        <>
          West Bengal's <strong>non-subsidised ration card</strong> is a valid government card with no foodgrain
          entitlement — used as identity and family-record proof. Apply fresh or convert your existing cards free
          with <strong>Form-10</strong> on <strong>food.wb.gov.in</strong> (E-Citizen section): fill details as per
          Aadhaar, verify with OTP, track the application, then download each member's e-Ration Card PDF.
          erationcards.in prints it on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/ration-card-types-west-bengal", label: "All WB card categories compared (AAY → RKSY-II)" },
        { href: "/guides/surrender-ration-card-west-bengal", label: "Surrendering entirely instead (Form-7)" },
        { href: "/guides/ration-card-category-change-west-bengal", label: "Moving to a subsidised category later (Form-8)" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: get the non-subsidised card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Who typically chooses it</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>Households whose income grew beyond the subsidised categories and who want to give up the grain honestly</li>
          <li>Families that never took ration but want every member on an official family record</li>
          <li>People who need a ration card as supporting ID for other paperwork</li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          Compare it with the subsidised categories in our{" "}
          <Link href="/guides/ration-card-types-west-bengal" className="text-primary hover:underline">
            card types guide
          </Link>{" "}
          before deciding.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Using it as ID? Make it look the part"
        body={`A wallet-size waterproof PVC print beats a folded printout at every counter — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
