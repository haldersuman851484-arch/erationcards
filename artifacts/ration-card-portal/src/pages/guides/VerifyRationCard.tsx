import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/verify-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Open the official portal — food.wb.gov.in",
    text: "Go to food.wb.gov.in, the official West Bengal Food & Supplies (Khadya Sathi) website. Checking a card is free and takes about two minutes on any phone.",
  },
  {
    name: "Find the card status check option",
    text: 'In the "E-Citizen" section, look for the option to check or verify your ration card — usually named "Check the status of your Ration Card". Menu names change occasionally; anything about checking card status is the right place.',
  },
  {
    name: "Enter your card number and category",
    text: "Type the ration card number, select the category printed on the card (AAY, PHH, SPHH, RKSY-I or RKSY-II) and complete the captcha.",
  },
  {
    name: "Read the result",
    text: "The portal shows whether the card is Active or Deactivated, the holder's name, the category, whether Aadhaar is linked (eKYC done), and the fair-price shop the card is tagged to.",
  },
  {
    name: "If it shows Deactivated, fix it with eKYC",
    text: "A deactivated card is almost always waiting for Aadhaar eKYC. Follow our reactivation guide — the OTP-based linking usually brings the card back to Active after verification.",
  },
];

export default function VerifyRationCard() {
  const PRICING = usePricing();

  useSeo({
    title: "How to Check if Your Ration Card Is Active in West Bengal (Verify Online, Free)",
    description: `Verify any West Bengal ration card free at food.wb.gov.in in 2 minutes: see Active/Deactivated status, category, Aadhaar-link (eKYC) status and tagged ration shop. If it's active, print it on waterproof PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is checking my ration card status free?",
      a: "Yes, completely free on food.wb.gov.in — no login is needed, just the card number and category. Never pay anyone simply to check a card for you.",
    },
    {
      q: "Why does my ration card show Deactivated?",
      a: "The most common reason is pending Aadhaar eKYC — the government deactivates cards that haven't been linked with Aadhaar. It can also happen for suspected duplicate cards or long non-use. Completing eKYC reactivates a genuine card; see our reactivation guide.",
    },
    {
      q: "Can I check cards for my whole family?",
      a: "Yes. In West Bengal every member has an individual card with its own number, so repeat the same check for each member's card number.",
    },
    {
      q: "The status page shows my name or details wrong. What now?",
      a: "Correct them free with Form-5 on the official portal — see our ration card correction guide. We can only print the card after the government record itself is fixed.",
    },
    {
      q: "My card is Active but the dealer says it isn't working.",
      a: "Ask the dealer to try your Aadhaar fingerprint (e-PoS) once, and check the eKYC column in the status result. If it still fails, contact your local food inspector's office or the toll-free helpline listed on food.wb.gov.in.",
    },
    {
      q: "Does a PVC printed card prove my card is active?",
      a: "No. The PVC card is a durable printed copy of your government-issued card — your entitlements always come from the live government record. That's why it's smart to verify the status once before ordering a print.",
    },
    {
      q: "রেশন কার্ড চালু আছে কিনা কীভাবে দেখব?",
      a: `food.wb.gov.in-এ গিয়ে E-Citizen অংশে কার্ড নম্বর ও ক্যাটাগরি দিলেই দেখা যায় কার্ডটি Active না Deactivated — সম্পূর্ণ বিনামূল্যে। কার্ড চালু থাকলে erationcards.in থেকে ওয়াটারপ্রুফ PVC প্রিন্ট করাতে পারেন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-verify",
    canonical: CANONICAL,
    breadcrumbName: "Verify Ration Card Guide",
    howTo: {
      name: "How to verify a West Bengal ration card is active (free, online)",
      description:
        "Check any West Bengal ration card's status free on food.wb.gov.in — Active/Deactivated, category, Aadhaar eKYC status and tagged fair-price shop.",
      totalTime: "PT5M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Check if Your West Bengal Ration Card Is Active (Verify Online)"
      intro="A free 2-minute check on food.wb.gov.in shows Active/Deactivated status, category, eKYC status and your tagged ration shop."
      quickAnswer={
        <>
          Go to <strong>food.wb.gov.in</strong> (official, free), open the E-Citizen section, choose{" "}
          <strong>"Check the status of your Ration Card"</strong>, and enter the card number and category. The
          result shows Active/Deactivated, the holder's name, whether Aadhaar eKYC is done, and the tagged ration
          shop. A deactivated card can usually be fixed by completing Aadhaar eKYC. Once your card is active,
          erationcards.in can print it on a waterproof PVC card for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/reactivate-ration-card-west-bengal", label: "Card deactivated? Reactivate it with Aadhaar eKYC" },
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "Link Aadhaar & mobile with your ration card" },
        { href: "/guides/ration-card-types-west-bengal", label: "AAY, PHH, SPHH, RKSY-I & RKSY-II categories explained" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: verify your ration card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">How to read the status result</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Active</strong> — the card is valid. If it's a subsidised category, ration can be drawn from the
            tagged shop as usual.
          </li>
          <li>
            <strong>Deactivated</strong> — usually pending Aadhaar eKYC. Complete the OTP or fingerprint linking and
            the card returns to Active after verification — steps in our{" "}
            <Link href="/guides/reactivate-ration-card-west-bengal" className="text-primary hover:underline">
              reactivation guide
            </Link>
            .
          </li>
          <li>
            <strong>Aadhaar linked / eKYC</strong> — shows whether the member's Aadhaar is seeded. Every member needs
            their own eKYC.
          </li>
          <li>
            <strong>Category</strong> — AAY, PHH, SPHH, RKSY-I or RKSY-II decides your entitlements. Unsure what
            yours means? See the{" "}
            <Link href="/guides/ration-card-types-west-bengal" className="text-primary hover:underline">
              card types guide
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Don't know your card number?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Check any old paper card or SMS from the food department, or ask your ration dealer — they can look it up.
          Our{" "}
          <Link href="/guides/lost-ration-card-west-bengal" className="text-primary hover:underline">
            lost ration card guide
          </Link>{" "}
          covers every free way to recover the number.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Card verified and active? Make it permanent"
        body={`Print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West Bengal districts included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
