import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/change-ration-shop-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Update your address first if you've moved",
    text: "If the shop change is because of a house move, correct the address on the card first with Form-5 (free) — the new shop is usually chosen near the recorded address. See our correction guide.",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. The fair-price shop (FPS) change is Form-6 — free online, or on paper at your food inspector or BDO office.',
  },
  {
    name: "Choose the Form-6 shop change option",
    text: 'Look for "Change of fair price shop" or Form-6. Menu names change occasionally — anything about transferring your card to another ration shop / FPS is the right place.',
  },
  {
    name: "Enter your card number and pick the new shop",
    text: "Enter the ration card number(s), verify with the OTP sent to your registered mobile, and select the new fair-price shop — the portal lets you search dealers by area so you can pick one near home.",
  },
  {
    name: "Give the reason and submit",
    text: "State the reason (moved house, shop too far, service issues), submit, and save the application number to track progress.",
  },
  {
    name: "Start drawing from the new shop after approval",
    text: "Once approved, your card is tagged to the new dealer — usually effective from the next distribution cycle. Check the tagged shop anytime with the card status check.",
  },
];

export default function ChangeRationShop() {
  const PRICING = usePricing();

  useSeo({
    title: "How to Change Your Ration Shop (FPS) in West Bengal — Form-6 Online, Free",
    description: `Transfer your West Bengal ration card to a nearer fair-price shop free with Form-6 on food.wb.gov.in — OTP steps, reasons, and the ONORC any-shop option explained. Print your card on waterproof PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is changing my ration shop free?",
      a: "Yes. Form-6 on food.wb.gov.in and at government offices is free of charge. No agent is needed — the online form takes a few minutes with an OTP.",
    },
    {
      q: "Can I buy from any ration shop without changing my tagged shop?",
      a: "Often yes. Under One Nation One Ration Card (ONORC) portability, a card with Aadhaar eKYC done can draw ration from other fair-price shops using fingerprint authentication. Form-6 is for permanently changing your home shop; portability helps for occasional or temporary needs.",
    },
    {
      q: "How long does the shop change take?",
      a: "Approval typically takes days to a few weeks. The change usually applies from the next distribution cycle after approval — check your tagged shop with the card status check on the portal.",
    },
    {
      q: "Can the whole family move shops in one application?",
      a: "Yes — Form-6 lets you include the family's cards together so everyone ends up tagged to the same new shop.",
    },
    {
      q: "I moved to a different district. Same process?",
      a: "Yes, but update the address with Form-5 first so the food office of the new area handles your card correctly, then file Form-6 for a shop near the new home. Both steps are free.",
    },
    {
      q: "Does the shop change alter my card number or category?",
      a: "No. Only the tagged fair-price shop changes — your card number, category and entitlements stay exactly the same, so an already-printed PVC card remains valid.",
    },
    {
      q: "রেশন দোকান পরিবর্তন করতে কী করতে হবে?",
      a: `food.wb.gov.in-এ Form-6 দিয়ে বিনামূল্যে কাছের রেশন দোকানে কার্ড ট্রান্সফার করুন — OTP দিয়ে যাচাই হয়। কার্ড নম্বর বা ক্যাটাগরি বদলায় না। আপনার কার্ডের ওয়াটারপ্রুফ PVC প্রিন্ট চাইলে erationcards.in-এ অর্ডার করুন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
    },
  ];

  useGuideSchema({
    idPrefix: "guide-shop-change",
    canonical: CANONICAL,
    breadcrumbName: "Change Ration Shop Guide",
    howTo: {
      name: "How to change your fair-price shop in West Bengal (Form-6, free)",
      description:
        "Transfer a West Bengal ration card to a different fair-price shop free using Form-6 on food.wb.gov.in, with OTP verification.",
      totalTime: "PT10M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Change Your Ration Shop (Fair-Price Shop) in West Bengal (Form-6)"
      intro="Moved house, or the shop is too far? Form-6 on food.wb.gov.in transfers your card to a nearer dealer — free."
      quickAnswer={
        <>
          Use <strong>Form-6</strong> on <strong>food.wb.gov.in</strong> (official, free) to move your ration card to
          a different fair-price shop: enter the card number, verify with OTP, pick the new shop by area, give the
          reason and submit. The change applies after approval, usually from the next distribution cycle. For
          occasional needs, ONORC portability already lets an eKYC-done card draw from other shops. Want your card as
          a durable plastic copy? erationcards.in prints it on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/ration-card-correction-west-bengal", label: "Fix the address on your card first (Form-5)" },
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "eKYC — needed for any-shop ONORC portability" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check which shop your card is tagged to" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: change your fair-price shop" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Form-6 change vs ONORC portability</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Form-6 (permanent):</strong> your card gets re-tagged to a new home shop — best after moving
            house or for lasting convenience.
          </li>
          <li>
            <strong>ONORC portability (as-needed):</strong> with Aadhaar eKYC completed, you can draw your
            entitlement at other fair-price shops via fingerprint — handy for migrant workers and temporary stays,
            no form required. eKYC pending? Do it first with our{" "}
            <Link href="/guides/link-aadhaar-ration-card-west-bengal" className="text-primary hover:underline">
              Aadhaar linking guide
            </Link>
            .
          </li>
        </ul>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Shop sorted? Carry a card that survives the queue"
        body={`Paper and PDFs fade, tear and get lost. We print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
