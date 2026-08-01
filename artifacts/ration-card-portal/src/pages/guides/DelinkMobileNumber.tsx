import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/delink-mobile-number-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: 'Open "Delink Mobile Number" in the Instant With Aadhaar services',
    text: 'On the official food.wb.gov.in portal, find the "Instant With Aadhaar" service group and choose "Delink Mobile Number". Menu names change occasionally — anything about removing your mobile number from an unknown ration card is the right place.',
    bn: 'সরকারি food.wb.gov.in পোর্টালে "Instant With Aadhaar" পরিষেবার তালিকা থেকে "Delink Mobile Number" বেছে নিন। মেনুর নাম মাঝে মাঝে বদলায় — অজানা রেশন কার্ড থেকে আপনার মোবাইল নম্বর সরানো সংক্রান্ত অপশনটিই ঠিক জায়গা।',
  },
  {
    name: "Enter your mobile number",
    text: "This time the OTP comes to your own phone — you are proving you own the number, so no Aadhaar or card details of the stranger are needed.",
    bn: "এবার OTP আসবে আপনার নিজের ফোনে — আপনি প্রমাণ করছেন নম্বরটি আপনার, তাই অচেনা লোকের আধার বা কার্ডের কোনো তথ্য লাগবে না।",
  },
  {
    name: "Verify the OTP",
    text: "Enter the one-time password sent to your mobile. The portal then shows the ration card connection(s) currently recorded against your number.",
    bn: "আপনার মোবাইলে আসা OTP-টি দিন। এরপর পোর্টাল দেখাবে আপনার নম্বরের সঙ্গে বর্তমানে কোন কোন রেশন কার্ড যুক্ত আছে।",
  },
  {
    name: "Confirm the delink for the card that isn't yours",
    text: "Check the card reference shown — if it is not your family's card, confirm the removal. The number is released immediately.",
    bn: "যে কার্ডটি দেখানো হচ্ছে সেটি মিলিয়ে নিন — যদি সেটি আপনার পরিবারের কার্ড না হয়, তবে সরানোর অনুমোদন দিন। নম্বরটি সঙ্গে সঙ্গে মুক্ত হয়ে যাবে।",
  },
  {
    name: "Now link the number to your own card",
    text: "With the number free, add it to your own ration card — the Update Mobile Number service or the Aadhaar eKYC linking both record it, and OTP-based services start working for you.",
    bn: "নম্বরটি মুক্ত হয়ে গেলে এবার নিজের রেশন কার্ডে সেটি যোগ করুন — Update Mobile Number পরিষেবা বা আধার eKYC লিঙ্ক, দুটোতেই নম্বরটি রেকর্ড হয়, আর OTP-ভিত্তিক পরিষেবাগুলো আপনার জন্য কাজ করতে শুরু করে।",
  },
  {
    name: "Still seeing the wrong link? Visit the food office",
    text: "If the connection reappears or the portal can't release it, the local food & supplies office can remove it from their side — carry your Aadhaar and a note of the mobile number.",
    bn: "যদি ভুল সংযোগটি আবার দেখা যায় বা পোর্টাল সেটি মুক্ত করতে না পারে, তবে স্থানীয় খাদ্য ও সরবরাহ দফতর তাদের দিক থেকে সেটি সরিয়ে দিতে পারে — সঙ্গে আধার ও মোবাইল নম্বরটি লিখে নিয়ে যান।",
  },
];

export default function DelinkMobileNumber() {
  const PRICING = usePricing();

  useSeo({
    title: "Delink Mobile Number from Ration Card West Bengal — Remove Your Number from an Unknown Card (Free)",
    description: `Getting ration card SMS or OTPs that aren't yours? Free "Delink Mobile Number" service on food.wb.gov.in removes your mobile from an unknown West Bengal ration card by OTP — then link it to your own card. Steps and FAQs, plus PVC printing from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Why is a stranger's ration card linked to my mobile number at all?",
      a: "Usually a recycled SIM — telecom companies reissue unused numbers, and the previous owner had registered it on their card. Data-entry slips and agents who used one number for many applications cause the rest.",
      bnQ: "অচেনা কারও রেশন কার্ড আমার মোবাইল নম্বরের সঙ্গে যুক্ত হল কী করে?",
      bnA: "সাধারণত রিসাইকেল করা SIM-এর জন্য — টেলিকম কোম্পানি অব্যবহৃত নম্বর আবার নতুন করে বিক্রি করে, আর আগের মালিক সেটি তাঁর কার্ডে নিবন্ধন করে রেখেছিলেন। এছাড়া ডেটা-এন্ট্রির ভুল আর এজেন্টরা একটাই নম্বর অনেকগুলো আবেদনে ব্যবহার করার ফলে বাকিগুলো ঘটে।",
    },
    {
      q: "Is delinking free?",
      a: "Yes — it is a free, instant government service on food.wb.gov.in. You verify by OTP on your own phone and the number is released immediately.",
      bnQ: "ডিলিঙ্ক করা কি ফ্রি?",
      bnA: "হ্যাঁ — এটি food.wb.gov.in-এর একটি ফ্রি, সঙ্গে সঙ্গে হয়ে যাওয়া সরকারি পরিষেবা। আপনি নিজের ফোনে OTP দিয়ে যাচাই করেন, আর নম্বরটি সঙ্গে সঙ্গে মুক্ত হয়ে যায়।",
    },
    {
      q: "Is it risky to leave my number on someone else's card?",
      a: "It's messy in both directions: you receive SMS and OTPs about a card that isn't yours, and the actual card holder can't receive theirs. Delinking cleans this up in a couple of minutes.",
      bnQ: "অন্য কারও কার্ডে আমার নম্বর থেকে গেলে কি ঝুঁকি আছে?",
      bnA: "দুই দিক থেকেই গোলমাল হয়: আপনার কাছে এমন কার্ডের SMS আর OTP আসে যেটা আপনার নয়, আবার আসল কার্ডধারী তাঁর OTP পান না। ডিলিঙ্ক করলে কয়েক মিনিটেই সব পরিষ্কার হয়ে যায়।",
    },
    {
      q: "Will delinking harm the other family's ration card?",
      a: "No — the card itself stays valid and their entitlement is untouched. It simply loses a contact number that was never really theirs; the holder can register their own number any time.",
      bnQ: "ডিলিঙ্ক করলে কি ওই পরিবারের রেশন কার্ডের কোনো ক্ষতি হবে?",
      bnA: "না — কার্ডটি বৈধই থাকে আর তাঁদের প্রাপ্য অটুট থাকে। শুধু এমন একটি যোগাযোগ নম্বর সরে যায় যা আসলে কখনও তাঁদের ছিলই না; ওই কার্ডধারী চাইলে যেকোনো সময় নিজের নম্বর নিবন্ধন করতে পারেন।",
    },
    {
      q: "Do I need my Aadhaar for this?",
      a: "The delink step verifies you by OTP on the mobile number itself. Linking the freed number to your own card afterwards is where Aadhaar OTP comes in — keep it handy for that.",
      bnQ: "এর জন্য কি আমার আধার লাগবে?",
      bnA: "ডিলিঙ্ক ধাপটি আপনাকে মোবাইল নম্বরে পাঠানো OTP দিয়েই যাচাই করে। মুক্ত হওয়া নম্বরটি পরে নিজের কার্ডে যোগ করার সময় আধার OTP লাগে — সেই কাজের জন্য আধারটি হাতের কাছে রাখুন।",
    },
    {
      q: "Can I delink and then use the same number on my own card?",
      a: "Yes — that's the normal sequence: delink from the unknown card, then add the number to your own card with the Update Mobile Number service or during Aadhaar eKYC.",
      bnQ: "ডিলিঙ্ক করে তারপর কি একই নম্বর নিজের কার্ডে ব্যবহার করতে পারি?",
      bnA: "হ্যাঁ — এটাই স্বাভাবিক ধারা: অজানা কার্ড থেকে ডিলিঙ্ক করুন, তারপর Update Mobile Number পরিষেবা দিয়ে বা আধার eKYC-র সময় নম্বরটি নিজের কার্ডে যোগ করুন।",
    },
    {
      q: "In short — how does delinking work?",
      a: `On food.wb.gov.in, open "Delink Mobile Number" under Instant With Aadhaar, enter your mobile number, and confirm the OTP that reaches your own phone — the number is released from the unknown card instantly. Then add it to your own card. It's free. Card sorted? PVC printing at erationcards.in: ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "অজানা রেশন কার্ড থেকে আমার মোবাইল নম্বর কীভাবে ডিলিঙ্ক করব?",
      bnA: `food.wb.gov.in-এ "Instant With Aadhaar" পরিষেবার "Delink Mobile Number" অপশনে আপনার মোবাইল নম্বর দিন — আপনার ফোনে OTP আসবে, দিলেই অজানা কার্ড থেকে নম্বরটি মুক্ত হয়ে যাবে। এরপর নিজের কার্ডে নম্বরটি যোগ করুন। সম্পূর্ণ ফ্রি। কার্ডের PVC প্রিন্ট: একটি ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public} — erationcards.in।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-delink-mobile",
    canonical: CANONICAL,
    breadcrumbName: "Delink Mobile Number Guide",
    howTo: {
      name: "How to delink your mobile number from an unknown West Bengal ration card (free)",
      description:
        "Remove your mobile number from a stranger's ration card free on food.wb.gov.in — OTP-verified on your own phone, instant, then link the number to your own card.",
      totalTime: "PT3M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Delink Your Mobile Number from an Unknown Ration Card (West Bengal)"
      intro="Getting OTPs or SMS for a ration card that isn't yours? Release your number in minutes — free, verified on your own phone."
      bnIntro="আপনার নয় এমন রেশন কার্ডের OTP বা SMS আসছে? কয়েক মিনিটেই নম্বরটি মুক্ত করুন — ফ্রি, নিজের ফোনেই যাচাই।"
      quickAnswer={
        <>
          On <strong>food.wb.gov.in</strong> (official, free), open <strong>"Delink Mobile Number"</strong> under the
          Instant With Aadhaar services, enter your mobile number, and confirm the OTP that arrives on{" "}
          <strong>your own phone</strong> — the portal releases the number from the unknown ration card instantly.
          Then add the freed number to your own card with the Update Mobile Number service or during Aadhaar eKYC.
          This usually happens because a recycled SIM's previous owner registered it. Card set up properly?
          erationcards.in prints it on waterproof PVC for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      related={[
        { href: "/guides/update-mobile-number-ration-card-west-bengal", label: "Next step: put the number on your own card" },
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "Aadhaar eKYC — link Aadhaar & mobile in 2 minutes" },
        { href: "/guides/verify-ration-card-west-bengal", label: "Check what's recorded on your own card" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: delink your number" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">How your number ends up on a stranger's card</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Recycled SIMs.</strong> Operators reissue numbers that sat unused — the previous owner's ration
            card link travels with the number, not the person.
          </li>
          <li>
            <strong>Typing mistakes.</strong> One digit off during someone else's registration and their card lands
            on your number.
          </li>
          <li>
            <strong>Agent shortcuts.</strong> Some cyber-café agents registered their own number on dozens of
            customers' cards — those customers now can't receive their OTPs either.
          </li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>Finish the job.</strong> Delinking only frees the number — your own card still needs it. Follow up
          with the{" "}
          <Link href="/guides/update-mobile-number-ration-card-west-bengal" className="text-primary hover:underline">
            Update Mobile Number
          </Link>{" "}
          service, and complete{" "}
          <Link href="/guides/link-aadhaar-ration-card-west-bengal" className="text-primary hover:underline">
            Aadhaar eKYC
          </Link>{" "}
          if any member is still unlinked.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Number sorted? Carry a card that lasts"
        body={`Print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West Bengal districts included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
