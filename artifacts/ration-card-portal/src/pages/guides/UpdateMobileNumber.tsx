import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/update-mobile-number-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: 'Open "Update Mobile Number" in the Instant With Aadhaar services',
    text: 'On the official food.wb.gov.in portal, find the "Instant With Aadhaar" service group and choose "Update Mobile Number". Menu names change occasionally — anything about updating the mobile number on your ration card is the right place.',
  },
  {
    name: "Enter your ration card category and card number",
    text: "Select the card category (PHH, SPHH, AAY, RKSY-I or RKSY-II) and type the card number exactly as it appears on the card or the e-Ration Card PDF.",
  },
  {
    name: "Verify with the OTP sent to your Aadhaar-linked mobile",
    text: "This is why a lost old SIM doesn't block you — the one-time password goes to the mobile number registered with your Aadhaar, not to the old number on the ration card.",
  },
  {
    name: "Enter the new mobile number and submit",
    text: "Type the new number carefully and confirm. Once saved, future OTPs for ration card services — corrections, eKYC, shop change — come to this number.",
  },
  {
    name: "No working mobile on Aadhaar either? Fix Aadhaar first",
    text: "If your Aadhaar has no usable mobile, update it at any Aadhaar Seva Kendra, then return and finish this service. Your ration dealer or the local food & supplies office can also help get the card's mobile updated.",
  },
  {
    name: "Confirm the change worked",
    text: 'Run the free card status check ("Check the status of your Ration Card") — and the next OTP-based service you use should send its code to the new number.',
  },
];

export default function UpdateMobileNumber() {
  const PRICING = usePricing();

  useSeo({
    title: "Update Mobile Number on Ration Card West Bengal — Instant With Aadhaar OTP (Free)",
    description: `Change the mobile number linked to your West Bengal ration card free on food.wb.gov.in: the "Instant With Aadhaar" service verifies you by Aadhaar OTP, so a lost old SIM is no problem. Steps, fixes when no OTP arrives, and FAQs — then print the card on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is updating the ration card mobile number free?",
      a: "Yes — it is a free government service on food.wb.gov.in, and it works instantly with an Aadhaar OTP. Nobody may charge you for it.",
    },
    {
      q: "I lost the SIM that was linked to my ration card. Can I still update?",
      a: "Yes — that is exactly what this service is for. Verification happens through the OTP sent to your Aadhaar-linked mobile, not the old number on the card, so the lost SIM never has to receive anything.",
    },
    {
      q: "Why does the mobile number on the card matter so much?",
      a: "Almost every online ration card service — Form-5 corrections, eKYC, shop change, split and transfer requests — confirms you by OTP to the card's registered mobile. An old or dead number quietly blocks all of them.",
    },
    {
      q: "The Aadhaar OTP never arrives. What now?",
      a: "The OTP goes to the mobile registered with your Aadhaar. If that number is also old or lost, update the mobile on Aadhaar first at any Aadhaar Seva Kendra, then come back. Your ration dealer or the local food & supplies office can also help.",
    },
    {
      q: "Can one mobile number serve the whole family's card?",
      a: "Yes — the ration card carries one contact number for the family, so a working number that any family member keeps is fine. Each member's Aadhaar eKYC is still individual.",
    },
    {
      q: "My number is linked to someone else's ration card. Is that a problem?",
      a: "It can be — you may receive OTPs meant for a stranger's card, and linking your own card can get confusing. The portal's free Delink Mobile Number service removes your number from unknown cards; our delink guide covers it step by step.",
    },
    {
      q: "রেশন কার্ডের মোবাইল নম্বর কীভাবে আপডেট করব?",
      a: `food.wb.gov.in-এ "Instant With Aadhaar" পরিষেবার "Update Mobile Number" অপশনে কার্ডের ক্যাটাগরি ও নম্বর দিন — আধারের মোবাইলে OTP আসবে, দিলেই নতুন নম্বর সেভ হয়ে যাবে। পুরনো SIM হারিয়ে গেলেও সমস্যা নেই, সম্পূর্ণ ফ্রি। কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-update-mobile",
    canonical: CANONICAL,
    breadcrumbName: "Update Mobile Number Guide",
    howTo: {
      name: "How to update the mobile number on a West Bengal ration card (Instant With Aadhaar, free)",
      description:
        "Change the mobile number linked to a WB ration card free on food.wb.gov.in — verified by Aadhaar OTP, so the old SIM is not needed.",
      totalTime: "PT5M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Update the Mobile Number on Your Ration Card in West Bengal"
      intro="Lost the old SIM? The Instant With Aadhaar service changes your card's mobile number in minutes — free, verified by Aadhaar OTP."
      quickAnswer={
        <>
          On <strong>food.wb.gov.in</strong> (official, free), open <strong>"Update Mobile Number"</strong> under the
          Instant With Aadhaar services, enter your ration card category and number, confirm the OTP sent to your{" "}
          <strong>Aadhaar-linked mobile</strong>, and type the new number — it takes effect immediately. The old SIM
          is never needed, which is the whole point. Once your number works again, every OTP-based service
          (corrections, eKYC, shop change) is back within reach. Card sorted? erationcards.in prints it on
          waterproof PVC for ₹{PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or
          more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/delink-mobile-number-ration-card-west-bengal", label: "Your number stuck on an unknown card? Delink it first" },
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "Complete Aadhaar eKYC — the 2-minute OTP linking" },
        { href: "/guides/ration-card-correction-west-bengal", label: "Fix name, DOB or address with a free Form-5 correction" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: update the mobile number" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Why this service exists</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>SIMs change, cards don't.</strong> People lose numbers or switch operators — the card's contact
            number goes stale, and suddenly no OTP-based service works.
          </li>
          <li>
            <strong>Aadhaar breaks the deadlock.</strong> Because verification runs through the Aadhaar-linked
            mobile, you never need the old number to prove it's your card.
          </li>
          <li>
            <strong>It unblocks everything else.</strong> Corrections, eKYC, shop change and family updates all
            confirm you by OTP — a working number is the key to the whole toolbox.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Do this before anything else.</strong> If you're planning a{" "}
          <Link href="/guides/ration-card-correction-west-bengal" className="text-primary hover:underline">
            correction
          </Link>{" "}
          or{" "}
          <Link href="/guides/link-aadhaar-ration-card-west-bengal" className="text-primary hover:underline">
            eKYC
          </Link>
          , update the mobile number first — every later step sends its OTP to this number.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Number updated? Make the card itself as durable"
        body={`Print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West Bengal districts included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
