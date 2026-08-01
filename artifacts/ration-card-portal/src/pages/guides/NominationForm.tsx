import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/ration-card-nomination-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Understand when a nominee is needed",
    text: "Ration is issued against fingerprint (or other Aadhaar-based) authentication at the shop's e-PoS machine. When no family member can authenticate — elderly members with worn fingerprints, illness, disability — the family can nominate a trusted person to draw the ration on its behalf.",
    bn: "দোকানের e-PoS মেশিনে আঙুলের ছাপ (বা অন্য আধার-ভিত্তিক) যাচাইয়ের বিনিময়ে রেশন দেওয়া হয়। যখন পরিবারের কোনো সদস্যই যাচাই করতে পারেন না — বয়স্ক সদস্যের ক্ষয়ে যাওয়া আঙুলের ছাপ, অসুস্থতা, প্রতিবন্ধকতা — তখন পরিবার একজন বিশ্বস্ত ব্যক্তিকে মনোনীত করে তাঁর মাধ্যমে রেশন তুলতে পারে।",
  },
  {
    name: "Choose the nominee carefully",
    text: "Any trusted adult with their own Aadhaar can be nominated — a relative or a neighbour. The nominee authenticates with their fingerprint at the shop, so pick someone who actually goes to that ration shop area regularly.",
    bn: "নিজের আধার আছে এমন যেকোনো বিশ্বস্ত প্রাপ্তবয়স্ককে মনোনীত করা যায় — আত্মীয় বা প্রতিবেশী। মনোনীত ব্যক্তি দোকানে নিজের আঙুলের ছাপ দিয়ে যাচাই করেন, তাই এমন কাউকে বাছুন যিনি সত্যিই ওই রেশন দোকানের এলাকায় নিয়মিত যান।",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. The nomination is Form-15 — free online, or on paper at your ration dealer, food inspector or BDO office.',
    bn: 'food.wb.gov.in (খাদ্য সাথী) পোর্টালে গিয়ে "E-Citizen" অংশটি খুলুন। মনোনয়নের ফর্মটি হল ফর্ম-১৫ — অনলাইনে বিনামূল্যে, বা কাগজে আপনার রেশন ডিলার, খাদ্য পরিদর্শক বা BDO অফিসে।',
  },
  {
    name: "Fill Form-15 with both sides' details",
    text: "Enter the family's ration card number(s) and the nominee's name and Aadhaar number, and state the reason no member can authenticate (age, illness, disability).",
    bn: "পরিবারের রেশন কার্ড নম্বর, মনোনীত ব্যক্তির নাম ও আধার নম্বর লিখুন, এবং কোনো সদস্য কেন যাচাই করতে পারছেন না তার কারণ (বয়স, অসুস্থতা, প্রতিবন্ধকতা) উল্লেখ করুন।",
  },
  {
    name: "Verify with OTP and submit",
    text: "Confirm with the OTP on the registered mobile, submit, and save the acknowledgement number.",
    bn: "নিবন্ধিত মোবাইলে আসা OTP দিয়ে নিশ্চিত করুন, জমা দিন, এবং প্রাপ্তি স্বীকারের নম্বরটি রেখে দিন।",
  },
  {
    name: "The nominee starts drawing after approval",
    text: "Once the department records the nomination, the nominee authenticates at the fair-price shop and collects the family's entitlement on their behalf. The grain remains the family's — the nominee is only the authorised collector.",
    bn: "দফতর মনোনয়ন নথিভুক্ত করার পর মনোনীত ব্যক্তি রেশন দোকানে গিয়ে যাচাই করে পরিবারের প্রাপ্য রেশন তুলে দিতে পারবেন। শস্য কিন্তু পরিবারেরই থাকে — মনোনীত ব্যক্তি কেবল অনুমোদিত সংগ্রাহক।",
  },
];

export default function NominationForm() {
  const PRICING = usePricing();

  useSeo({
    title: "Nominate Someone to Collect Your Ration in West Bengal (Form-15) — For Elderly & Disabled, Free",
    description: `When no family member can give fingerprints at the ration shop, Form-15 on food.wb.gov.in lets you nominate a trusted person to draw the ration — free, OTP-verified. Steps and rules explained. Print family cards on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Who typically needs Form-15 nomination?",
      a: "Households where every member struggles with e-PoS authentication — elderly people with worn fingerprints, bed-ridden or hospitalised members, and persons with disabilities. The nominee bridges the biometric gap so the family doesn't miss its ration.",
      bnQ: "সাধারণত কাদের ফর্ম-১৫ মনোনয়ন দরকার হয়?",
      bnA: "যেসব পরিবারে প্রত্যেক সদস্যই e-PoS যাচাইয়ে অসুবিধায় পড়েন — ক্ষয়ে যাওয়া আঙুলের ছাপওয়ালা বয়স্ক মানুষ, শয্যাশায়ী বা হাসপাতালে ভর্তি সদস্য, এবং প্রতিবন্ধী ব্যক্তিরা। মনোনীত ব্যক্তি এই বায়োমেট্রিক ফাঁকটা পূরণ করেন, যাতে পরিবার রেশন থেকে বঞ্চিত না হয়।",
    },
    {
      q: "Is nominating someone free?",
      a: "Yes — Form-15 is free on food.wb.gov.in and at government offices. The nominee also pays nothing; they simply authenticate at the shop when collecting.",
      bnQ: "কাউকে মনোনীত করা কি ফ্রি?",
      bnA: "হ্যাঁ — food.wb.gov.in-এ এবং সরকারি অফিসে ফর্ম-১৫ বিনামূল্যে। মনোনীত ব্যক্তিকেও কিছু দিতে হয় না; তিনি শুধু রেশন তোলার সময় দোকানে যাচাই করেন।",
    },
    {
      q: "Does the nominee become a member of our ration card?",
      a: "No. The nominee is only an authorised collector — they draw your entitlement on your behalf. They stay on their own family's card and their own entitlements are unaffected.",
      bnQ: "মনোনীত ব্যক্তি কি আমাদের রেশন কার্ডের সদস্য হয়ে যান?",
      bnA: "না। মনোনীত ব্যক্তি কেবল একজন অনুমোদিত সংগ্রাহক — তিনি আপনার হয়ে আপনার প্রাপ্য রেশন তোলেন। তিনি নিজের পরিবারের কার্ডেই থাকেন এবং তাঁর নিজের প্রাপ্যে কোনো প্রভাব পড়ে না।",
    },
    {
      q: "Can we change or cancel the nominee later?",
      a: "Yes — nominations can be updated the same way if the nominee moves away or the family's situation changes. Keep the acknowledgement of the latest nomination.",
      bnQ: "পরে কি মনোনীত ব্যক্তি বদলানো বা বাতিল করা যায়?",
      bnA: "হ্যাঁ — মনোনীত ব্যক্তি অন্যত্র চলে গেলে বা পরিবারের পরিস্থিতি বদলালে একই পদ্ধতিতে মনোনয়ন আপডেট করা যায়। সর্বশেষ মনোনয়নের প্রাপ্তি স্বীকারটি রেখে দিন।",
    },
    {
      q: "Is there any other option besides a nominee?",
      a: "Ask at the shop or food office — alternative authentication (like iris scanning) may be available for members whose fingerprints fail, and dealers are instructed to help genuine cases. Form-15 remains the reliable route when no member can authenticate at all.",
      bnQ: "মনোনীত ব্যক্তি ছাড়া কি অন্য কোনো উপায় আছে?",
      bnA: "দোকানে বা খাদ্য দফতরে জিজ্ঞেস করুন — যাঁদের আঙুলের ছাপ কাজ করে না তাঁদের জন্য বিকল্প যাচাই (যেমন আইরিস স্ক্যান) থাকতে পারে, আর প্রকৃত ক্ষেত্রে সাহায্য করার জন্য ডিলারদের নির্দেশ দেওয়া আছে। তবে কোনো সদস্যই যখন একেবারেই যাচাই করতে পারেন না, তখন ফর্ম-১৫-ই ভরসাযোগ্য পথ।",
    },
    {
      q: "In short — how do I authorise someone to collect my elderly parents' ration?",
      a: `On food.wb.gov.in, fill Form-15 for free to nominate a trusted relative or neighbour — you'll need their Aadhaar number and an OTP to submit. After approval they authenticate at the shop with their own fingerprint and collect your family's ration for you. Want durable copies of the cards? PVC printing at erationcards.in: ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "বয়স্ক মা-বাবার রেশন কে তুলবে — আঙুলের ছাপ কাজ করে না?",
      bnA: `food.wb.gov.in-এ Form-15 দিয়ে বিনামূল্যে একজন বিশ্বস্ত ব্যক্তিকে (আত্মীয় বা প্রতিবেশী) মনোনীত করুন — তাঁর আধার নম্বর লাগবে, OTP দিয়ে জমা দিন। অনুমোদনের পর তিনি দোকানে আঙুলের ছাপ দিয়ে আপনার পরিবারের রেশন তুলে দিতে পারবেন। কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-nomination",
    canonical: CANONICAL,
    breadcrumbName: "Ration Nomination Guide",
    howTo: {
      name: "How to nominate someone to draw your ration in West Bengal (Form-15, free)",
      description:
        "Nominate a trusted person to collect a family's ration in West Bengal free using Form-15 on food.wb.gov.in — for households where no member can authenticate at the e-PoS machine.",
      totalTime: "PT10M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Nominate Someone to Collect Your Ration in West Bengal (Form-15)"
      intro="For elderly, ill or disabled card holders — authorise a trusted person to draw your ration, free on food.wb.gov.in."
      bnIntro="বয়স্ক, অসুস্থ বা প্রতিবন্ধী কার্ডধারীদের জন্য — একজন বিশ্বস্ত ব্যক্তিকে আপনার রেশন তোলার অনুমতি দিন, food.wb.gov.in-এ বিনামূল্যে।"
      quickAnswer={
        <>
          When no family member can give fingerprints at the ration shop, use <strong>Form-15</strong> on{" "}
          <strong>food.wb.gov.in</strong> (official, free) to nominate a trusted person: enter your card number(s),
          the nominee's name and Aadhaar, the reason, and confirm with OTP. After approval the nominee authenticates
          at the fair-price shop and collects the family's entitlement on your behalf — they never become a member
          of your card. Want durable copies of the family's cards? erationcards.in prints them on waterproof PVC for
          ₹{PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or more), delivered to your
          door.
        </>
      }
      related={[
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "eKYC basics — why authentication is needed" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check the family's cards are active" },
        { href: "/guides/ration-card-types-west-bengal", label: "What each card category is entitled to" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: nominate a ration collector" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Good to know before nominating</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>The nominee needs their own Aadhaar — that's what they authenticate with at the shop.</li>
          <li>The family's entitlement and category don't change; only who physically collects does.</li>
          <li>
            Keep the family's own eKYC in order anyway — see the{" "}
            <Link href="/guides/link-aadhaar-ration-card-west-bengal" className="text-primary hover:underline">
              Aadhaar linking guide
            </Link>{" "}
            — so the cards stay active.
          </li>
          <li>If a member's fingerprints fail only sometimes, ask the dealer about alternative verification first.</li>
        </ul>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Make collection day easier for your nominee"
        body={`A wallet-size waterproof PVC card with the number clearly printed saves fumbling with papers at the shop — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
