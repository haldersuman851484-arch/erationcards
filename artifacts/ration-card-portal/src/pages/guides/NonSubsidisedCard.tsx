import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { Button } from "@/components/ui/button";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/non-subsidised-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Understand what the non-subsidised card is",
    text: "It's a valid West Bengal ration card with zero foodgrain entitlement — no subsidised grain, but a fully official card useful as an identity and family record document. It suits households that don't want or don't qualify for subsidy.",
    bn: "এটি পশ্চিমবঙ্গের একটি বৈধ রেশন কার্ড, তবে এতে খাদ্যশস্যের কোনো অধিকার থাকে না — ভর্তুকির খাদ্যশস্য মেলে না, কিন্তু পুরোপুরি সরকারি একটি কার্ড, যা পরিচয়পত্র ও পারিবারিক রেকর্ড হিসেবে কাজে লাগে। যেসব পরিবার ভর্তুকি চায় না বা তার যোগ্য নয়, তাদের জন্য উপযুক্ত।",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in (Khadya Sathi) and open the "E-Citizen" section. The non-subsidised card application/conversion is Form-10 — free online, or on paper at your food office.',
    bn: 'food.wb.gov.in (খাদ্য সাথী) খুলে "E-Citizen" অংশে যান। নন-সাবসিডাইজড কার্ডের আবেদন বা রূপান্তর হল ফর্ম-১০ — অনলাইনে বিনামূল্যে, অথবা কাগজে আপনার ফুড অফিসে।',
  },
  {
    name: "Choose new card or conversion",
    text: "Form-10 covers both: applying fresh for a non-subsidised card, or converting your family's existing subsidised cards to non-subsidised (a common step when income has grown and you want to give up the subsidy cleanly).",
    bn: "ফর্ম-১০ দুটোই কভার করে: নতুন করে নন-সাবসিডাইজড কার্ডের আবেদন, অথবা পরিবারের চালু সাবসিডাইজড কার্ডগুলিকে নন-সাবসিডাইজডে রূপান্তর (আয় বেড়ে গেলে ভর্তুকি পরিষ্কারভাবে ছেড়ে দিতে অনেকেই এটা করেন)।",
  },
  {
    name: "Fill member details as per Aadhaar",
    text: "Enter each member's name, date of birth and Aadhaar number exactly as on Aadhaar, and the existing card numbers if converting.",
    bn: "প্রত্যেক সদস্যের নাম, জন্মতারিখ ও আধার নম্বর ঠিক আধারে যেমন আছে তেমনভাবে লিখুন, আর রূপান্তর করলে চালু কার্ড নম্বরগুলিও দিন।",
  },
  {
    name: "Verify with OTP and submit",
    text: "Confirm with the OTP sent to your mobile, submit, and save the application number to track progress on the portal.",
    bn: "আপনার মোবাইলে আসা OTP দিয়ে নিশ্চিত করুন, জমা দিন এবং পোর্টালে অগ্রগতি ট্র্যাক করতে আবেদন নম্বরটি সেভ করে রাখুন।",
  },
  {
    name: "Download the e-Ration Card after approval",
    text: "Approved members get their digital cards showing the non-subsidised status — download one PDF per member from the portal.",
    bn: "অনুমোদিত সদস্যরা তাদের ডিজিটাল কার্ড পান, যেখানে নন-সাবসিডাইজড স্ট্যাটাস দেখানো থাকে — পোর্টাল থেকে প্রতি সদস্যের জন্য একটি করে PDF ডাউনলোড করুন।",
  },
];

export default function NonSubsidisedCard() {
  const PRICING = usePricing();

  useSeo({
    title: "Non-Subsidised Ration Card West Bengal (Form-10) — Who It's For & How to Apply Free",
    description: `West Bengal's non-subsidised ration card: a valid government card with no foodgrain subsidy — ideal as ID and family record. Apply or convert free with Form-10 on food.wb.gov.in. Print it on waterproof PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Why would anyone want a ration card with no subsidy?",
      a: "Because a ration card is more than grain — it's a widely accepted identity and family-record document, keeps every member inside the food-department system (helpful for future needs), and beats having no card at all if your household doesn't qualify for subsidised categories.",
      bnQ: "ভর্তুকি ছাড়া রেশন কার্ড কেউ কেন চাইবে?",
      bnA: "কারণ রেশন কার্ড শুধু খাদ্যশস্যের ব্যাপার নয় — এটি একটি বহুল স্বীকৃত পরিচয়পত্র ও পারিবারিক রেকর্ডের নথি, প্রত্যেক সদস্যকে খাদ্য দফতরের ব্যবস্থার ভিতরে রাখে (ভবিষ্যতের প্রয়োজনে কাজে লাগে), আর পরিবার যদি সাবসিডাইজড ক্যাটাগরির যোগ্য না হয়, তাহলে একেবারে কোনো কার্ড না থাকার চেয়ে এটি ভালো।",
    },
    {
      q: "Is the non-subsidised card free to get?",
      a: "Yes. Form-10 — whether a fresh application or converting existing cards — is free on food.wb.gov.in and at government offices.",
      bnQ: "নন-সাবসিডাইজড কার্ড পেতে কি কোনো খরচ লাগে?",
      bnA: "না। ফর্ম-১০ — নতুন আবেদন হোক বা চালু কার্ড রূপান্তর — food.wb.gov.in-এ ও সরকারি অফিসে বিনামূল্যে।",
    },
    {
      q: "Is the non-subsidised card the same as RKSY-II?",
      a: "No. RKSY-II is a state scheme category that still carries a small subsidised entitlement. The non-subsidised card carries none — it's purely an official card and record.",
      bnQ: "নন-সাবসিডাইজড কার্ড কি RKSY-II-এর মতোই?",
      bnA: "না। RKSY-II হল রাজ্য প্রকল্পের একটি ক্যাটাগরি, যেখানে এখনও সামান্য ভর্তুকির অধিকার থাকে। নন-সাবসিডাইজড কার্ডে সেটুকুও নেই — এটি নিছক একটি সরকারি কার্ড ও রেকর্ড।",
    },
    {
      q: "Can we switch back to a subsidised card later?",
      a: "You can apply — if your circumstances change, request a category with Form-8. The government verifies eligibility before approving any subsidised category; nothing is automatic.",
      bnQ: "পরে কি আবার সাবসিডাইজড কার্ডে ফিরে যাওয়া যায়?",
      bnA: "আবেদন করতে পারেন — পরিস্থিতি বদলালে ফর্ম-৮ দিয়ে কোনো ক্যাটাগরির জন্য অনুরোধ করুন। সরকার যেকোনো সাবসিডাইজড ক্যাটাগরি অনুমোদনের আগে যোগ্যতা যাচাই করে; কিছুই আপনা থেকে হয় না।",
    },
    {
      q: "Does the non-subsidised card need Aadhaar eKYC too?",
      a: "Keeping Aadhaar linked is recommended for all cards — it keeps the record clean and avoids deactivation issues. The linking is free via OTP or at a ration shop.",
      bnQ: "নন-সাবসিডাইজড কার্ডেও কি আধার eKYC লাগে?",
      bnA: "সব কার্ডেই আধার লিঙ্ক করে রাখা ভালো — এতে রেকর্ড পরিষ্কার থাকে এবং কার্ড নিষ্ক্রিয় হয়ে যাওয়ার সমস্যা এড়ানো যায়। OTP দিয়ে বা রেশন দোকানে গিয়ে এই লিঙ্ক করা বিনামূল্যে।",
    },
    {
      q: "Can I print a non-subsidised card on PVC?",
      a: `Yes — it's a normal e-Ration Card PDF, and we print it exactly like any other ration card: ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, delivery included.`,
      bnQ: "নন-সাবসিডাইজড কার্ড কি PVC-তে প্রিন্ট করানো যায়?",
      bnA: `হ্যাঁ — এটি একটি সাধারণ e-Ration Card PDF, আর আমরা এটিকে অন্য যেকোনো রেশন কার্ডের মতোই প্রিন্ট করি: একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}, ডেলিভারি ধরা আছে।`,
    },
    {
      q: "In short — what is the non-subsidised ration card and how do I get it?",
      a: `It's a valid West Bengal government ration card without foodgrain subsidy — handy as ID and family record. Apply for it or convert existing cards free with Form-10 on food.wb.gov.in. Once you have the PDF, get a PVC print at erationcards.in — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "নন-সাবসিডাইজড রেশন কার্ড কী?",
      bnA: `এটি পশ্চিমবঙ্গের বৈধ সরকারি রেশন কার্ড, তবে ভর্তুকির খাদ্যশস্য পাওয়া যায় না — পরিচয়পত্র ও পারিবারিক রেকর্ড হিসেবে কাজে লাগে। food.wb.gov.in-এ Form-10 দিয়ে বিনামূল্যে আবেদন বা রূপান্তর করুন। PDF পেলে erationcards.in থেকে PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-nonsub",
    canonical: CANONICAL,
    breadcrumbName: "Non-Subsidised Card Guide",
    howTo: {
      name: "How to get a non-subsidised ration card in West Bengal (Form-10, free)",
      description:
        "Apply for or convert to West Bengal's non-subsidised ration card free using Form-10 on food.wb.gov.in — a valid card with no foodgrain subsidy.",
      totalTime: "PT15M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="Non-Subsidised Ration Card in West Bengal — What It Is & How to Apply (Form-10)"
      intro="A fully valid government card with zero foodgrain subsidy — the clean option for families who don't need the grain."
      bnIntro="খাদ্যশস্যের কোনো ভর্তুকি ছাড়াই একটি পুরোপুরি বৈধ সরকারি কার্ড — যেসব পরিবারের খাদ্যশস্যের দরকার নেই, তাদের জন্য পরিষ্কার একটি বিকল্প।"
      quickAnswer={
        <>
          West Bengal's <strong>non-subsidised ration card</strong> is a valid government card with no foodgrain
          entitlement — used as identity and family-record proof. Apply fresh or convert your existing cards free
          with <strong>Form-10</strong> on <strong>food.wb.gov.in</strong> (E-Citizen section): fill details as per
          Aadhaar, verify with OTP, track the application, then download each member's e-Ration Card PDF.
          erationcards.in prints it on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      bnQuickAnswer={
        <>
          পশ্চিমবঙ্গের <strong>non-subsidised ration card</strong> একটি বৈধ সরকারি কার্ড, তবে এতে খাদ্যশস্যের কোনো
          অধিকার থাকে না — পরিচয়পত্র ও পারিবারিক রেকর্ডের প্রমাণ হিসেবে কাজে লাগে। <strong>food.wb.gov.in</strong>-এর
          E-Citizen অংশে <strong>Form-10</strong> দিয়ে বিনামূল্যে নতুন আবেদন করুন বা চালু কার্ড রূপান্তর করুন:
          আধার অনুযায়ী তথ্য দিন, OTP দিয়ে যাচাই করুন, আবেদন ট্র্যাক করুন, তারপর প্রতি সদস্যের e-Ration Card PDF
          ডাউনলোড করুন। erationcards.in সেটি ওয়াটারপ্রুফ PVC-তে প্রিন্ট করে ₹{PRICING.ration.single.public} (২টি বা
          বেশি হলে প্রতি কার্ড ₹{PRICING.ration.multi.public}), বাড়িতে পৌঁছে দেওয়া হয়।
        </>
      }
      heroAction={
        <div className="text-center">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <a
              href="https://food.wb.gov.in/About_Category.aspx?page_id=70"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-official-non-subsidised"
            >
              Open the official application page
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </a>
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            food.wb.gov.in — Government of West Bengal's official site; applying there is free.{" "}
            <span lang="bn">সরকারি ওয়েবসাইট — আবেদন ফ্রি।</span>
          </p>
        </div>
      }
      related={[
        { href: "/guides/ration-card-types-west-bengal", label: "All WB card types compared (AAY → RKSY-II)" },
        { href: "/guides/surrender-ration-card-west-bengal", label: "Surrendering entirely instead (Form-7)" },
        { href: "/guides/ration-card-category-change-west-bengal", label: "Moving to a subsidised category later (Form-8)" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: get the non-subsidised card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Who typically chooses it</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>Households whose income grew beyond the subsidised categories and who want to give up the grain honestly</li>
          <li>Families that never took ration but want every member on an official family record</li>
          <li>People who need a ration card as supporting ID for other paperwork</li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed">
          Compare it with the subsidised categories in our{" "}
          <Link href="/guides/ration-card-types-west-bengal" className="text-primary hover:underline">
            card types guide
          </Link>{" "}
          before deciding.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Using it as ID? Make it look the part"
        body={`A wallet-size waterproof PVC print beats a folded printout at every counter — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
