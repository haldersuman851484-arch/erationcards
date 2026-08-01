import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/link-aadhaar-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Check whether eKYC is already done",
    text: 'On food.wb.gov.in, use the card status check ("Check the status of your Ration Card") — the result shows whether each member\'s Aadhaar is linked. Only members showing not-linked need to act.',
  },
  {
    name: "Open the Aadhaar linking option",
    text: 'In the "E-Citizen" section, look for "Link Aadhaar with Ration Card" (sometimes shown as eKYC). Menu names change occasionally — anything about linking Aadhaar and mobile with your ration card is the right place.',
  },
  {
    name: "Enter the ration card number and Aadhaar number",
    text: "Do this per member — each family member's card is linked individually with their own Aadhaar.",
  },
  {
    name: "Verify with the OTP sent to the Aadhaar-linked mobile",
    text: "The one-time password goes to the mobile number registered with that Aadhaar. Entering it completes the eKYC and also records the mobile number against the ration card.",
  },
  {
    name: "No OTP possible? Use the ration shop's fingerprint machine",
    text: "If the Aadhaar has no linked mobile (or the number is lost), visit your ration dealer — the e-PoS machine links Aadhaar with a fingerprint scan, free. Updating the mobile on Aadhaar at an Aadhaar centre also restores the OTP route.",
  },
  {
    name: "Re-check the status after a few days",
    text: "Run the card status check again — the member should show Aadhaar-linked, and a card deactivated for pending eKYC returns to Active after verification.",
  },
];

export default function LinkAadhaarEkyc() {
  const PRICING = usePricing();

  useSeo({
    title: "Link Aadhaar & Mobile with Ration Card West Bengal — eKYC Online by OTP (Free)",
    description: `Complete ration card eKYC in West Bengal free: link Aadhaar and mobile on food.wb.gov.in with an OTP, or by fingerprint at your ration shop. Every member needs it — pending eKYC gets cards deactivated. Then print on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is ration card eKYC free?",
      a: "Yes — linking Aadhaar and mobile with your ration card is completely free, both online at food.wb.gov.in and at the ration shop's e-PoS machine. Nobody may charge for it.",
    },
    {
      q: "Why is eKYC required at all?",
      a: "Aadhaar linking confirms each member is a real, unique person — it removes duplicate/ghost cards and enables benefits like drawing ration from any shop (ONORC portability). Cards left unlinked eventually get deactivated.",
    },
    {
      q: "Does every family member need their own eKYC?",
      a: "Yes. Each member's card is linked with their own Aadhaar individually — doing it for the head of family alone is not enough.",
    },
    {
      q: "Is there a deadline?",
      a: "The government announces eKYC deadlines periodically and has extended them several times. Don't gamble on extensions — the OTP linking takes two minutes, and a card deactivated for pending eKYC means missed ration until it's fixed.",
    },
    {
      q: "The OTP never arrives. What's wrong?",
      a: "The OTP goes to the mobile number registered with that person's Aadhaar — not any number you type. If that number is old or lost, either update the mobile at an Aadhaar Seva Kendra first, or skip OTP entirely and link by fingerprint at your ration dealer's e-PoS machine.",
    },
    {
      q: "My card is already deactivated because eKYC was pending.",
      a: "Complete the linking now — the portal has a dedicated flow for deactivated cards, and the card returns to Active after verification. Our reactivation guide covers it step by step.",
    },
    {
      q: "রেশন কার্ডের সাথে আধার লিঙ্ক করব কীভাবে?",
      a: `food.wb.gov.in-এ "Link Aadhaar with Ration Card" অপশনে কার্ড নম্বর ও আধার নম্বর দিন — আধারের মোবাইলে OTP আসবে, দিলেই eKYC শেষ। মোবাইল না থাকলে রেশন দোকানের মেশিনে আঙুলের ছাপ দিয়ে ফ্রি-তে হয়। প্রতিটি সদস্যের আলাদা eKYC লাগে। কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-ekyc",
    canonical: CANONICAL,
    breadcrumbName: "Aadhaar eKYC Guide",
    howTo: {
      name: "How to link Aadhaar & mobile with a West Bengal ration card (eKYC, free)",
      description:
        "Complete ration card eKYC free in West Bengal — link Aadhaar by OTP on food.wb.gov.in or by fingerprint at the ration shop's e-PoS machine.",
      totalTime: "PT5M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Link Aadhaar & Mobile with Your Ration Card in West Bengal (eKYC)"
      intro="The 2-minute OTP linking on food.wb.gov.in that keeps your card active — free, per member, no agent needed."
      quickAnswer={
        <>
          On <strong>food.wb.gov.in</strong> (official, free), open{" "}
          <strong>"Link Aadhaar with Ration Card"</strong> in the E-Citizen section, enter the ration card number
          and Aadhaar number, and confirm with the OTP sent to the Aadhaar-linked mobile — that completes eKYC and
          records your mobile against the card. No OTP possible? The ration shop's e-PoS machine links by
          fingerprint, free. Every member needs their own eKYC; unlinked cards eventually get deactivated. Card
          linked and active? erationcards.in prints it on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/reactivate-ration-card-west-bengal", label: "Card already deactivated? Reactivate it with eKYC" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check each member's eKYC status" },
        { href: "/guides/ration-card-correction-west-bengal", label: "Name mismatch with Aadhaar? Fix it with Form-5" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: complete your eKYC" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">What eKYC unlocks</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Keeps the card active</strong> — pending eKYC is the number-one reason WB cards get deactivated.
          </li>
          <li>
            <strong>Any-shop portability (ONORC)</strong> — draw your entitlement at other fair-price shops by
            fingerprint, useful for work migration.
          </li>
          <li>
            <strong>Smooth corrections and transfers</strong> — OTP-based services like Form-5 corrections work best
            when Aadhaar and mobile are already linked.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Name mismatch warning.</strong> If the name on the card and on Aadhaar differ (spelling, surname),
          the linking can fail — fix the card first with a free{" "}
          <Link href="/guides/ration-card-correction-west-bengal" className="text-primary hover:underline">
            Form-5 correction
          </Link>
          , then complete eKYC.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="eKYC done? Carry the card that always works"
        body={`Print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West Bengal districts included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
