import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/ration-card-category-change-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Know your current category — and the one you're asking for",
    text: "The category is printed on your card: AAY, PHH, SPHH, RKSY-I or RKSY-II. Each has different eligibility rules and entitlements — read our card types guide if you're unsure what they mean.",
    bn: "আপনার কার্ডে ক্যাটাগরি লেখা থাকে: AAY, PHH, SPHH, RKSY-I বা RKSY-II। প্রতিটির যোগ্যতার নিয়ম আর সুবিধা আলাদা — কোনটা কী বোঝায় নিশ্চিত না হলে আমাদের কার্ডের ধরন সংক্রান্ত গাইডটি পড়ে নিন।",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. The category change request is Form-8 — free online, or on paper at your food inspector or BDO office.',
    bn: 'food.wb.gov.in (খাদ্য সাথী) খুলে "E-Citizen" অংশে যান। ক্যাটাগরি পরিবর্তনের আবেদন হল ফর্ম-৮ — অনলাইনে বিনামূল্যে, অথবা কাগজে আপনার ফুড ইন্সপেক্টর বা BDO অফিসে জমা দেওয়া যায়।',
  },
  {
    name: "Choose the Form-8 category change option",
    text: 'Look for "Change of category" or Form-8. Anything about changing your ration card category or applying for a different card class is the right place.',
    bn: 'কার্ডের ক্যাটাগরি বদল বা অন্য শ্রেণির কার্ডের আবেদন সংক্রান্ত অপশনটিই ঠিক জায়গা।',
  },
  {
    name: "Enter your card details and the grounds",
    text: "Enter the ration card number, verify with OTP, select the requested category and state your grounds — for example, household income, loss of earning member, occupation, or disability.",
    bn: "রেশন কার্ড নম্বর লিখুন, OTP দিয়ে যাচাই করুন, যে ক্যাটাগরি চাইছেন সেটি বেছে নিন এবং কারণ জানান — যেমন পরিবারের আয়, রোজগেরে সদস্যের মৃত্যু, পেশা বা প্রতিবন্ধকতা।",
  },
  {
    name: "Upload supporting documents",
    text: "Attach whatever backs your claim: income certificate, disability certificate, BPL-related documents, or occupation proof. Stronger documents mean an easier verification.",
    bn: "আপনার দাবির সমর্থনে যা যা আছে তা আপলোড করুন: আয়ের শংসাপত্র, প্রতিবন্ধকতার শংসাপত্র, BPL সংক্রান্ত কাগজ বা পেশার প্রমাণ। কাগজপত্র যত জোরালো, যাচাই তত সহজ।",
  },
  {
    name: "Submit, track and wait for verification",
    text: "Save the application number and track it on the portal. A food inspector typically verifies the household's situation before the government approves or declines the change.",
    bn: "আবেদন নম্বরটি সেভ করে রাখুন এবং পোর্টালে ট্র্যাক করুন। সরকার পরিবর্তন অনুমোদন বা বাতিল করার আগে সাধারণত একজন ফুড ইন্সপেক্টর পরিবারের অবস্থা যাচাই করেন।",
  },
  {
    name: "After approval, download the updated e-Ration Card",
    text: "The new category appears on your digital card once approved — download a fresh e-Ration Card PDF, since the old PDF still shows the old category.",
    bn: "অনুমোদন হয়ে গেলে নতুন ক্যাটাগরি আপনার ডিজিটাল কার্ডে দেখা যাবে — নতুন করে e-Ration Card PDF ডাউনলোড করুন, কারণ পুরনো PDF-এ এখনও পুরনো ক্যাটাগরিই দেখাবে।",
  },
];

export default function CategoryChange() {
  const PRICING = usePricing();

  useSeo({
    title: "Ration Card Category Change in West Bengal (Form-8) — RKSY to PHH & More, Free",
    description: `Request a West Bengal ration card category change free with Form-8 on food.wb.gov.in — e.g. RKSY-II to PHH or applying for AAY. Grounds, documents and verification explained. Print the updated card on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is a category change guaranteed if I apply?",
      a: "No. Form-8 is a request — the food department verifies your household against the eligibility rules for the category you asked for (NFSA criteria for AAY/PHH/SPHH, state rules for RKSY) and can approve or decline. Honest, well-documented applications have the best chance.",
      bnQ: "আবেদন করলেই কি ক্যাটাগরি বদল নিশ্চিত?",
      bnA: "না। ফর্ম-৮ একটি অনুরোধমাত্র — আপনি যে ক্যাটাগরি চেয়েছেন তার যোগ্যতার নিয়মের সঙ্গে (AAY/PHH/SPHH-এর জন্য NFSA-র মানদণ্ড, RKSY-র জন্য রাজ্যের নিয়ম) মিলিয়ে খাদ্য দফতর যাচাই করে, তারপর অনুমোদন বা বাতিল করতে পারে। সৎভাবে ও ভালো কাগজপত্র দিয়ে করা আবেদনেরই সবচেয়ে বেশি সম্ভাবনা।",
    },
    {
      q: "Is applying for a category change free?",
      a: "Yes — Form-8 is free on food.wb.gov.in and at government offices, like every other ration card service. Never pay an agent to 'guarantee' a category — nobody outside the government can.",
      bnQ: "ক্যাটাগরি পরিবর্তনের আবেদন কি বিনামূল্যে?",
      bnA: "হ্যাঁ — অন্য সব রেশন কার্ড পরিষেবার মতোই ফর্ম-৮ food.wb.gov.in-এ ও সরকারি অফিসে বিনামূল্যে। ক্যাটাগরি 'নিশ্চিত' করে দেওয়ার নাম করে কোনো এজেন্টকে টাকা দেবেন না — সরকার ছাড়া কেউ এটা করতে পারে না।",
    },
    {
      q: "Which category gives what?",
      a: "AAY is for the poorest households (highest entitlement), PHH/SPHH are NFSA priority categories, and RKSY-I / RKSY-II are West Bengal's state scheme categories. Our card types guide breaks down the entitlements of each.",
      bnQ: "কোন ক্যাটাগরিতে কী পাওয়া যায়?",
      bnA: "AAY সবচেয়ে দরিদ্র পরিবারের জন্য (সর্বাধিক সুবিধা), PHH/SPHH হল NFSA-র অগ্রাধিকারমূলক ক্যাটাগরি, আর RKSY-I / RKSY-II হল পশ্চিমবঙ্গের রাজ্য প্রকল্পের ক্যাটাগরি। প্রতিটির সুবিধা কী কী তা আমাদের কার্ডের ধরন সংক্রান্ত গাইডে বিস্তারিত দেওয়া আছে।",
    },
    {
      q: "How long does the change take?",
      a: "Expect a few weeks — Form-8 usually needs an inspector's verification of the household's circumstances before a decision. Track the application number on the portal.",
      bnQ: "পরিবর্তন হতে কতদিন লাগে?",
      bnA: "সাধারণত কয়েক সপ্তাহ ধরে নিন — সিদ্ধান্তের আগে ফর্ম-৮-এর ক্ষেত্রে সাধারণত ইন্সপেক্টরকে পরিবারের অবস্থা যাচাই করতে হয়। আবেদন নম্বর দিয়ে পোর্টালে ট্র্যাক করুন।",
    },
    {
      q: "Will my card number change with the category?",
      a: "The card remains your card — the category marking on the digital record updates. Download a fresh e-Ration Card PDF after approval so any copy you print shows the new category.",
      bnQ: "ক্যাটাগরি বদলালে কি কার্ড নম্বরও বদলে যাবে?",
      bnA: "কার্ড আপনারই থাকে — শুধু ডিজিটাল রেকর্ডে ক্যাটাগরির চিহ্নটি আপডেট হয়। অনুমোদনের পর নতুন করে e-Ration Card PDF ডাউনলোড করুন, যাতে যে কপিই প্রিন্ট করান তাতে নতুন ক্যাটাগরিই দেখা যায়।",
    },
    {
      q: "My income increased. Should I move to a lower-subsidy category?",
      a: "If the household no longer meets its category's criteria, the clean options are Form-8 to a fitting category, or switching to the non-subsidised card (Form-10) to keep the card without foodgrain subsidy.",
      bnQ: "আমার আয় বেড়েছে। কি কম ভর্তুকির ক্যাটাগরিতে সরে যাওয়া উচিত?",
      bnA: "পরিবার যদি আর নিজের ক্যাটাগরির মানদণ্ড পূরণ না করে, তাহলে পরিষ্কার উপায় দুটি — ফর্ম-৮ দিয়ে উপযুক্ত ক্যাটাগরিতে যাওয়া, অথবা খাদ্যশস্যের ভর্তুকি ছাড়া কার্ড রাখতে নন-সাবসিডাইজড কার্ডে (ফর্ম-১০) সরে আসা।",
    },
    {
      q: "In short — how do I change my ration card category?",
      a: `Apply free with Form-8 on food.wb.gov.in — you submit income proof or the relevant documents, and a decision follows after inspector verification. After approval, download the new PDF and get it printed on PVC at erationcards.in — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "রেশন কার্ডের ক্যাটাগরি বদলাতে কী করব?",
      bnA: `food.wb.gov.in-এ Form-8 দিয়ে বিনামূল্যে ক্যাটাগরি পরিবর্তনের আবেদন করুন — আয়ের প্রমাণ বা প্রাসঙ্গিক কাগজ দিতে হয়, ইন্সপেক্টর যাচাইয়ের পর সিদ্ধান্ত হয়। অনুমোদনের পর নতুন PDF ডাউনলোড করে erationcards.in থেকে PVC প্রিন্ট করান — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-category",
    canonical: CANONICAL,
    breadcrumbName: "Category Change Guide",
    howTo: {
      name: "How to change your ration card category in West Bengal (Form-8, free)",
      description:
        "Request a ration card category change in West Bengal free using Form-8 on food.wb.gov.in — with grounds, documents and inspector verification.",
      totalTime: "PT15M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Change Your Ration Card Category in West Bengal (Form-8)"
      intro="Think your household qualifies for PHH, SPHH or AAY — or need to move the other way? Form-8 is the free, official route."
      bnIntro="মনে হচ্ছে আপনার পরিবার PHH, SPHH বা AAY-র যোগ্য — কিংবা উল্টো দিকে যেতে চান? ফর্ম-৮ হল বিনামূল্যের সরকারি পথ।"
      quickAnswer={
        <>
          Use <strong>Form-8</strong> on <strong>food.wb.gov.in</strong> (official, free) to request a ration card
          category change in West Bengal — for example RKSY-II to PHH. Enter the card number, verify with OTP, state
          your grounds, upload supporting documents (income certificate, disability certificate, etc.) and track the
          application. The food department verifies eligibility before approving. After approval, download the
          updated e-Ration Card PDF — erationcards.in prints it on waterproof PVC for ₹
          {PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or more), delivered to your
          door.
        </>
      }
      related={[
        { href: "/guides/ration-card-types-west-bengal", label: "AAY, PHH, SPHH, RKSY-I & RKSY-II — entitlements compared" },
        { href: "/guides/non-subsidised-ration-card-west-bengal", label: "Non-subsidised card (Form-10) — the no-subsidy option" },
        { href: "/guides/download-e-ration-card", label: "Download the updated e-Ration Card after approval" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: request a category change" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Documents that strengthen a Form-8 request</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>Income certificate from the competent authority (most category upgrades hinge on income)</li>
          <li>Disability certificate, widow/single-parent documents, or proof of loss of the earning member</li>
          <li>Occupation proof for scheme-specific categories (e.g. registered workers)</li>
          <li>Aadhaar of the members, matching the card details</li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Be accurate.</strong> Category decisions are made by the government after verification. Claims that
          don't match the inspector's findings get declined — and a card obtained on wrong facts can be cancelled
          later.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Category updated? Print the new card properly"
        body={`Once the new category shows on your e-Ration Card, we'll print it on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
