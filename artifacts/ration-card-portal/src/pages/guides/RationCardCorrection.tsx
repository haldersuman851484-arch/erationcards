import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/ration-card-correction-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Open the official portal — food.wb.gov.in",
    text: "Go to food.wb.gov.in, the official website of the West Bengal Department of Food & Supplies (Khadya Sathi). Corrections are a free government service — you never need an agent or a paid website for this.",
  },
  {
    name: "Find the correction option (Form-5)",
    text: 'In the "E-Citizen" section, look for the option to correct or modify ration card details — officially Form-5, often shown as "Rectify or Instant Correction of Your Ration Card". Menu names change from time to time; anything mentioning correction or modification of an existing card is the right place.',
  },
  {
    name: "Verify yourself with a mobile OTP",
    text: "Enter your ration card number and confirm with the one-time password (OTP) sent to your registered or Aadhaar-linked mobile number. If no mobile is linked yet, link Aadhaar and mobile first — see our eKYC guide.",
  },
  {
    name: "Edit the field that is wrong",
    text: "Correct the name spelling, date of birth, guardian/father's name or address. Type the details exactly as they appear on your Aadhaar card — matching Aadhaar avoids rejection during verification.",
  },
  {
    name: "Upload the supporting document",
    text: "Aadhaar is accepted for most corrections. For an address change, add an address proof (electricity bill, bank passbook, rent agreement); for a date-of-birth fix, a birth certificate or school certificate helps.",
  },
  {
    name: "Submit and save the application number",
    text: 'Submit the form and note the acknowledgement / application number. You can track progress on the portal under the "know the status of your application" option.',
  },
  {
    name: "After approval, download the corrected e-Ration Card",
    text: "Once the correction is verified and approved, download a fresh e-Ration Card PDF from the portal — the old PDF keeps the old details, so always download a new copy.",
  },
];

export default function RationCardCorrection() {
  const PRICING = usePricing();

  useSeo({
    title: "Ration Card Correction West Bengal — Fix Name, DOB or Address Online (Form-5, Free)",
    description: `Correct your West Bengal ration card online free at food.wb.gov.in with Form-5 (instant correction): name spelling, date of birth, address or guardian name. OTP verification, no agent needed. Then print the corrected card on PVC from ₹${PRICING.ration.multi.public}.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is ration card correction free in West Bengal?",
      a: "Yes. Corrections through Form-5 on food.wb.gov.in (or at your local food & supplies office) are completely free. If anyone demands money just to correct your card details, walk away — it is a free government service.",
    },
    {
      q: "How long does a correction take?",
      a: "Simple OTP-verified corrections often reflect within days; changes that need inspector verification (like an address change) can take a few weeks. Track your application number on the portal to see the current stage.",
    },
    {
      q: "Can erationcards.in correct the details on my card?",
      a: "No. We are a private printing service — we print your card exactly as the government issued it. Correct the details on food.wb.gov.in first, download the fresh e-Ration Card PDF, and then order the PVC print so the plastic card shows the right details.",
    },
    {
      q: "Which document do I need for a name correction?",
      a: "Aadhaar is usually enough — the corrected spelling should match your Aadhaar exactly. For a date-of-birth correction, keep a birth certificate or school certificate ready; for an address change, any standard address proof works.",
    },
    {
      q: "Will my ration card number change after correction?",
      a: "No. Your card number and category stay the same — only the corrected detail (name, date of birth, address or guardian name) is updated in the government record.",
    },
    {
      q: "I moved house. Is that a correction too?",
      a: "Update the address with Form-5, and if you also want to collect ration from a shop near the new home, change your fair-price shop with Form-6 — see our ration shop change guide for those steps.",
    },
    {
      q: "রেশন কার্ড সংশোধন করতে কি টাকা লাগে?",
      a: `না, একদম বিনামূল্যে। food.wb.gov.in-এ Form-5 দিয়ে নাম, জন্মতারিখ বা ঠিকানা সংশোধন করুন — OTP দিয়ে যাচাই হয়, কোনো এজেন্ট লাগে না। সংশোধনের পর নতুন PDF ডাউনলোড করে erationcards.in থেকে ওয়াটারপ্রুফ PVC কার্ড প্রিন্ট করাতে পারেন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-correction",
    canonical: CANONICAL,
    breadcrumbName: "Ration Card Correction Guide",
    howTo: {
      name: "How to correct West Bengal ration card details online (Form-5, free)",
      description:
        "Fix a wrong name, date of birth, address or guardian name on a West Bengal ration card free at food.wb.gov.in using Form-5 with OTP verification.",
      totalTime: "PT15M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Correct Your Ration Card Details Online in West Bengal (Form-5)"
      intro="Fix a wrong name, date of birth, address or guardian name free on food.wb.gov.in — the 'instant correction' service, no agent needed."
      quickAnswer={
        <>
          Use <strong>Form-5</strong> on <strong>food.wb.gov.in</strong> (official, free) to correct the name
          spelling, date of birth, address or guardian name on a West Bengal ration card. Verify with the OTP sent
          to your registered mobile, upload Aadhaar or another proof, and track the application number until the
          change is approved. Then download the corrected e-Ration Card PDF — erationcards.in can print it on a
          waterproof PVC card for ₹{PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or
          more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "Link Aadhaar & mobile with your ration card (eKYC)" },
        { href: "/guides/change-ration-shop-west-bengal", label: "Change your ration shop (Form-6) after moving" },
        { href: "/guides/download-e-ration-card", label: "Download your corrected e-Ration Card PDF" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: correct your ration card online" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">What Form-5 can fix — and what it can't</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Form-5 corrects:</strong> name spelling, date of birth, guardian/father's name, address within
            West Bengal, and your linked mobile number.
          </li>
          <li>
            <strong>Adding a family member</strong> (newborn, new spouse) is not a correction — use Form-4. See the{" "}
            <Link href="/guides/apply-new-ration-card-west-bengal" className="text-primary hover:underline">
              new ration card guide
            </Link>
            .
          </li>
          <li>
            <strong>Changing your ration shop</strong> is Form-6 — see the{" "}
            <Link href="/guides/change-ration-shop-west-bengal" className="text-primary hover:underline">
              shop change guide
            </Link>
            .
          </li>
          <li>
            <strong>Changing your card category</strong> (for example RKSY-II to PHH) is Form-8 — see the{" "}
            <Link href="/guides/ration-card-category-change-west-bengal" className="text-primary hover:underline">
              category change guide
            </Link>
            .
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Match Aadhaar exactly.</strong> Most corrections are approved fastest when the new spelling and
          date of birth are identical to your Aadhaar card, because the food department verifies against Aadhaar
          records.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Prefer to do it offline?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          The same Form-5 is accepted on paper at your ration dealer, food inspector's office, or the local Block
          Development Office (BDO) / Sub-Divisional Office in towns. Carry photocopies of your ration card and
          Aadhaar, and collect an acknowledgement slip so you can follow up.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Details corrected? Put them on a card that lasts"
        body={`After approval, download the fresh e-Ration Card PDF and we'll print it on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
