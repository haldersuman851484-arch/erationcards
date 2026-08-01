import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/surrender-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Decide what you're surrendering",
    text: "You can surrender a single member's card (after a death, or someone settling permanently outside West Bengal) or the whole family's cards (entire family migrating, or no longer wanting the cards).",
  },
  {
    name: "Consider the non-subsidised switch instead",
    text: "If you only want to stop taking subsidised grain but keep the card as identity/record proof, don't surrender — convert to a non-subsidised card with Form-10 instead. See our non-subsidised card guide.",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. Surrender is Form-7 — free online, or on paper at your ration dealer, food inspector or BDO office.',
  },
  {
    name: "Fill Form-7 with the member details",
    text: "Enter the ration card number(s) of the member(s) being surrendered and select the reason — death, migration, voluntary give-up, or ineligibility.",
  },
  {
    name: "Attach the supporting document",
    text: "For a deceased member, upload the death certificate. For migration or voluntary surrender, Aadhaar and the card number are usually all that's needed.",
  },
  {
    name: "Verify with OTP, submit and keep the acknowledgement",
    text: "Submit with the OTP sent to your registered mobile and save the acknowledgement number — it's your proof that the card was surrendered properly.",
  },
];

export default function SurrenderRationCard() {
  const PRICING = usePricing();

  useSeo({
    title: "How to Surrender a Ration Card in West Bengal (Form-7) — Death, Migration or Voluntary",
    description: `Surrender a West Bengal ration card free with Form-7 on food.wb.gov.in — after a death in the family, migration, or when you no longer qualify. Documents and OTP steps explained. Keep remaining family cards safe on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is surrendering a ration card free?",
      a: "Yes. Form-7 on food.wb.gov.in and at government offices costs nothing. Keep the acknowledgement number as proof of surrender.",
    },
    {
      q: "A family member passed away. Do we surrender their card?",
      a: "Yes — surrender the deceased member's card with Form-7 and the death certificate. The rest of the family's cards continue as normal; only that member's card is closed.",
    },
    {
      q: "We no longer qualify for subsidised grain. Must we surrender?",
      a: "If the household is no longer eligible for its subsidised category, the honest options are surrendering the subsidised cards (Form-7) or converting to the non-subsidised card (Form-10) to keep a valid card without foodgrain benefits. Continuing to draw subsidy while ineligible can invite recovery action.",
    },
    {
      q: "Can we get a card again after surrendering?",
      a: "Yes. If circumstances change, apply afresh — Form-3 for a family with no cards, or Form-4 to add a member back to an existing family card. Approval follows the normal eligibility verification.",
    },
    {
      q: "Someone is moving abroad / to another state permanently.",
      a: "Surrender that member's West Bengal card with Form-7. If they're moving to another Indian state, they can apply for a card there under that state's rules once settled.",
    },
    {
      q: "রেশন কার্ড সারেন্ডার করব কীভাবে?",
      a: `food.wb.gov.in-এ Form-7 দিয়ে বিনামূল্যে কার্ড সারেন্ডার করুন — মৃত্যুর ক্ষেত্রে ডেথ সার্টিফিকেট লাগে, OTP দিয়ে যাচাই হয়। ভর্তুকি ছাড়তে চাইলে সারেন্ডার না করে Form-10 দিয়ে নন-সাবসিডাইজড কার্ডেও বদলাতে পারেন। বাকি সদস্যদের কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-surrender",
    canonical: CANONICAL,
    breadcrumbName: "Surrender Ration Card Guide",
    howTo: {
      name: "How to surrender a West Bengal ration card (Form-7, free)",
      description:
        "Surrender a West Bengal ration card free using Form-7 on food.wb.gov.in — for a deceased member, permanent migration, or voluntary give-up.",
      totalTime: "PT10M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Surrender a Ration Card in West Bengal (Form-7)"
      intro="For a deceased member, permanent migration, or voluntarily giving up the card — free on food.wb.gov.in."
      quickAnswer={
        <>
          Use <strong>Form-7</strong> on <strong>food.wb.gov.in</strong> (official, free) to surrender a West Bengal
          ration card: select the member(s), give the reason (death, migration, voluntary), attach the death
          certificate if applicable, verify with OTP and keep the acknowledgement number. If you only want to stop
          the subsidy but keep a valid card, convert to a non-subsidised card with Form-10 instead. For the family
          cards you keep, erationcards.in prints them on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/non-subsidised-ration-card-west-bengal", label: "Keep the card, drop the subsidy — Form-10 explained" },
        { href: "/guides/apply-new-ration-card-west-bengal", label: "Re-applying later (Form-3 / Form-4)" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check a card's current status" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: surrender a ration card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Surrender vs non-subsidised conversion</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Surrender (Form-7) closes the card entirely. If the goal is only to stop drawing subsidised grain — say the
          household's income has grown — the{" "}
          <Link href="/guides/non-subsidised-ration-card-west-bengal" className="text-primary hover:underline">
            non-subsidised card (Form-10)
          </Link>{" "}
          keeps a valid government card for identity and records with zero foodgrain entitlement. Many families
          prefer that middle path.
        </p>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Keep the acknowledgement.</strong> The acknowledgement number is your proof the card was properly
          surrendered — useful if a distribution record ever needs clarifying later.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Protect the cards your family keeps"
        body={`For the members who continue, print their e-Ration Cards on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
