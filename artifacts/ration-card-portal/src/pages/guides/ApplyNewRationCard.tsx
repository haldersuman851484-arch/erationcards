import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/apply-new-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Pick the right form — Form-3 or Form-4",
    text: "Form-3 is for a family that has no ration card at all. Form-4 adds a new member — a newborn, or someone who never had a card — to an existing family card. (Someone who already has a card and is joining your family, like a bride, moves with Form-14 instead.)",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in, the official West Bengal Food & Supplies (Khadya Sathi) website, and open the "E-Citizen" section. Applying is free — online, or on paper at your ration dealer, food inspector or BDO office.',
  },
  {
    name: "Fill in the family and member details",
    text: "Enter names, dates of birth and Aadhaar numbers exactly as they appear on Aadhaar. For Form-4 you also enter the existing family card number the new member joins.",
  },
  {
    name: "Upload the documents",
    text: "Aadhaar for each applicant is the key document. For a newborn, upload the birth certificate (Aadhaar can follow later). Keep an address proof handy for new-family applications.",
  },
  {
    name: "Verify with OTP and submit",
    text: "Confirm the application with the OTP sent to your mobile number and submit. Save the acknowledgement / application number that appears.",
  },
  {
    name: "Track the application",
    text: 'Use the "know the status of your application" option on the portal with your application number. The food inspector may verify details before approval.',
  },
  {
    name: "After approval, download each member's e-Ration Card",
    text: "Every approved member gets their own digital ration card. Download one PDF per member from the portal — see our download guide for the exact steps.",
  },
];

export default function ApplyNewRationCard() {
  const PRICING = usePricing();

  useSeo({
    title: "How to Apply for a New Ration Card in West Bengal (Form-3 & Form-4) — Free, Online",
    description: `Apply for a new West Bengal ration card free at food.wb.gov.in: Form-3 for a family with no card, Form-4 to add a newborn or new member. Documents, OTP steps and tracking explained. Print approved cards on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is applying for a ration card free in West Bengal?",
      a: "Yes. Form-3 and Form-4 applications are free on food.wb.gov.in and at government offices. You never need to pay an agent — the process is designed to be done yourself.",
    },
    {
      q: "How long until the new card is issued?",
      a: "It varies — straightforward applications are often approved in a few weeks after the food inspector's verification. Track your application number on the portal to see the stage it's at.",
    },
    {
      q: "My baby doesn't have Aadhaar yet. Can I still apply?",
      a: "Yes. Use the birth certificate for a newborn's Form-4 application. Link the child's Aadhaar later once it's made — the portal and ration shops handle Aadhaar seeding as a separate free step.",
    },
    {
      q: "Which category will my new card get — PHH, RKSY-I or something else?",
      a: "The government decides based on eligibility rules: NFSA categories (AAY, PHH, SPHH) for priority households, and the state's RKSY-I / RKSY-II for others. You can't simply choose a subsidised category — see our card types guide for what each one means.",
    },
    {
      q: "My wife already has a card in her parents' family. Form-4?",
      a: "No — that's a member transfer. Use Form-14 to shift a person who already holds a card into another existing family (very common after marriage). Our member transfer guide covers it step by step.",
    },
    {
      q: "We don't want subsidised grain — just the card as ID proof.",
      a: "West Bengal offers a non-subsidised ration card for exactly that (Form-10). It works as identity/record proof without foodgrain entitlements — see our non-subsidised card guide.",
    },
    {
      q: "নতুন রেশন কার্ডের জন্য কীভাবে আবেদন করব?",
      a: `food.wb.gov.in-এ বিনামূল্যে আবেদন করুন — পরিবারের কোনো কার্ড না থাকলে Form-3, আর নবজাতক বা নতুন সদস্য যোগ করতে Form-4। Aadhaar আর OTP লাগে, এজেন্ট লাগে না। কার্ড অনুমোদন হলে PDF ডাউনলোড করে erationcards.in থেকে PVC প্রিন্ট করাতে পারেন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-apply-new",
    canonical: CANONICAL,
    breadcrumbName: "Apply for New Ration Card Guide",
    howTo: {
      name: "How to apply for a new ration card in West Bengal (Form-3 / Form-4, free)",
      description:
        "Apply free on food.wb.gov.in — Form-3 for a family with no ration card, Form-4 to add a newborn or new member to an existing family card.",
      totalTime: "PT20M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Apply for a New Ration Card in West Bengal (Form-3 & Form-4)"
      intro="Free application on food.wb.gov.in — Form-3 for a brand-new family card, Form-4 to add a newborn or new member."
      quickAnswer={
        <>
          Apply free on <strong>food.wb.gov.in</strong> (E-Citizen section): choose <strong>Form-3</strong> if your
          family has no ration card, or <strong>Form-4</strong> to add a newborn or first-time member to an existing
          family card. Fill details exactly as per Aadhaar, upload documents, verify with OTP and track the
          application number until approval. Each approved member then gets their own e-Ration Card PDF —
          erationcards.in can print each one on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/ration-card-member-transfer-west-bengal", label: "Moving an existing card holder into your family (Form-14)" },
        { href: "/guides/ration-card-types-west-bengal", label: "AAY, PHH, SPHH, RKSY-I & RKSY-II — which category means what" },
        { href: "/guides/download-e-ration-card", label: "Download the e-Ration Card PDF after approval" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: apply for a new ration card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Form-3 vs Form-4 vs Form-14 — pick correctly</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Form-3:</strong> whole family has no ration card — creates a new family record with cards for
            every member.
          </li>
          <li>
            <strong>Form-4:</strong> family already has cards; adds a member who has never held one (newborns are the
            classic case).
          </li>
          <li>
            <strong>Form-14:</strong> the person already has a card in another family and is joining yours (marriage,
            adoption) — that's a{" "}
            <Link href="/guides/ration-card-member-transfer-west-bengal" className="text-primary hover:underline">
              member transfer
            </Link>
            , not a new application.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Match Aadhaar from day one.</strong> Names and dates of birth that match Aadhaar sail through
          verification; mismatches are the most common reason applications stall and later need a Form-5 correction.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Documents checklist</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>Aadhaar card of every person being added (or birth certificate for a newborn)</li>
          <li>Existing family ration card number (for Form-4)</li>
          <li>Address proof for a new family application (electricity bill, bank passbook, rent agreement)</li>
          <li>A mobile number that can receive the OTP</li>
        </ul>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="New cards approved? Print them once, keep them for years"
        body={`Download each member's e-Ration Card PDF and we'll print them on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
