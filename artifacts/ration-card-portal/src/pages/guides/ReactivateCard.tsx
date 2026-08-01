import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/reactivate-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Confirm the card really is deactivated",
    text: 'On food.wb.gov.in, run "Check the status of your Ration Card" with the card number and category. Note what the eKYC/Aadhaar column shows — pending eKYC is the usual culprit.',
    bn: 'food.wb.gov.in-এ কার্ড নম্বর ও ক্যাটাগরি দিয়ে "Check the status of your Ration Card" চালান। eKYC/আধার কলামে কী দেখাচ্ছে খেয়াল করুন — সাধারণত eKYC বাকি থাকাই মূল কারণ।',
  },
  {
    name: "Open the deactivated-card eKYC option",
    text: 'In the "E-Citizen" section, look for the option to link Aadhaar with a de-activated ration card through mobile OTP. The portal keeps a dedicated flow for exactly this situation.',
    bn: '"E-Citizen" অংশে ডিঅ্যাক্টিভেটেড রেশন কার্ডের সঙ্গে মোবাইল OTP দিয়ে আধার লিঙ্ক করার অপশনটি খুঁজুন। পোর্টালে ঠিক এই পরিস্থিতির জন্যই আলাদা ব্যবস্থা রাখা আছে।',
  },
  {
    name: "Enter the card number and Aadhaar number",
    text: "Fill in the deactivated card's number and the member's Aadhaar. Details must belong to the same person — that's what the verification checks.",
    bn: "ডিঅ্যাক্টিভেটেড কার্ডের নম্বর ও ওই সদস্যের আধার নম্বর দিন। তথ্যগুলো একই ব্যক্তির হতে হবে — যাচাইয়ে ঠিক এটাই দেখা হয়।",
  },
  {
    name: "Confirm with the OTP on the Aadhaar-linked mobile",
    text: "Enter the OTP sent to the mobile registered with that Aadhaar. If no mobile is linked to the Aadhaar, use the fingerprint route instead — your ration dealer's e-PoS machine does the same linking free.",
    bn: "সেই আধারে নিবন্ধিত মোবাইলে আসা OTP-টি দিন। আধারের সঙ্গে কোনো মোবাইল যুক্ত না থাকলে আঙুলের ছাপের রাস্তা নিন — আপনার রেশন ডিলারের e-PoS মেশিনে একই লিঙ্ক ফ্রি-তে হয়ে যায়।",
  },
  {
    name: "Wait for verification, then re-check the status",
    text: "After successful eKYC the card is reactivated once the department's verification completes — typically visible within days. Run the status check again until it shows Active.",
    bn: "eKYC সফল হওয়ার পর দফতরের যাচাই শেষ হলেই কার্ডটি আবার চালু হয় — সাধারণত কয়েক দিনের মধ্যেই দেখা যায়। যতক্ষণ না Active দেখাচ্ছে, ততক্ষণ বারবার স্ট্যাটাস চেক করতে থাকুন।",
  },
  {
    name: "Resume drawing ration — and download a fresh PDF",
    text: "Benefits resume from the next distribution once Active. Download a fresh e-Ration Card PDF so your copy reflects the current status.",
    bn: "কার্ড Active হয়ে গেলে পরের বণ্টন থেকেই আবার সুবিধা চালু হয়। একটি নতুন ই-রেশন কার্ড PDF ডাউনলোড করে নিন, যাতে আপনার কপিতে বর্তমান স্ট্যাটাস দেখা যায়।",
  },
];

export default function ReactivateCard() {
  const PRICING = usePricing();

  useSeo({
    title: "Ration Card Deactivated? How to Reactivate It in West Bengal (Aadhaar eKYC by OTP)",
    description: `Reactivate a deactivated West Bengal ration card free: complete the pending Aadhaar eKYC on food.wb.gov.in via mobile OTP (or fingerprint at the ration shop) and the card returns to Active. Then print it on waterproof PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Why was my ration card deactivated?",
      a: "In most cases: Aadhaar eKYC was pending. The government deactivates unlinked cards to weed out duplicates. Less common reasons include suspected duplicate cards or very long non-use. The status check on food.wb.gov.in shows the eKYC column.",
      bnQ: "আমার রেশন কার্ড ডিঅ্যাক্টিভেট হল কেন?",
      bnA: "বেশিরভাগ ক্ষেত্রে: আধার eKYC বাকি ছিল। ডুপ্লিকেট ছেঁটে ফেলতে সরকার লিঙ্ক না-করা কার্ড বন্ধ করে দেয়। কম প্রচলিত কারণের মধ্যে আছে সন্দেহজনক ডুপ্লিকেট কার্ড বা অনেক দিন ব্যবহার না হওয়া। food.wb.gov.in-এর স্ট্যাটাস চেকে eKYC কলামটি দেখা যায়।",
    },
    {
      q: "Does reactivation cost anything?",
      a: "No — completing eKYC and reactivating a genuine card is free, whether by OTP on the portal or fingerprint at the ration shop. Never pay an agent for it.",
      bnQ: "কার্ড আবার চালু করতে কি টাকা লাগে?",
      bnA: "না — eKYC সেরে সঠিক একটি কার্ড আবার চালু করা ফ্রি, পোর্টালে OTP দিয়ে হোক বা রেশন দোকানে আঙুলের ছাপ দিয়ে হোক। এর জন্য কখনও কোনো এজেন্টকে টাকা দেবেন না।",
    },
    {
      q: "How long does reactivation take after eKYC?",
      a: "The linking itself takes two minutes; the card usually shows Active again within days once verification completes. Keep re-checking the status page.",
      bnQ: "eKYC-র পর কার্ড আবার চালু হতে কত সময় লাগে?",
      bnA: "লিঙ্ক করতে নিজে দু-মিনিট লাগে; যাচাই শেষ হলে কার্ড সাধারণত কয়েক দিনের মধ্যেই আবার Active দেখায়। স্ট্যাটাস পেজটি বারবার চেক করতে থাকুন।",
    },
    {
      q: "There's no mobile linked to my Aadhaar — OTP is impossible.",
      a: "Two free fixes: (1) your ration dealer's e-PoS machine links Aadhaar by fingerprint, no mobile needed; (2) update your mobile at an Aadhaar Seva Kendra, then use the OTP flow. Elderly members with worn fingerprints should carry Aadhaar to the dealer — iris/alternative verification may be available at food offices.",
      bnQ: "আমার আধারের সঙ্গে কোনো মোবাইল যুক্ত নেই — OTP তো অসম্ভব।",
      bnA: "দুটো ফ্রি উপায়: (১) আপনার রেশন ডিলারের e-PoS মেশিন আঙুলের ছাপ দিয়ে আধার লিঙ্ক করে, কোনো মোবাইল লাগে না; (২) আধার সেবা কেন্দ্রে গিয়ে মোবাইল আপডেট করে তারপর OTP-র রাস্তা নিন। যেসব বয়স্ক সদস্যের আঙুলের ছাপ ক্ষয়ে গেছে, তাঁরা আধার নিয়ে ডিলারের কাছে যান — খাদ্য দফতরে চোখের মণি/বিকল্প যাচাইয়ের ব্যবস্থা থাকতে পারে।",
    },
    {
      q: "Will I get the ration I missed while deactivated?",
      a: "Entitlements resume from the next distribution after the card is Active. Missed past months generally aren't back-paid, which is why fixing eKYC promptly matters.",
      bnQ: "কার্ড বন্ধ থাকাকালীন যে রেশন পাইনি, সেটা কি পাব?",
      bnA: "কার্ড Active হওয়ার পর পরের বণ্টন থেকেই প্রাপ্য আবার চালু হয়। পেরিয়ে যাওয়া আগের মাসগুলোর রেশন সাধারণত ফিরিয়ে দেওয়া হয় না, তাই দেরি না করে eKYC ঠিক করা জরুরি।",
    },
    {
      q: "The card shows Active but the name is wrong now.",
      a: "Separate issue — run a free Form-5 correction so the record matches Aadhaar. Our correction guide covers it.",
      bnQ: "কার্ড Active দেখাচ্ছে, কিন্তু এখন নামটা ভুল।",
      bnA: "এটা আলাদা বিষয় — রেকর্ড যাতে আধারের সঙ্গে মেলে, তার জন্য একটি ফ্রি ফর্ম-৫ সংশোধন করুন। আমাদের সংশোধন গাইডে এটি দেখানো আছে।",
    },
    {
      q: "In short — how do I reactivate a deactivated card?",
      a: `The card is usually deactivated because Aadhaar eKYC was pending. On food.wb.gov.in there's a dedicated OTP option for deactivated cards — enter the card number and Aadhaar, confirm the OTP, and after verification the card returns to Active. It's completely free. Card active? erationcards.in prints it on PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "ডিঅ্যাক্টিভেট হওয়া রেশন কার্ড কীভাবে চালু করব?",
      bnA: `বেশিরভাগ ক্ষেত্রে আধার eKYC বাকি থাকায় কার্ড বন্ধ হয়। food.wb.gov.in-এ ডিঅ্যাক্টিভেটেড কার্ডের জন্য আলাদা OTP অপশন আছে — কার্ড নম্বর ও আধার দিন, OTP দিলে যাচাইয়ের পর কার্ড আবার Active হয়। সম্পূর্ণ বিনামূল্যে। কার্ড চালু হলে erationcards.in থেকে PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-reactivate",
    canonical: CANONICAL,
    breadcrumbName: "Reactivate Ration Card Guide",
    howTo: {
      name: "How to reactivate a deactivated West Bengal ration card (eKYC, free)",
      description:
        "Reactivate a deactivated West Bengal ration card free by completing Aadhaar eKYC — mobile OTP flow on food.wb.gov.in or fingerprint at the ration shop.",
      totalTime: "PT10M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="Ration Card Deactivated? How to Reactivate It in West Bengal"
      intro="Nine times out of ten it's pending Aadhaar eKYC — and the fix is a free 2-minute OTP on food.wb.gov.in."
      bnIntro="দশবারের নয়বারই কারণ আধার eKYC বাকি থাকা — আর সমাধান food.wb.gov.in-এ ২ মিনিটের একটি ফ্রি OTP।"
      quickAnswer={
        <>
          A deactivated West Bengal ration card is almost always waiting for <strong>Aadhaar eKYC</strong>. On{" "}
          <strong>food.wb.gov.in</strong> (official, free), use the dedicated option to link Aadhaar with a
          de-activated ration card via mobile OTP — enter the card number and Aadhaar, confirm the OTP, and the card
          returns to Active after verification (fingerprint at your ration dealer works too). Benefits resume from
          the next distribution. Once Active, erationcards.in prints your card on waterproof PVC for ₹
          {PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or more), delivered to your
          door.
        </>
      }
      related={[
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "The full Aadhaar & mobile linking guide (eKYC)" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check your card's live status" },
        { href: "/guides/download-e-ration-card", label: "Download a fresh e-Ration Card PDF once Active" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: reactivate your card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">If eKYC doesn't fix it</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          When the status check shows the card deactivated for a reason other than pending eKYC — or it stays
          deactivated weeks after successful linking — take your Aadhaar and card number to the local food
          inspector's office or ration dealer, or use the grievance/helpline options listed on food.wb.gov.in. A
          genuine single card for a living person is always recoverable; only duplicates and ineligible cards stay
          closed.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Card active again? Keep it that way — in your wallet"
        body={`Print the reactivated card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
