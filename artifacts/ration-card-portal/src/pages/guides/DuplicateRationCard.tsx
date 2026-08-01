import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/duplicate-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "First, just download the e-Ration Card again — it's usually all you need",
    text: "West Bengal ration cards are digital. If your card is lost or damaged, the fastest fix is downloading a fresh e-Ration Card PDF free from food.wb.gov.in — the download works any number of times. See our download guide.",
  },
  {
    name: "Use Form-9 when you need a formal duplicate",
    text: "If your situation needs the card formally re-issued (a legacy physical card, or an office insists on a duplicate issuance record), the official route is Form-9 — free on food.wb.gov.in under E-Citizen, or on paper at your food office.",
  },
  {
    name: "Enter the card details and reason",
    text: "Enter the ration card number (recover it first if unknown — see step 5), select the member, and give the reason: lost, damaged, mutilated or defaced.",
  },
  {
    name: "Verify with OTP and submit",
    text: "Confirm with the OTP sent to your registered mobile, submit, and save the acknowledgement number to track the request.",
  },
  {
    name: "Don't know the card number? Recover it free",
    text: "Check any old photocopy or food-department SMS, or ask your ration dealer to look it up. Our lost ration card guide lists every free recovery route — you don't need an agent.",
  },
];

export default function DuplicateRationCard() {
  const PRICING = usePricing();

  useSeo({
    title: "Duplicate Ration Card in West Bengal (Form-9) — Lost or Damaged Card, Free",
    description: `Lost or damaged your West Bengal ration card? Download the e-Ration Card PDF again free, or request a formal duplicate with Form-9 on food.wb.gov.in. No police report needed for a routine loss. Reprint on waterproof PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "What's the fastest replacement for a lost ration card?",
      a: "Download the e-Ration Card PDF again from food.wb.gov.in — free and instant with your card number and category. The PDF is the card in West Bengal's digital system; a Form-9 duplicate is only needed in special cases.",
    },
    {
      q: "Is the duplicate card free?",
      a: "Yes. Both the e-Ration Card re-download and the Form-9 duplicate request are free government services in West Bengal. Pay nothing to anyone for a 'duplicate card' — the only optional cost is a durable PVC print of the card you already have.",
    },
    {
      q: "Do I need a police report (FIR/GD) for a lost card?",
      a: "For a routine lost-card duplicate, the online process does not ask for a police report — the OTP verification protects the request. If your card was stolen along with other documents, filing a general diary is still sensible for your own records.",
    },
    {
      q: "My PVC printed card was lost. Same process?",
      a: "Even simpler — your government card was never lost, only the printed copy. Just order a fresh PVC print with the same PDF (or a newly downloaded one). The government record is untouched.",
    },
    {
      q: "I don't remember my ration card number at all.",
      a: "Your ration dealer can look it up, old documents or SMSes usually have it, and the portal offers search options that change from time to time. Our lost ration card guide walks through every free route.",
    },
    {
      q: "হারানো রেশন কার্ডের ডুপ্লিকেট কীভাবে পাব?",
      a: `সবচেয়ে দ্রুত উপায়: food.wb.gov.in থেকে আবার e-Ration Card PDF ডাউনলোড করুন — বিনামূল্যে, যতবার খুশি। আনুষ্ঠানিক ডুপ্লিকেট দরকার হলে Form-9 দিন, সেটিও ফ্রি। PDF পেলে erationcards.in থেকে ওয়াটারপ্রুফ PVC প্রিন্ট করান — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-duplicate",
    canonical: CANONICAL,
    breadcrumbName: "Duplicate Ration Card Guide",
    howTo: {
      name: "How to get a duplicate ration card in West Bengal (Form-9 / e-RC re-download, free)",
      description:
        "Replace a lost or damaged West Bengal ration card free — re-download the e-Ration Card PDF from food.wb.gov.in, or request a formal duplicate with Form-9.",
      totalTime: "PT10M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Get a Duplicate Ration Card in West Bengal (Form-9)"
      intro="Lost, damaged or defaced card? The digital re-download is instant and free — Form-9 covers the formal duplicate cases."
      quickAnswer={
        <>
          In West Bengal you rarely need a formal duplicate: download a fresh{" "}
          <strong>e-Ration Card PDF free from food.wb.gov.in</strong> using your card number and category — that PDF
          is your card. For cases that need formal re-issuance, submit <strong>Form-9</strong> (free) under
          E-Citizen with the reason (lost/damaged) and OTP verification. No police report is asked for a routine
          loss. With the PDF in hand, erationcards.in prints it on waterproof PVC for ₹
          {PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or more), delivered to your
          door.
        </>
      }
      related={[
        { href: "/guides/lost-ration-card-west-bengal", label: "Lost card or number? Every free recovery route" },
        { href: "/guides/download-e-ration-card", label: "Download the e-Ration Card PDF (5 steps)" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check the card is still active before printing" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: replace a lost or damaged card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Why the PDF beats a paper duplicate</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>Instant — no waiting for an office to process a request</li>
          <li>Free forever — re-download as many times as you need</li>
          <li>Accepted everywhere the ration card is needed, because it IS the card</li>
          <li>
            And if you want something that survives your wallet, monsoon and washing machine — that's exactly what a{" "}
            <Link href="/order" className="text-primary hover:underline">
              PVC print
            </Link>{" "}
            is for.
          </li>
        </ul>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Stop losing paper cards"
        body={`Print your e-Ration Card once on bank-card grade waterproof PVC and be done with it — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
