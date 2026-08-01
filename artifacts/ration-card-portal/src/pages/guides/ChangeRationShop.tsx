import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { Button } from "@/components/ui/button";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/change-ration-shop-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Update your address first if you've moved",
    text: "If the shop change is because of a house move, correct the address on the card first with Form-5 (free) — the new shop is usually chosen near the recorded address. See our correction guide.",
    bn: "দোকান বদলের কারণ যদি বাড়ি বদল হয়, তাহলে আগে ফর্ম-৫ দিয়ে কার্ডের ঠিকানা সংশোধন করুন (ফ্রি) — নতুন দোকান সাধারণত নথিভুক্ত ঠিকানার কাছেই বেছে নেওয়া হয়। আমাদের সংশোধন গাইড দেখুন।",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. The fair-price shop (FPS) change is Form-6 — free online, or on paper at your food inspector or BDO office.',
    bn: 'food.wb.gov.in (খাদ্য সাথী)-এ গিয়ে "E-Citizen" বিভাগটি খুলুন। ফেয়ার-প্রাইস শপ (FPS) বদল হল ফর্ম-৬ — অনলাইনে ফ্রি, অথবা কাগজে আপনার খাদ্য পরিদর্শক বা BDO অফিসে।',
  },
  {
    name: "Choose the Form-6 shop change option",
    text: 'Look for "Change of fair price shop" or Form-6. Menu names change occasionally — anything about transferring your card to another ration shop / FPS is the right place.',
    bn: '"Change of fair price shop" বা ফর্ম-৬ খুঁজুন। মেনুর নাম মাঝে মাঝে বদলায় — আপনার কার্ড অন্য রেশন দোকানে / FPS-এ ট্রান্সফার সংক্রান্ত যেকোনো অপশনই ঠিক জায়গা।',
  },
  {
    name: "Enter your card number and pick the new shop",
    text: "Enter the ration card number(s), verify with the OTP sent to your registered mobile, and select the new fair-price shop — the portal lets you search dealers by area so you can pick one near home.",
    bn: "রেশন কার্ড নম্বর(গুলি) লিখুন, নিবন্ধিত মোবাইলে পাঠানো OTP দিয়ে যাচাই করুন, এবং নতুন ফেয়ার-প্রাইস শপ বেছে নিন — পোর্টালে এলাকা অনুযায়ী ডিলার খোঁজা যায়, তাই বাড়ির কাছের একটি বেছে নিতে পারেন।",
  },
  {
    name: "Give the reason and submit",
    text: "State the reason (moved house, shop too far, service issues), submit, and save the application number to track progress.",
    bn: "কারণ লিখুন (বাড়ি বদল, দোকান অনেক দূরে, পরিষেবার সমস্যা), জমা দিন, এবং অগ্রগতি ট্র্যাক করতে অ্যাপ্লিকেশন নম্বরটি সেভ করে রাখুন।",
  },
  {
    name: "Start drawing from the new shop after approval",
    text: "Once approved, your card is tagged to the new dealer — usually effective from the next distribution cycle. Check the tagged shop anytime with the card status check.",
    bn: "অনুমোদন হয়ে গেলে আপনার কার্ড নতুন ডিলারের সঙ্গে যুক্ত হয় — সাধারণত পরবর্তী বিতরণ চক্র থেকে কার্যকর হয়। কার্ড স্ট্যাটাস চেক দিয়ে যেকোনো সময় যুক্ত দোকানটি দেখে নিতে পারেন।",
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
      bnQ: "রেশন দোকান বদল করা কি ফ্রি?",
      bnA: "হ্যাঁ। food.wb.gov.in-এ এবং সরকারি অফিসে ফর্ম-৬ সম্পূর্ণ ফ্রি। কোনো এজেন্ট লাগে না — অনলাইন ফর্মটি OTP দিয়ে কয়েক মিনিটেই হয়ে যায়।",
    },
    {
      q: "Can I buy from any ration shop without changing my tagged shop?",
      a: "Often yes. Under One Nation One Ration Card (ONORC) portability, a card with Aadhaar eKYC done can draw ration from other fair-price shops using fingerprint authentication. Form-6 is for permanently changing your home shop; portability helps for occasional or temporary needs.",
      bnQ: "যুক্ত দোকান না বদলেই কি যেকোনো রেশন দোকান থেকে কেনা যায়?",
      bnA: "প্রায়ই হ্যাঁ। One Nation One Ration Card (ONORC) পোর্টেবিলিটির আওতায়, যে কার্ডের আধার eKYC হয়ে গেছে সেটি ফিঙ্গারপ্রিন্ট যাচাই দিয়ে অন্য ফেয়ার-প্রাইস শপ থেকেও রেশন তুলতে পারে। ফর্ম-৬ হল স্থায়ীভাবে নিজের বাড়ির দোকান বদলের জন্য; পোর্টেবিলিটি মাঝেমধ্যে বা অস্থায়ী প্রয়োজনে কাজে লাগে।",
    },
    {
      q: "How long does the shop change take?",
      a: "Approval typically takes days to a few weeks. The change usually applies from the next distribution cycle after approval — check your tagged shop with the card status check on the portal.",
      bnQ: "দোকান বদলে কত সময় লাগে?",
      bnA: "অনুমোদনে সাধারণত কয়েক দিন থেকে কয়েক সপ্তাহ লাগে। অনুমোদনের পর পরিবর্তনটি সাধারণত পরবর্তী বিতরণ চক্র থেকে কার্যকর হয় — পোর্টালে কার্ড স্ট্যাটাস চেক দিয়ে আপনার যুক্ত দোকানটি দেখে নিন।",
    },
    {
      q: "Can the whole family move shops in one application?",
      a: "Yes — Form-6 lets you include the family's cards together so everyone ends up tagged to the same new shop.",
      bnQ: "পুরো পরিবার কি একটি আবেদনেই দোকান বদলাতে পারে?",
      bnA: "হ্যাঁ — ফর্ম-৬-এ পরিবারের কার্ডগুলি একসঙ্গে যোগ করা যায়, তাই সবাই একই নতুন দোকানের সঙ্গে যুক্ত হয়ে যায়।",
    },
    {
      q: "I moved to a different district. Same process?",
      a: "Yes, but update the address with Form-5 first so the food office of the new area handles your card correctly, then file Form-6 for a shop near the new home. Both steps are free.",
      bnQ: "আমি অন্য জেলায় চলে গেছি। প্রক্রিয়া কি একই?",
      bnA: "হ্যাঁ, তবে আগে ফর্ম-৫ দিয়ে ঠিকানা আপডেট করুন যাতে নতুন এলাকার খাদ্য অফিস আপনার কার্ড ঠিকভাবে সামলাতে পারে, তারপর নতুন বাড়ির কাছের দোকানের জন্য ফর্ম-৬ জমা দিন। দুটি ধাপই ফ্রি।",
    },
    {
      q: "Does the shop change alter my card number or category?",
      a: "No. Only the tagged fair-price shop changes — your card number, category and entitlements stay exactly the same, so an already-printed PVC card remains valid.",
      bnQ: "দোকান বদলে কি আমার কার্ড নম্বর বা ক্যাটাগরি বদলে যায়?",
      bnA: "না। শুধু যুক্ত ফেয়ার-প্রাইস শপটিই বদলায় — আপনার কার্ড নম্বর, ক্যাটাগরি ও সুবিধা হুবহু একই থাকে, তাই আগে থেকে প্রিন্ট করা PVC কার্ডও বৈধ থাকে।",
    },
    {
      q: "In short, how do I change my ration shop?",
      a: "Use Form-6 on food.wb.gov.in to transfer your card to a nearer fair-price shop — it's verified by OTP and free, and your card number or category never changes. If you want a waterproof PVC copy of your card, you can order one from erationcards.in.",
      bnQ: "রেশন দোকান পরিবর্তন করতে কী করতে হবে?",
      bnA: `food.wb.gov.in-এ Form-6 দিয়ে বিনামূল্যে কাছের রেশন দোকানে কার্ড ট্রান্সফার করুন — OTP দিয়ে যাচাই হয়। কার্ড নম্বর বা ক্যাটাগরি বদলায় না। আপনার কার্ডের ওয়াটারপ্রুফ PVC প্রিন্ট চাইলে erationcards.in-এ অর্ডার করুন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
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
      bnIntro="বাড়ি বদলেছেন, নাকি দোকান অনেক দূরে? food.wb.gov.in-এ ফর্ম-৬ দিয়ে আপনার কার্ড কাছের ডিলারের সঙ্গে যুক্ত করুন — ফ্রি।"
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
      bnQuickAnswer={
        <>
          আপনার রেশন কার্ড অন্য একটি ফেয়ার-প্রাইস শপে সরাতে <strong>food.wb.gov.in</strong>-এ (সরকারি, ফ্রি){" "}
          <strong>Form-6</strong> ব্যবহার করুন: কার্ড নম্বর দিন, OTP দিয়ে যাচাই করুন, এলাকা অনুযায়ী নতুন দোকান বেছে নিন,
          কারণ জানান এবং জমা দিন। অনুমোদনের পর সাধারণত পরবর্তী বিতরণ চক্র থেকে পরিবর্তনটি কার্যকর হয়। মাঝেমধ্যের প্রয়োজনে
          eKYC হয়ে যাওয়া কার্ড ONORC পোর্টেবিলিটিতে অন্য দোকান থেকেও রেশন তুলতে পারে। কার্ডের টেকসই প্লাস্টিক কপি চাই?
          erationcards.in সেটি ওয়াটারপ্রুফ PVC-তে প্রিন্ট করে বাড়িতে পৌঁছে দেয়, একটি কার্ড ₹{PRICING.ration.single.public}{" "}
          (২টি বা বেশি হলে প্রতি কার্ড ₹{PRICING.ration.multi.public})।
        </>
      }
      heroAction={
        <div className="text-center">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <a
              href="https://wbpds.wb.gov.in/fps_change_by_aadhaar.aspx"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-official-shop-change"
            >
              Open the official shop change page
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </a>
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            wbpds.wb.gov.in — Government of West Bengal's official site; the shop change there is free.{" "}
            <span lang="bn">সরকারি ওয়েবসাইট — দোকান বদল ফ্রি।</span>
          </p>
        </div>
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
