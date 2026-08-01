import { Link } from "wouter";
import { ExternalLink } from "lucide-react";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { Button } from "@/components/ui/button";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/update-mobile-number-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: 'Open "Update Mobile Number" in the Instant With Aadhaar services',
    text: 'On the official food.wb.gov.in portal, find the "Instant With Aadhaar" service group and choose "Update Mobile Number". Menu names change occasionally — anything about updating the mobile number on your ration card is the right place.',
    bn: 'সরকারি food.wb.gov.in পোর্টালে "Instant With Aadhaar" পরিষেবার তালিকা থেকে "Update Mobile Number" বেছে নিন। মেনুর নাম মাঝে মাঝে বদলায় — রেশন কার্ডের মোবাইল নম্বর আপডেট সংক্রান্ত অপশনটিই ঠিক জায়গা।',
  },
  {
    name: "Enter your ration card category and card number",
    text: "Select the card category (PHH, SPHH, AAY, RKSY-I or RKSY-II) and type the card number exactly as it appears on the card or the e-Ration Card PDF.",
    bn: "কার্ডের ক্যাটাগরি (PHH, SPHH, AAY, RKSY-I বা RKSY-II) বেছে নিয়ে কার্ডে বা ই-রেশন কার্ড PDF-এ যেমন আছে, ঠিক তেমনভাবে কার্ড নম্বরটি লিখুন।",
  },
  {
    name: "Verify with the OTP sent to your Aadhaar-linked mobile",
    text: "This is why a lost old SIM doesn't block you — the one-time password goes to the mobile number registered with your Aadhaar, not to the old number on the ration card.",
    bn: "পুরনো SIM হারালেও আটকাবেন না — OTP যায় আধারের সঙ্গে যুক্ত মোবাইল নম্বরে, রেশন কার্ডের পুরনো নম্বরে নয়।",
  },
  {
    name: "Enter the new mobile number and submit",
    text: "Type the new number carefully and confirm. Once saved, future OTPs for ration card services — corrections, eKYC, shop change — come to this number.",
    bn: "নতুন নম্বরটি সাবধানে লিখে নিশ্চিত করুন। সেভ হয়ে গেলে রেশন কার্ডের সব পরিষেবার OTP — সংশোধন, eKYC, দোকান বদল — এই নম্বরেই আসবে।",
  },
  {
    name: "No working mobile on Aadhaar either? Fix Aadhaar first",
    text: "If your Aadhaar has no usable mobile, update it at any Aadhaar Seva Kendra, then return and finish this service. Your ration dealer or the local food & supplies office can also help get the card's mobile updated.",
    bn: "আধারেও চালু মোবাইল না থাকলে আগে যেকোনো আধার সেবা কেন্দ্রে গিয়ে আধারের মোবাইল আপডেট করুন, তারপর ফিরে এসে এই কাজটি শেষ করুন। রেশন ডিলার বা স্থানীয় খাদ্য দফতরও সাহায্য করতে পারে।",
  },
  {
    name: "Confirm the change worked",
    text: 'Run the free card status check ("Check the status of your Ration Card") — and the next OTP-based service you use should send its code to the new number.',
    bn: "ফ্রি কার্ড স্ট্যাটাস চেক করে নিন — এরপর যেকোনো OTP-ভিত্তিক পরিষেবা ব্যবহার করলে কোডটি নতুন নম্বরেই আসার কথা।",
  },
];

export default function UpdateMobileNumber() {
  const PRICING = usePricing();

  useSeo({
    title: "Update Mobile Number on Ration Card West Bengal — Instant With Aadhaar OTP (Free)",
    description: `Change the mobile number linked to your West Bengal ration card free on food.wb.gov.in: the "Instant With Aadhaar" service verifies you by Aadhaar OTP, so a lost old SIM is no problem. Steps, fixes when no OTP arrives, and FAQs — then print the card on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is updating the ration card mobile number free?",
      a: "Yes — it is a free government service on food.wb.gov.in, and it works instantly with an Aadhaar OTP. Nobody may charge you for it.",
      bnQ: "রেশন কার্ডের মোবাইল নম্বর আপডেট করা কি ফ্রি?",
      bnA: "হ্যাঁ — এটি food.wb.gov.in-এর একটি ফ্রি সরকারি পরিষেবা, আধার OTP দিয়ে সঙ্গে সঙ্গে কাজ হয়। এর জন্য কেউ টাকা চাইতে পারে না।",
    },
    {
      q: "I lost the SIM that was linked to my ration card. Can I still update?",
      a: "Yes — that is exactly what this service is for. Verification happens through the OTP sent to your Aadhaar-linked mobile, not the old number on the card, so the lost SIM never has to receive anything.",
      bnQ: "রেশন কার্ডের সঙ্গে যুক্ত SIM-টাই হারিয়ে ফেলেছি। তবুও কি আপডেট করা যাবে?",
      bnA: "হ্যাঁ — এই পরিষেবাটি ঠিক এই জন্যই। যাচাই হয় আধারের সঙ্গে যুক্ত মোবাইলে পাঠানো OTP দিয়ে, কার্ডের পুরনো নম্বরে কিছুই পাঠাতে হয় না।",
    },
    {
      q: "Why does the mobile number on the card matter so much?",
      a: "Almost every online ration card service — Form-5 corrections, eKYC, shop change, split and transfer requests — confirms you by OTP to the card's registered mobile. An old or dead number quietly blocks all of them.",
      bnQ: "কার্ডের মোবাইল নম্বরটা এত জরুরি কেন?",
      bnA: "প্রায় সব অনলাইন রেশন কার্ড পরিষেবা — ফর্ম-৫ সংশোধন, eKYC, দোকান বদল, পরিবার ভাগ বা স্থানান্তর — কার্ডের নিবন্ধিত মোবাইলে OTP পাঠিয়ে আপনাকে যাচাই করে। পুরনো বা বন্ধ নম্বর থাকলে সবকটিই আটকে যায়।",
    },
    {
      q: "The Aadhaar OTP never arrives. What now?",
      a: "The OTP goes to the mobile registered with your Aadhaar. If that number is also old or lost, update the mobile on Aadhaar first at any Aadhaar Seva Kendra, then come back. Your ration dealer or the local food & supplies office can also help.",
      bnQ: "আধারের OTP আসছেই না। এখন কী করব?",
      bnA: "OTP যায় আধারে নিবন্ধিত মোবাইলে। সেই নম্বরও পুরনো বা হারানো হলে আগে আধার সেবা কেন্দ্রে গিয়ে আধারের মোবাইল আপডেট করুন, তারপর ফিরে আসুন। রেশন ডিলার বা স্থানীয় খাদ্য দফতরও সাহায্য করতে পারে।",
    },
    {
      q: "Can one mobile number serve the whole family's card?",
      a: "Yes — the ration card carries one contact number for the family, so a working number that any family member keeps is fine. Each member's Aadhaar eKYC is still individual.",
      bnQ: "একটাই মোবাইল নম্বরে কি পুরো পরিবারের কার্ড চলবে?",
      bnA: "হ্যাঁ — রেশন কার্ডে পরিবারের একটিই যোগাযোগ নম্বর থাকে, তাই পরিবারের যে কারও কাছে থাকা চালু নম্বর হলেই হল। তবে প্রত্যেক সদস্যের আধার eKYC আলাদা আলাদা করতে হয়।",
    },
    {
      q: "My number is linked to someone else's ration card. Is that a problem?",
      a: "It can be — you may receive OTPs meant for a stranger's card, and linking your own card can get confusing. The portal's free Delink Mobile Number service removes your number from unknown cards; our delink guide covers it step by step.",
      bnQ: "আমার নম্বর অন্য কারও রেশন কার্ডের সঙ্গে যুক্ত। এটা কি সমস্যার?",
      bnA: "হতে পারে — অচেনা কার্ডের OTP আপনার কাছে আসতে পারে, নিজের কার্ড লিঙ্ক করতেও গোলমাল হয়। পোর্টালের ফ্রি Delink Mobile Number পরিষেবা অজানা কার্ড থেকে আপনার নম্বর সরিয়ে দেয় — আমাদের ডিলিঙ্ক গাইডে ধাপে ধাপে দেখুন।",
    },
    {
      q: "In short — how does the whole update work?",
      a: `On food.wb.gov.in, open "Update Mobile Number" under Instant With Aadhaar, enter your card category and number, confirm the OTP that reaches your Aadhaar-linked mobile, and save the new number — free and instant, no old SIM needed. Card sorted? PVC printing at erationcards.in: ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "রেশন কার্ডের মোবাইল নম্বর কীভাবে আপডেট করব?",
      bnA: `food.wb.gov.in-এ "Instant With Aadhaar" পরিষেবার "Update Mobile Number" অপশনে কার্ডের ক্যাটাগরি ও নম্বর দিন — আধারের মোবাইলে OTP আসবে, দিলেই নতুন নম্বর সেভ হয়ে যাবে। পুরনো SIM হারিয়ে গেলেও সমস্যা নেই, সম্পূর্ণ ফ্রি। কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-update-mobile",
    canonical: CANONICAL,
    breadcrumbName: "Update Mobile Number Guide",
    howTo: {
      name: "How to update the mobile number on a West Bengal ration card (Instant With Aadhaar, free)",
      description:
        "Change the mobile number linked to a WB ration card free on food.wb.gov.in — verified by Aadhaar OTP, so the old SIM is not needed.",
      totalTime: "PT5M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Update the Mobile Number on Your Ration Card in West Bengal"
      intro="Lost the old SIM? The Instant With Aadhaar service changes your card's mobile number in minutes — free, verified by Aadhaar OTP."
      bnIntro="পুরনো SIM হারিয়ে গেছে? Instant With Aadhaar পরিষেবায় কয়েক মিনিটে কার্ডের মোবাইল নম্বর বদলান — ফ্রি, আধার OTP দিয়ে যাচাই।"
      quickAnswer={
        <>
          On <strong>food.wb.gov.in</strong> (official, free), open <strong>"Update Mobile Number"</strong> under the
          Instant With Aadhaar services, enter your ration card category and number, confirm the OTP sent to your{" "}
          <strong>Aadhaar-linked mobile</strong>, and type the new number — it takes effect immediately. The old SIM
          is never needed, which is the whole point. Once your number works again, every OTP-based service
          (corrections, eKYC, shop change) is back within reach. Card sorted? erationcards.in prints it on
          waterproof PVC for ₹{PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per card for 2 or
          more), delivered to your door.
        </>
      }
      bnQuickAnswer={
        <>
          <strong>food.wb.gov.in</strong>-এ (সরকারি, ফ্রি) Instant With Aadhaar পরিষেবার{" "}
          <strong>"Update Mobile Number"</strong> খুলুন, কার্ডের ক্যাটাগরি ও নম্বর দিন, আপনার{" "}
          <strong>আধারের সঙ্গে যুক্ত মোবাইলে</strong> আসা OTP নিশ্চিত করুন, আর নতুন নম্বরটি লিখুন — সঙ্গে সঙ্গেই কার্যকর
          হয়। পুরনো SIM কখনও লাগে না, এটাই এর মূল কথা। নম্বর আবার চালু হলে সব OTP-ভিত্তিক পরিষেবা (সংশোধন, eKYC, দোকান
          বদল) আবার হাতের নাগালে। কার্ড ঠিক থাকলে erationcards.in সেটি ওয়াটারপ্রুফ PVC-তে প্রিন্ট করে ₹
          {PRICING.ration.single.public}-এ (২টি বা বেশি হলে প্রতি কার্ড ₹{PRICING.ration.multi.public}), বাড়িতে পৌঁছে
          দেওয়া হয়।
        </>
      }
      heroAction={
        <div className="text-center">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <a
              href="https://wbpds.wb.gov.in/Mobile_Update_by_Aadhaar.aspx"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-official-mobile-update"
            >
              Open the official mobile update page
              <ExternalLink className="w-4 h-4 ml-1.5" />
            </a>
          </Button>
          <p className="text-xs text-slate-500 mt-2">
            wbpds.wb.gov.in — Government of West Bengal's official site; the mobile number update there is free.{" "}
            <span lang="bn">সরকারি ওয়েবসাইট — মোবাইল নম্বর আপডেট ফ্রি।</span>
          </p>
        </div>
      }
      related={[
        { href: "/guides/delink-mobile-number-ration-card-west-bengal", label: "Your number stuck on an unknown card? Delink it first" },
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "Complete Aadhaar eKYC — the 2-minute OTP linking" },
        { href: "/guides/ration-card-correction-west-bengal", label: "Fix name, DOB or address with a free Form-5 correction" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: update the mobile number" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Why this service exists</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>SIMs change, cards don't.</strong> People lose numbers or switch operators — the card's contact
            number goes stale, and suddenly no OTP-based service works.
          </li>
          <li>
            <strong>Aadhaar breaks the deadlock.</strong> Because verification runs through the Aadhaar-linked
            mobile, you never need the old number to prove it's your card.
          </li>
          <li>
            <strong>It unblocks everything else.</strong> Corrections, eKYC, shop change and family updates all
            confirm you by OTP — a working number is the key to the whole toolbox.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Do this before anything else.</strong> If you're planning a{" "}
          <Link href="/guides/ration-card-correction-west-bengal" className="text-primary hover:underline">
            correction
          </Link>{" "}
          or{" "}
          <Link href="/guides/link-aadhaar-ration-card-west-bengal" className="text-primary hover:underline">
            eKYC
          </Link>
          , update the mobile number first — every later step sends its OTP to this number.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Number updated? Make the card itself as durable"
        body={`Print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West Bengal districts included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
