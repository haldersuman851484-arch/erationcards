import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/ration-card-member-transfer-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Check Form-14 is the right form",
    text: "Form-14 shifts a person who already holds a WB ration card into another existing family — the classic case is a bride joining her in-laws' card after marriage. If the person never had a card, that's a Form-4 addition instead.",
    bn: "ফর্ম-১৪ দিয়ে এমন একজনকে অন্য একটি বিদ্যমান পরিবারে সরানো হয়, যাঁর ইতিমধ্যেই একটি WB রেশন কার্ড আছে — সবচেয়ে চেনা উদাহরণ হল বিয়ের পর নববধূ শ্বশুরবাড়ির কার্ডে যোগ হওয়া। যদি সেই ব্যক্তির কখনও কার্ডই না থেকে থাকে, তাহলে বদলে ফর্ম-৪ দিয়ে নতুন সদস্য যোগ করতে হবে।",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. Look for "Shifting of individual to another existing family" or Form-14 — free online, or on paper at your food office.',
    bn: 'food.wb.gov.in (খাদ্য সাথী) পোর্টালে গিয়ে "E-Citizen" অংশটি খুলুন। "Shifting of individual to another existing family" বা ফর্ম-১৪ খুঁজে নিন — অনলাইনে বিনামূল্যে, বা কাগজে আপনার খাদ্য দফতরে।',
  },
  {
    name: "Enter both card references",
    text: "Fill in the moving member's own ration card number and the destination family's card number (usually the head of family's), so the department knows exactly who moves where.",
    bn: "যে সদস্য সরছেন তাঁর নিজের রেশন কার্ড নম্বর এবং যে পরিবারে যাচ্ছেন সেই পরিবারের কার্ড নম্বর (সাধারণত পরিবারের প্রধানের) লিখুন, যাতে দফতর ঠিক বুঝতে পারে কে কোথায় যাচ্ছেন।",
  },
  {
    name: "Give the reason and proof",
    text: "Select the reason — marriage is the most common — and upload the supporting document: marriage certificate or an equivalent declaration, plus the member's Aadhaar.",
    bn: "কারণ বেছে নিন — বিয়েই সবচেয়ে বেশি হয় — এবং প্রমাণ হিসেবে নথি আপলোড করুন: বিয়ের সার্টিফিকেট বা সমতুল্য ঘোষণাপত্র, সঙ্গে সদস্যের আধার।",
  },
  {
    name: "Verify with OTP and submit",
    text: "Confirm with the OTP sent to the registered mobile, submit, and save the application number for tracking.",
    bn: "নিবন্ধিত মোবাইলে আসা OTP দিয়ে নিশ্চিত করুন, জমা দিন, এবং ট্র্যাক করার জন্য অ্যাপ্লিকেশন নম্বরটি রেখে দিন।",
  },
  {
    name: "After approval, download the updated e-Ration Card",
    text: "The member's card now shows the new family and its fair-price shop. Download a fresh PDF — the old one still shows the previous family's details.",
    bn: "অনুমোদনের পর সদস্যের কার্ডে নতুন পরিবার ও তার রেশন দোকান দেখাবে। নতুন করে PDF ডাউনলোড করুন — পুরনোটিতে আগের পরিবারের তথ্যই থেকে যাবে।",
  },
];

export default function MemberTransfer() {
  const PRICING = usePricing();

  useSeo({
    title: "Transfer a Ration Card Member to Another Family in West Bengal (Form-14) — After Marriage & More",
    description: `Shift a West Bengal ration card holder into another existing family free with Form-14 on food.wb.gov.in — the standard step after marriage. Both card numbers, documents and OTP steps explained. Print the updated card on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "My wife just moved in after our wedding. Which form?",
      a: "If she already has a ration card in her parents' family, use Form-14 to shift her card into your family. If she never had a card at all, apply with Form-4 instead. Both are free on food.wb.gov.in.",
      bnQ: "বিয়ের পর স্ত্রী আমাদের বাড়িতে এসেছেন। কোন ফর্ম লাগবে?",
      bnA: "তাঁর যদি ইতিমধ্যে বাপের বাড়ির পরিবারে রেশন কার্ড থাকে, তাহলে ফর্ম-১৪ দিয়ে তাঁর কার্ড আপনাদের পরিবারে সরিয়ে আনুন। যদি তাঁর কখনও কার্ডই না থেকে থাকে, তাহলে বদলে ফর্ম-৪ দিয়ে আবেদন করুন। food.wb.gov.in-এ দুটোই বিনামূল্যে।",
    },
    {
      q: "Is the member transfer free?",
      a: "Yes — Form-14 costs nothing online or at the food office, like all WB ration card services. No agent required.",
      bnQ: "সদস্য স্থানান্তর করা কি ফ্রি?",
      bnA: "হ্যাঁ — অন্য সব WB রেশন কার্ড পরিষেবার মতোই ফর্ম-১৪ অনলাইনে বা খাদ্য দফতরে কোনো খরচ নেই। কোনো দালালের দরকার নেই।",
    },
    {
      q: "Does the transferred member keep their card number?",
      a: "The member keeps their identity in the system — the family grouping, address and tagged fair-price shop update to the new family. Download a fresh e-Ration Card PDF after approval to see the updated details.",
      bnQ: "স্থানান্তরিত সদস্য কি তাঁর কার্ড নম্বর ধরে রাখেন?",
      bnA: "সিস্টেমে সদস্যের পরিচয় একই থাকে — শুধু পরিবারের গোষ্ঠী, ঠিকানা এবং যুক্ত রেশন দোকান নতুন পরিবার অনুযায়ী আপডেট হয়। অনুমোদনের পর নতুন করে e-Ration Card PDF ডাউনলোড করে আপডেট হওয়া তথ্য দেখে নিন।",
    },
    {
      q: "Does her ration move to our shop automatically?",
      a: "Yes — once the transfer is approved the member draws from the destination family's tagged shop. If the whole family later wants a different shop, that's a separate free Form-6.",
      bnQ: "তাঁর রেশন কি আমাদের দোকানে আপনা থেকেই চলে আসবে?",
      bnA: "হ্যাঁ — স্থানান্তর অনুমোদিত হলে সদস্য গন্তব্য পরিবারের যুক্ত দোকান থেকেই রেশন তুলবেন। পরে যদি গোটা পরিবার আলাদা দোকান চায়, সেটা আলাদা একটি ফ্রি ফর্ম-৬-এর ব্যাপার।",
    },
    {
      q: "What documents are needed?",
      a: "The member's Aadhaar, both ration card numbers, and proof of the relationship change — a marriage certificate is standard for marriage cases. Adoption or guardianship documents cover other cases.",
      bnQ: "কী কী নথি লাগবে?",
      bnA: "সদস্যের আধার, দুটি রেশন কার্ড নম্বর, এবং সম্পর্ক বদলের প্রমাণ — বিয়ের ক্ষেত্রে বিয়ের সার্টিফিকেটই স্বাভাবিক। অন্য ক্ষেত্রে দত্তক বা অভিভাবকত্বের নথি চলবে।",
    },
    {
      q: "How long does the transfer take?",
      a: "Usually days to a few weeks depending on verification. Track the application number on the portal; the updated card PDF is downloadable once approved.",
      bnQ: "স্থানান্তরে কতদিন লাগে?",
      bnA: "যাচাইয়ের উপর নির্ভর করে সাধারণত কয়েক দিন থেকে কয়েক সপ্তাহ। পোর্টালে অ্যাপ্লিকেশন নম্বর দিয়ে ট্র্যাক করুন; অনুমোদন হয়ে গেলেই আপডেট হওয়া কার্ডের PDF ডাউনলোড করা যায়।",
    },
    {
      q: "In short — how do I move my wife's card into our family after marriage?",
      a: `Use Form-14 on food.wb.gov.in for free — enter her card number and your family's card number, upload proof of marriage, and submit with an OTP. Download the fresh PDF once it's approved. Want it on PVC? erationcards.in prints the updated card for ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "বিয়ের পর স্ত্রীর রেশন কার্ড শ্বশুরবাড়ির কার্ডে আনব কীভাবে?",
      bnA: `food.wb.gov.in-এ Form-14 দিয়ে বিনামূল্যে — স্ত্রীর কার্ড নম্বর ও আপনাদের পরিবারের কার্ড নম্বর দিন, বিয়ের প্রমাণ আপলোড করে OTP দিয়ে জমা দিন। অনুমোদনের পর নতুন PDF ডাউনলোড করুন। আপডেট হওয়া কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-transfer",
    canonical: CANONICAL,
    breadcrumbName: "Member Transfer Guide",
    howTo: {
      name: "How to shift a ration card member to another family in West Bengal (Form-14, free)",
      description:
        "Transfer a West Bengal ration card holder into another existing family free using Form-14 on food.wb.gov.in — standard after marriage.",
      totalTime: "PT10M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Shift a Member to Another Family's Ration Card in West Bengal (Form-14)"
      intro="The standard step after marriage: move an existing card holder into another family — free on food.wb.gov.in."
      bnIntro="বিয়ের পরের চেনা কাজ: একজন বিদ্যমান কার্ডধারীকে অন্য পরিবারে সরিয়ে নিন — food.wb.gov.in-এ বিনামূল্যে।"
      quickAnswer={
        <>
          Use <strong>Form-14</strong> on <strong>food.wb.gov.in</strong> (official, free) to shift someone who
          already holds a West Bengal ration card into another existing family — most commonly a bride joining her
          in-laws. Enter the member's card number and the destination family's card number, upload the marriage
          certificate (or equivalent), verify with OTP and track the application. After approval, download the
          updated e-Ration Card PDF — erationcards.in prints it on waterproof PVC for ₹
          {PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or more), delivered to your
          door.
        </>
      }
      bnQuickAnswer={
        <>
          <strong>food.wb.gov.in</strong>-এ (সরকারি, ফ্রি) <strong>Form-14</strong> দিয়ে এমন একজনকে অন্য একটি
          বিদ্যমান পরিবারে সরান, যাঁর ইতিমধ্যেই পশ্চিমবঙ্গের রেশন কার্ড আছে — সবচেয়ে চেনা উদাহরণ বিয়ের পর নববধূ
          শ্বশুরবাড়ির কার্ডে যোগ হওয়া। সেই সদস্যের কার্ড নম্বর ও গন্তব্য পরিবারের কার্ড নম্বর দিন, বিয়ের সার্টিফিকেট
          (বা সমতুল্য) আপলোড করুন, OTP দিয়ে নিশ্চিত করে আবেদন ট্র্যাক করুন। অনুমোদনের পর নতুন e-Ration Card PDF
          ডাউনলোড করুন — erationcards.in সেটি ওয়াটারপ্রুফ PVC-তে প্রিন্ট করে ₹{PRICING.ration.single.public} (২টি বা
          বেশি হলে প্রতি কার্ড ₹{PRICING.ration.multi.public}), বাড়িতে পৌঁছে দেওয়া হয়।
        </>
      }
      related={[
        { href: "/guides/apply-new-ration-card-west-bengal", label: "Never had a card? Form-4 addition instead" },
        { href: "/guides/split-ration-card-family-west-bengal", label: "Whole group separating? Form-13 split" },
        { href: "/guides/ration-card-correction-west-bengal", label: "Surname change after marriage — Form-5 correction" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: transfer the member" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Marriage checklist — the three common updates</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Form-14</strong> — shift her card into the new family (this guide).
          </li>
          <li>
            <strong>Form-5</strong> — if the surname or address on the card should change too, do a free{" "}
            <Link href="/guides/ration-card-correction-west-bengal" className="text-primary hover:underline">
              correction
            </Link>{" "}
            after the transfer, keeping everything matched with Aadhaar.
          </li>
          <li>
            <strong>Aadhaar eKYC</strong> — make sure her{" "}
            <Link href="/guides/link-aadhaar-ration-card-west-bengal" className="text-primary hover:underline">
              Aadhaar and current mobile are linked
            </Link>{" "}
            so OTP services keep working from the new home.
          </li>
        </ul>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Transfer approved? Print the updated family set"
        body={`Download the fresh e-Ration Card PDFs and we'll print the whole family's cards on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
