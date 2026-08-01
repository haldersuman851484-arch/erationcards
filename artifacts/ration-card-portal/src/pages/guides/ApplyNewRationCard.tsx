import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { Button } from "@/components/ui/button";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/apply-new-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Pick the right form — Form-3 or Form-4",
    text: "Form-3 is for a family that has no ration card at all. Form-4 adds a new member — a newborn, or someone who never had a card — to an existing family card. (Someone who already has a card and is joining your family, like a bride, moves with Form-14 instead.)",
    bn: "যে পরিবারের কোনো রেশন কার্ডই নেই তাদের জন্য ফর্ম-৩। ফর্ম-৪ দিয়ে একটি পুরনো পরিবার কার্ডে নতুন সদস্য — নবজাতক, বা যার কখনও কার্ড ছিল না — যোগ করা হয়। (যার আগে থেকেই কার্ড আছে এবং আপনার পরিবারে আসছেন, যেমন নববধূ, তিনি বরং ফর্ম-১৪ দিয়ে আসেন।)",
  },
  {
    name: "Open the official portal — food.wb.gov.in",
    text: 'Go to food.wb.gov.in, the official West Bengal Food & Supplies (Khadya Sathi) website, and open the "E-Citizen" section. Applying is free — online, or on paper at your ration dealer, food inspector or BDO office.',
    bn: 'পশ্চিমবঙ্গ খাদ্য ও সরবরাহ (খাদ্য সাথী) দফতরের সরকারি ওয়েবসাইট food.wb.gov.in-এ যান এবং "E-Citizen" বিভাগটি খুলুন। আবেদন করা ফ্রি — অনলাইনে, অথবা কাগজে আপনার রেশন ডিলার, খাদ্য পরিদর্শক বা BDO অফিসে।',
  },
  {
    name: "Fill in the family and member details",
    text: "Enter names, dates of birth and Aadhaar numbers exactly as they appear on Aadhaar. For Form-4 you also enter the existing family card number the new member joins.",
    bn: "আধারে যেমন আছে ঠিক তেমনভাবে নাম, জন্মতারিখ ও আধার নম্বর লিখুন। ফর্ম-৪-এর ক্ষেত্রে নতুন সদস্য যে পুরনো পরিবার কার্ডে যোগ হচ্ছেন সেই কার্ড নম্বরটিও দিতে হবে।",
  },
  {
    name: "Upload the documents",
    text: "Aadhaar for each applicant is the key document. For a newborn, upload the birth certificate (Aadhaar can follow later). Keep an address proof handy for new-family applications.",
    bn: "প্রত্যেক আবেদনকারীর আধারই মূল নথি। নবজাতকের ক্ষেত্রে জন্ম সার্টিফিকেট আপলোড করুন (আধার পরে করা যায়)। নতুন পরিবারের আবেদনের জন্য একটি ঠিকানার প্রমাণ হাতে রাখুন।",
  },
  {
    name: "Verify with OTP and submit",
    text: "Confirm the application with the OTP sent to your mobile number and submit. Save the acknowledgement / application number that appears.",
    bn: "আপনার মোবাইল নম্বরে পাঠানো OTP দিয়ে আবেদনটি নিশ্চিত করে জমা দিন। যে অ্যাকনলেজমেন্ট / অ্যাপ্লিকেশন নম্বরটি দেখাবে সেটি সেভ করে রাখুন।",
  },
  {
    name: "Track the application",
    text: 'Use the "know the status of your application" option on the portal with your application number. The food inspector may verify details before approval.',
    bn: 'পোর্টালের "know the status of your application" অপশনে আপনার অ্যাপ্লিকেশন নম্বর দিয়ে ট্র্যাক করুন। অনুমোদনের আগে খাদ্য পরিদর্শক তথ্য যাচাই করতে পারেন।',
  },
  {
    name: "After approval, download each member's e-Ration Card",
    text: "Every approved member gets their own digital ration card. Download one PDF per member from the portal — see our download guide for the exact steps.",
    bn: "অনুমোদিত প্রত্যেক সদস্য নিজস্ব ডিজিটাল রেশন কার্ড পান। পোর্টাল থেকে প্রতি সদস্যের জন্য একটি করে PDF ডাউনলোড করুন — সঠিক ধাপগুলির জন্য আমাদের ডাউনলোড গাইড দেখুন।",
  },
];

export default function ApplyNewRationCard() {
  const PRICING = usePricing();

  useSeo({
    title: "How to Apply for a New Ration Card in West Bengal (Form-3 & Form-4) — Free, Online",
    description: `Apply for a new West Bengal ration card free at food.wb.gov.in: Form-3 for a family with no card, Form-4 to add a newborn or new member. Documents, OTP steps and tracking explained. Print approved cards on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is applying for a ration card free in West Bengal?",
      a: "Yes. Form-3 and Form-4 applications are free on food.wb.gov.in and at government offices. You never need to pay an agent — the process is designed to be done yourself.",
      bnQ: "পশ্চিমবঙ্গে রেশন কার্ডের জন্য আবেদন করা কি ফ্রি?",
      bnA: "হ্যাঁ। food.wb.gov.in-এ এবং সরকারি অফিসে ফর্ম-৩ ও ফর্ম-৪-এর আবেদন ফ্রি। কোনো এজেন্টকে টাকা দেওয়ার দরকার নেই — প্রক্রিয়াটি নিজে করার মতো করেই তৈরি।",
    },
    {
      q: "How long until the new card is issued?",
      a: "It varies — straightforward applications are often approved in a few weeks after the food inspector's verification. Track your application number on the portal to see the stage it's at.",
      bnQ: "নতুন কার্ড পেতে কত সময় লাগে?",
      bnA: "এটা নির্ভর করে — খাদ্য পরিদর্শকের যাচাইয়ের পর সহজ আবেদনগুলি প্রায়ই কয়েক সপ্তাহের মধ্যে অনুমোদিত হয়। কোন পর্যায়ে আছে দেখতে পোর্টালে আপনার অ্যাপ্লিকেশন নম্বর দিয়ে ট্র্যাক করুন।",
    },
    {
      q: "My baby doesn't have Aadhaar yet. Can I still apply?",
      a: "Yes. Use the birth certificate for a newborn's Form-4 application. Link the child's Aadhaar later once it's made — the portal and ration shops handle Aadhaar seeding as a separate free step.",
      bnQ: "আমার শিশুর এখনও আধার নেই। তবুও কি আবেদন করা যাবে?",
      bnA: "হ্যাঁ। নবজাতকের ফর্ম-৪ আবেদনে জন্ম সার্টিফিকেট ব্যবহার করুন। আধার তৈরি হয়ে গেলে পরে শিশুর আধার যুক্ত করুন — পোর্টাল ও রেশন দোকান আধার সিডিং একটি আলাদা ফ্রি ধাপ হিসেবে করে দেয়।",
    },
    {
      q: "Which category will my new card get — PHH, RKSY-I or something else?",
      a: "The government decides based on eligibility rules: NFSA categories (AAY, PHH, SPHH) for priority households, and the state's RKSY-I / RKSY-II for others. You can't simply choose a subsidised category — see our card types guide for what each one means.",
      bnQ: "আমার নতুন কার্ড কোন ক্যাটাগরির হবে — PHH, RKSY-I নাকি অন্য কিছু?",
      bnA: "সরকার যোগ্যতার নিয়ম অনুযায়ী ঠিক করে: অগ্রাধিকারভুক্ত পরিবারের জন্য NFSA ক্যাটাগরি (AAY, PHH, SPHH), আর বাকিদের জন্য রাজ্যের RKSY-I / RKSY-II। ভর্তুকিযুক্ত ক্যাটাগরি আপনি এমনি বেছে নিতে পারবেন না — প্রতিটির অর্থ কী তা জানতে আমাদের কার্ডের ধরন গাইড দেখুন।",
    },
    {
      q: "My wife already has a card in her parents' family. Form-4?",
      a: "No — that's a member transfer. Use Form-14 to shift a person who already holds a card into another existing family (very common after marriage). Our member transfer guide covers it step by step.",
      bnQ: "আমার স্ত্রীর বাবার পরিবারে আগে থেকেই কার্ড আছে। ফর্ম-৪?",
      bnA: "না — এটি একটি সদস্য স্থানান্তর। যার আগে থেকেই কার্ড আছে তাকে অন্য একটি পুরনো পরিবারে সরাতে ফর্ম-১৪ ব্যবহার করুন (বিয়ের পর খুবই সাধারণ)। আমাদের সদস্য স্থানান্তর গাইডে ধাপে ধাপে দেওয়া আছে।",
    },
    {
      q: "We don't want subsidised grain — just the card as ID proof.",
      a: "West Bengal offers a non-subsidised ration card for exactly that (Form-10). It works as identity/record proof without foodgrain entitlements — see our non-subsidised card guide.",
      bnQ: "আমরা ভর্তুকির খাদ্যশস্য চাই না — শুধু পরিচয়পত্র হিসেবে কার্ডটি চাই।",
      bnA: "পশ্চিমবঙ্গে ঠিক এর জন্যই একটি নন-সাবসিডাইজড রেশন কার্ড আছে (ফর্ম-১০)। এটি খাদ্যশস্যের সুবিধা ছাড়াই পরিচয়/রেকর্ডের প্রমাণ হিসেবে কাজ করে — আমাদের নন-সাবসিডাইজড কার্ড গাইড দেখুন।",
    },
    {
      q: "In short, how do I apply for a new ration card?",
      a: "Apply free on food.wb.gov.in — Form-3 if the family has no card, Form-4 to add a newborn or new member. It needs Aadhaar and an OTP, no agent. Once the card is approved, download the PDF; you can then get a PVC print from erationcards.in.",
      bnQ: "নতুন রেশন কার্ডের জন্য কীভাবে আবেদন করব?",
      bnA: `food.wb.gov.in-এ বিনামূল্যে আবেদন করুন — পরিবারের কোনো কার্ড না থাকলে Form-3, আর নবজাতক বা নতুন সদস্য যোগ করতে Form-4। Aadhaar আর OTP লাগে, এজেন্ট লাগে না। কার্ড অনুমোদন হলে PDF ডাউনলোড করে erationcards.in থেকে PVC প্রিন্ট করাতে পারেন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-apply-new",
    canonical: CANONICAL,
    breadcrumbName: "Apply for New Ration Card Guide",
    howTo: {
      name: "How to apply for a new ration card in West Bengal (Form-3 / Form-4, free)",
      description:
        "Apply free on food.wb.gov.in — Form-3 for a family with no ration card, Form-4 to add a newborn or new member to an existing family card.",
      totalTime: "PT20M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Apply for a New Ration Card in West Bengal (Form-3 & Form-4)"
      intro="Free application on food.wb.gov.in — Form-3 for a brand-new family card, Form-4 to add a newborn or new member."
      bnIntro="food.wb.gov.in-এ বিনামূল্যে আবেদন — একেবারে নতুন পরিবার কার্ডের জন্য ফর্ম-৩, নবজাতক বা নতুন সদস্য যোগ করতে ফর্ম-৪।"
      quickAnswer={
        <>
          Apply free on <strong>food.wb.gov.in</strong> (E-Citizen section): choose <strong>Form-3</strong> if your
          family has no ration card, or <strong>Form-4</strong> to add a newborn or first-time member to an existing
          family card. Fill details exactly as per Aadhaar, upload documents, verify with OTP and track the
          application number until approval. Each approved member then gets their own e-Ration Card PDF —
          erationcards.in can print each one on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      bnQuickAnswer={
        <>
          <strong>food.wb.gov.in</strong>-এ (E-Citizen বিভাগে) বিনামূল্যে আবেদন করুন: পরিবারের কোনো রেশন কার্ড না থাকলে{" "}
          <strong>Form-3</strong>, আর নবজাতক বা প্রথমবারের সদস্য পুরনো পরিবার কার্ডে যোগ করতে <strong>Form-4</strong>।
          Aadhaar অনুযায়ী হুবহু তথ্য দিন, নথি আপলোড করুন, OTP দিয়ে যাচাই করুন এবং অনুমোদন না হওয়া পর্যন্ত অ্যাপ্লিকেশন নম্বর
          দিয়ে ট্র্যাক করুন। অনুমোদিত প্রত্যেক সদস্য নিজস্ব e-Ration Card PDF পান — erationcards.in সেটি ওয়াটারপ্রুফ PVC-তে
          প্রিন্ট করে বাড়িতে পৌঁছে দেয়, একটি কার্ড ₹{PRICING.ration.single.public} (২টি বা বেশি হলে প্রতি কার্ড ₹
          {PRICING.ration.multi.public})।
        </>
      }
      heroAction={
        <div className="text-center">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <a
              href="https://wbpds.wb.gov.in/rcmsnew/AadhaarAuthenticationLogin/Index"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-official-apply"
            >
              Open the official application page
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </a>
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            wbpds.wb.gov.in — Government of West Bengal's official site; applying there is free.{" "}
            <span lang="bn">সরকারি ওয়েবসাইট — আবেদন ফ্রি।</span>
          </p>
        </div>
      }
      related={[
        { href: "/guides/ration-card-member-transfer-west-bengal", label: "Moving an existing card holder into your family (Form-14)" },
        { href: "/guides/ration-card-types-west-bengal", label: "AAY, PHH, SPHH, RKSY-I & RKSY-II — which category means what" },
        { href: "/guides/download-e-ration-card", label: "Download the e-Ration Card PDF after approval" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: apply for a new ration card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Form-3 vs Form-4 vs Form-14 — pick correctly</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Form-3:</strong> whole family has no ration card — creates a new family record with cards for
            every member.
          </li>
          <li>
            <strong>Form-4:</strong> family already has cards; adds a member who has never held one (newborns are the
            classic case).
          </li>
          <li>
            <strong>Form-14:</strong> the person already has a card in another family and is joining yours (marriage,
            adoption) — that's a{" "}
            <Link href="/guides/ration-card-member-transfer-west-bengal" className="text-primary hover:underline">
              member transfer
            </Link>
            , not a new application.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Match Aadhaar from day one.</strong> Names and dates of birth that match Aadhaar sail through
          verification; mismatches are the most common reason applications stall and later need a Form-5 correction.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Documents checklist</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>Aadhaar card of every person being added (or birth certificate for a newborn)</li>
          <li>Existing family ration card number (for Form-4)</li>
          <li>Address proof for a new family application (electricity bill, bank passbook, rent agreement)</li>
          <li>A mobile number that can receive the OTP</li>
        </ul>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="New cards approved? Print them once, keep them for years"
        body={`Download each member's e-Ration Card PDF and we'll print them on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across West Bengal included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
