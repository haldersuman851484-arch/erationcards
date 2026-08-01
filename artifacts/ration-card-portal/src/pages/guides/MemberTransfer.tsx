import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/ration-card-member-transfer-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Check Form-14 is the right form",
    text: "Form-14 shifts a person who already holds a WB ration card into another existing family — the classic case is a bride joining her in-laws' card after marriage. If the person never had a card, that's a Form-4 addition instead.",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. Look for "Shifting of individual to another existing family" or Form-14 — free online, or on paper at your food office.',
  },
  {
    name: "Enter both card references",
    text: "Fill in the moving member's own ration card number and the destination family's card number (usually the head of family's), so the department knows exactly who moves where.",
  },
  {
    name: "Give the reason and proof",
    text: "Select the reason — marriage is the most common — and upload the supporting document: marriage certificate or an equivalent declaration, plus the member's Aadhaar.",
  },
  {
    name: "Verify with OTP and submit",
    text: "Confirm with the OTP sent to the registered mobile, submit, and save the application number for tracking.",
  },
  {
    name: "After approval, download the updated e-Ration Card",
    text: "The member's card now shows the new family and its fair-price shop. Download a fresh PDF — the old one still shows the previous family's details.",
  },
];

export default function MemberTransfer() {
  const PRICING = usePricing();

  useSeo({
    title: "Transfer a Ration Card Member to Another Family in West Bengal (Form-14) — After Marriage & More",
    description: `Shift a West Bengal ration card holder into another existing family free with Form-14 on food.wb.gov.in — the standard step after marriage. Both card numbers, documents and OTP steps explained. Print the updated card on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "My wife just moved in after our wedding. Which form?",
      a: "If she already has a ration card in her parents' family, use Form-14 to shift her card into your family. If she never had a card at all, apply with Form-4 instead. Both are free on food.wb.gov.in.",
    },
    {
      q: "Is the member transfer free?",
      a: "Yes — Form-14 costs nothing online or at the food office, like all WB ration card services. No agent required.",
    },
    {
      q: "Does the transferred member keep their card number?",
      a: "The member keeps their identity in the system — the family grouping, address and tagged fair-price shop update to the new family. Download a fresh e-Ration Card PDF after approval to see the updated details.",
    },
    {
      q: "Does her ration move to our shop automatically?",
      a: "Yes — once the transfer is approved the member draws from the destination family's tagged shop. If the whole family later wants a different shop, that's a separate free Form-6.",
    },
    {
      q: "What documents are needed?",
      a: "The member's Aadhaar, both ration card numbers, and proof of the relationship change — a marriage certificate is standard for marriage cases. Adoption or guardianship documents cover other cases.",
    },
    {
      q: "How long does the transfer take?",
      a: "Usually days to a few weeks depending on verification. Track the application number on the portal; the updated card PDF is downloadable once approved.",
    },
    {
      q: "বিয়ের পর স্ত্রীর রেশন কার্ড শ্বশুরবাড়ির কার্ডে আনব কীভাবে?",
      a: `food.wb.gov.in-এ Form-14 দিয়ে বিনামূল্যে — স্ত্রীর কার্ড নম্বর ও আপনাদের পরিবারের কার্ড নম্বর দিন, বিয়ের প্রমাণ আপলোড করে OTP দিয়ে জমা দিন। অনুমোদনের পর নতুন PDF ডাউনলোড করুন। আপডেট হওয়া কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-transfer",
    canonical: CANONICAL,
    breadcrumbName: "Member Transfer Guide",
    howTo: {
      name: "How to shift a ration card member to another family in West Bengal (Form-14, free)",
      description:
        "Transfer a West Bengal ration card holder into another existing family free using Form-14 on food.wb.gov.in — standard after marriage.",
      totalTime: "PT10M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Shift a Member to Another Family's Ration Card in West Bengal (Form-14)"
      intro="The standard step after marriage: move an existing card holder into another family — free on food.wb.gov.in."
      quickAnswer={
        <>
          Use <strong>Form-14</strong> on <strong>food.wb.gov.in</strong> (official, free) to shift someone who
          already holds a West Bengal ration card into another existing family — most commonly a bride joining her
          in-laws. Enter the member's card number and the destination family's card number, upload the marriage
          certificate (or equivalent), verify with OTP and track the application. After approval, download the
          updated e-Ration Card PDF — erationcards.in prints it on waterproof PVC for ₹
          {PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or more), delivered to your
          door.
        </>
      }
      related={[
        { href: "/guides/apply-new-ration-card-west-bengal", label: "Never had a card? Form-4 addition instead" },
        { href: "/guides/split-ration-card-family-west-bengal", label: "Whole group separating? Form-13 split" },
        { href: "/guides/ration-card-correction-west-bengal", label: "Surname change after marriage — Form-5 correction" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: transfer the member" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Marriage checklist — the three common updates</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Form-14</strong> — shift her card into the new family (this guide).
          </li>
          <li>
            <strong>Form-5</strong> — if the surname or address on the card should change too, do a free{" "}
            <Link href="/guides/ration-card-correction-west-bengal" className="text-primary hover:underline">
              correction
            </Link>{" "}
            after the transfer, keeping everything matched with Aadhaar.
          </li>
          <li>
            <strong>Aadhaar eKYC</strong> — make sure her{" "}
            <Link href="/guides/link-aadhaar-ration-card-west-bengal" className="text-primary hover:underline">
              Aadhaar and current mobile are linked
            </Link>{" "}
            so OTP services keep working from the new home.
          </li>
        </ul>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Transfer approved? Print the updated family set"
        body={`Download the fresh e-Ration Card PDFs and we'll print the whole family's cards on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
