import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/link-aadhaar-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Check whether eKYC is already done",
    text: 'On food.wb.gov.in, use the card status check ("Check the status of your Ration Card") — the result shows whether each member\'s Aadhaar is linked. Only members showing not-linked need to act.',
    bn: 'food.wb.gov.in-এ কার্ড স্ট্যাটাস চেক ("Check the status of your Ration Card") করে দেখে নিন — ফলাফলে বোঝা যায় প্রত্যেক সদস্যের আধার লিঙ্ক হয়েছে কিনা। যাদের লিঙ্ক হয়নি বলে দেখাচ্ছে, শুধু তাদের জন্যই কাজটি করতে হবে।',
  },
  {
    name: "Open the Aadhaar linking option",
    text: 'In the "E-Citizen" section, look for "Link Aadhaar with Ration Card" (sometimes shown as eKYC). Menu names change occasionally — anything about linking Aadhaar and mobile with your ration card is the right place.',
    bn: '"E-Citizen" অংশে "Link Aadhaar with Ration Card" অপশনটি খুঁজুন (মাঝে মাঝে eKYC নামেও দেখানো হয়)। মেনুর নাম মাঝে মাঝে বদলায় — রেশন কার্ডের সঙ্গে আধার ও মোবাইল লিঙ্ক করা সংক্রান্ত অপশনটিই ঠিক জায়গা।',
  },
  {
    name: "Enter the ration card number and Aadhaar number",
    text: "Do this per member — each family member's card is linked individually with their own Aadhaar.",
    bn: "প্রত্যেক সদস্যের জন্য আলাদা করে এটি করুন — পরিবারের প্রতিটি সদস্যের কার্ড তাঁর নিজের আধার দিয়ে আলাদাভাবে লিঙ্ক হয়।",
  },
  {
    name: "Verify with the OTP sent to the Aadhaar-linked mobile",
    text: "The one-time password goes to the mobile number registered with that Aadhaar. Entering it completes the eKYC and also records the mobile number against the ration card.",
    bn: "OTP যায় সেই আধারের সঙ্গে নিবন্ধিত মোবাইল নম্বরে। সেটি দিলেই eKYC সম্পূর্ণ হয়, আর মোবাইল নম্বরটিও রেশন কার্ডের সঙ্গে রেকর্ড হয়ে যায়।",
  },
  {
    name: "No OTP possible? Use the ration shop's fingerprint machine",
    text: "If the Aadhaar has no linked mobile (or the number is lost), visit your ration dealer — the e-PoS machine links Aadhaar with a fingerprint scan, free. Updating the mobile on Aadhaar at an Aadhaar centre also restores the OTP route.",
    bn: "আধারের সঙ্গে কোনো মোবাইল যুক্ত না থাকলে (বা নম্বরটি হারিয়ে গেলে) আপনার রেশন ডিলারের কাছে যান — e-PoS মেশিনে আঙুলের ছাপ দিয়ে আধার লিঙ্ক হয়, ফ্রি-তে। আধার কেন্দ্রে গিয়ে আধারের মোবাইল আপডেট করলেও OTP-র রাস্তা আবার খুলে যায়।",
  },
  {
    name: "Re-check the status after a few days",
    text: "Run the card status check again — the member should show Aadhaar-linked, and a card deactivated for pending eKYC returns to Active after verification.",
    bn: "কয়েক দিন পর আবার কার্ড স্ট্যাটাস চেক করুন — সদস্যটির ক্ষেত্রে আধার-লিঙ্ক দেখানোর কথা, আর eKYC বাকি থাকায় বন্ধ হওয়া কার্ড যাচাইয়ের পর আবার Active হয়ে যায়।",
  },
];

export default function LinkAadhaarEkyc() {
  const PRICING = usePricing();

  useSeo({
    title: "Link Aadhaar & Mobile with Ration Card West Bengal — eKYC Online by OTP (Free)",
    description: `Complete ration card eKYC in West Bengal free: link Aadhaar and mobile on food.wb.gov.in with an OTP, or by fingerprint at your ration shop. Every member needs it — pending eKYC gets cards deactivated. Then print on PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is ration card eKYC free?",
      a: "Yes — linking Aadhaar and mobile with your ration card is completely free, both online at food.wb.gov.in and at the ration shop's e-PoS machine. Nobody may charge for it.",
      bnQ: "রেশন কার্ডের eKYC কি ফ্রি?",
      bnA: "হ্যাঁ — রেশন কার্ডের সঙ্গে আধার ও মোবাইল লিঙ্ক করা সম্পূর্ণ ফ্রি, food.wb.gov.in-এ অনলাইনে হোক বা রেশন দোকানের e-PoS মেশিনে হোক। এর জন্য কেউ টাকা চাইতে পারে না।",
    },
    {
      q: "Why is eKYC required at all?",
      a: "Aadhaar linking confirms each member is a real, unique person — it removes duplicate/ghost cards and enables benefits like drawing ration from any shop (ONORC portability). Cards left unlinked eventually get deactivated.",
      bnQ: "eKYC আসলে কেন দরকার?",
      bnA: "আধার লিঙ্ক নিশ্চিত করে প্রত্যেক সদস্য সত্যিকারের ও আলাদা একজন মানুষ — এতে ডুপ্লিকেট বা ভুয়ো কার্ড বাদ যায়, আর যেকোনো দোকান থেকে রেশন তোলার (ONORC পোর্টেবিলিটি) মতো সুবিধা মেলে। লিঙ্ক না-করা কার্ড শেষমেশ বন্ধ হয়ে যায়।",
    },
    {
      q: "Does every family member need their own eKYC?",
      a: "Yes. Each member's card is linked with their own Aadhaar individually — doing it for the head of family alone is not enough.",
      bnQ: "পরিবারের প্রত্যেক সদস্যের কি আলাদা eKYC লাগে?",
      bnA: "হ্যাঁ। প্রত্যেক সদস্যের কার্ড তাঁর নিজের আধার দিয়ে আলাদাভাবে লিঙ্ক হয় — শুধু পরিবারের কর্তার জন্য করলেই যথেষ্ট নয়।",
    },
    {
      q: "Is there a deadline?",
      a: "The government announces eKYC deadlines periodically and has extended them several times. Don't gamble on extensions — the OTP linking takes two minutes, and a card deactivated for pending eKYC means missed ration until it's fixed.",
      bnQ: "eKYC-র কি কোনো শেষ তারিখ আছে?",
      bnA: "সরকার সময়ে সময়ে eKYC-র শেষ তারিখ ঘোষণা করে এবং কয়েকবার সেটি বাড়িয়েছে। মেয়াদ বাড়ানোর ভরসায় থাকবেন না — OTP লিঙ্ক করতে দু-মিনিট লাগে, আর eKYC বাকি থাকায় কার্ড বন্ধ হলে যতদিন না ঠিক হচ্ছে ততদিন রেশন বন্ধ থাকে।",
    },
    {
      q: "The OTP never arrives. What's wrong?",
      a: "The OTP goes to the mobile number registered with that person's Aadhaar — not any number you type. If that number is old or lost, either update the mobile at an Aadhaar Seva Kendra first, or skip OTP entirely and link by fingerprint at your ration dealer's e-PoS machine.",
      bnQ: "OTP আসছেই না। সমস্যাটা কোথায়?",
      bnA: "OTP যায় সেই ব্যক্তির আধারে নিবন্ধিত মোবাইল নম্বরে — আপনি যে নম্বরই লিখুন না কেন। সেই নম্বর পুরনো বা হারানো হলে হয় আগে আধার সেবা কেন্দ্রে গিয়ে মোবাইল আপডেট করুন, নয়তো OTP বাদ দিয়ে রেশন ডিলারের e-PoS মেশিনে আঙুলের ছাপ দিয়ে লিঙ্ক করুন।",
    },
    {
      q: "My card is already deactivated because eKYC was pending.",
      a: "Complete the linking now — the portal has a dedicated flow for deactivated cards, and the card returns to Active after verification. Our reactivation guide covers it step by step.",
      bnQ: "eKYC বাকি থাকায় আমার কার্ড আগেই ডিঅ্যাক্টিভেট হয়ে গেছে।",
      bnA: "এখনই লিঙ্কটি সেরে ফেলুন — পোর্টালে বন্ধ হয়ে যাওয়া কার্ডের জন্য আলাদা ব্যবস্থা আছে, আর যাচাইয়ের পর কার্ড আবার Active হয়ে যায়। আমাদের রিঅ্যাক্টিভেশন গাইডে ধাপে ধাপে দেখানো আছে।",
    },
    {
      q: "In short — how does eKYC work?",
      a: `On food.wb.gov.in, open "Link Aadhaar with Ration Card", enter the card number and Aadhaar number, and confirm the OTP sent to the Aadhaar-linked mobile — that completes the eKYC. No mobile? The ration shop's machine links it by fingerprint, free. Every member needs their own eKYC. Card sorted? PVC printing at erationcards.in: ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "রেশন কার্ডের সাথে আধার লিঙ্ক করব কীভাবে?",
      bnA: `food.wb.gov.in-এ "Link Aadhaar with Ration Card" অপশনে কার্ড নম্বর ও আধার নম্বর দিন — আধারের মোবাইলে OTP আসবে, দিলেই eKYC শেষ। মোবাইল না থাকলে রেশন দোকানের মেশিনে আঙুলের ছাপ দিয়ে ফ্রি-তে হয়। প্রতিটি সদস্যের আলাদা eKYC লাগে। কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-ekyc",
    canonical: CANONICAL,
    breadcrumbName: "Aadhaar eKYC Guide",
    howTo: {
      name: "How to link Aadhaar & mobile with a West Bengal ration card (eKYC, free)",
      description:
        "Complete ration card eKYC free in West Bengal — link Aadhaar by OTP on food.wb.gov.in or by fingerprint at the ration shop's e-PoS machine.",
      totalTime: "PT5M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Link Aadhaar & Mobile with Your Ration Card in West Bengal (eKYC)"
      intro="The 2-minute OTP linking on food.wb.gov.in that keeps your card active — free, per member, no agent needed."
      bnIntro="food.wb.gov.in-এ ২ মিনিটের OTP লিঙ্ক, যা আপনার কার্ড চালু রাখে — ফ্রি, প্রত্যেক সদস্যের জন্য, কোনো এজেন্ট লাগে না।"
      quickAnswer={
        <>
          On <strong>food.wb.gov.in</strong> (official, free), open{" "}
          <strong>"Link Aadhaar with Ration Card"</strong> in the E-Citizen section, enter the ration card number
          and Aadhaar number, and confirm with the OTP sent to the Aadhaar-linked mobile — that completes eKYC and
          records your mobile against the card. No OTP possible? The ration shop's e-PoS machine links by
          fingerprint, free. Every member needs their own eKYC; unlinked cards eventually get deactivated. Card
          linked and active? erationcards.in prints it on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      bnQuickAnswer={
        <>
          <strong>food.wb.gov.in</strong>-এ (সরকারি, ফ্রি) E-Citizen অংশে{" "}
          <strong>"Link Aadhaar with Ration Card"</strong> খুলুন, রেশন কার্ড নম্বর ও আধার নম্বর দিন, আর আধারের
          সঙ্গে যুক্ত মোবাইলে আসা OTP দিয়ে নিশ্চিত করুন — এতেই eKYC শেষ হয় এবং মোবাইল নম্বরটি কার্ডের সঙ্গে রেকর্ড
          হয়। OTP না এলে রেশন দোকানের e-PoS মেশিনে আঙুলের ছাপ দিয়ে ফ্রি-তে লিঙ্ক হয়। প্রত্যেক সদস্যের আলাদা eKYC
          লাগে; লিঙ্ক না-করা কার্ড শেষমেশ বন্ধ হয়ে যায়। কার্ড লিঙ্ক ও চালু? erationcards.in সেটি ওয়াটারপ্রুফ
          PVC-তে প্রিন্ট করে — একটি ₹{PRICING.ration.single.public} (২টি বা বেশি হলে প্রতি কার্ড ₹
          {PRICING.ration.multi.public}), বাড়িতে পৌঁছে দেওয়া হয়।
        </>
      }
      related={[
        { href: "/guides/reactivate-ration-card-west-bengal", label: "Card already deactivated? Reactivate it with eKYC" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check each member's eKYC status" },
        { href: "/guides/ration-card-correction-west-bengal", label: "Name mismatch with Aadhaar? Fix it with Form-5" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: complete your eKYC" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">What eKYC unlocks</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Keeps the card active</strong> — pending eKYC is the number-one reason WB cards get deactivated.
          </li>
          <li>
            <strong>Any-shop portability (ONORC)</strong> — draw your entitlement at other fair-price shops by
            fingerprint, useful for work migration.
          </li>
          <li>
            <strong>Smooth corrections and transfers</strong> — OTP-based services like Form-5 corrections work best
            when Aadhaar and mobile are already linked.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Name mismatch warning.</strong> If the name on the card and on Aadhaar differ (spelling, surname),
          the linking can fail — fix the card first with a free{" "}
          <Link href="/guides/ration-card-correction-west-bengal" className="text-primary hover:underline">
            Form-5 correction
          </Link>
          , then complete eKYC.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="eKYC done? Carry the card that always works"
        body={`Print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West Bengal districts included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
