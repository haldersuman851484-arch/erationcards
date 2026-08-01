import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";
import { useGuideSchema, GuideSteps, type GuideStep } from "./useGuideSchema";

const CANONICAL = "https://erationcards.in/guides/verify-ration-card-west-bengal";

const STEPS: GuideStep[] = [
  {
    name: "Open the official portal — food.wb.gov.in",
    text: "Go to food.wb.gov.in, the official West Bengal Food & Supplies (Khadya Sathi) website. Checking a card is free and takes about two minutes on any phone.",
    bn: "food.wb.gov.in-এ যান, এটি পশ্চিমবঙ্গ খাদ্য ও সরবরাহ (খাদ্য সাথী)-র সরকারি ওয়েবসাইট। কার্ড চেক করা ফ্রি এবং যেকোনো ফোনে মিনিট দুয়েক লাগে।",
  },
  {
    name: "Find the card status check option",
    text: 'In the "E-Citizen" section, look for the option to check or verify your ration card — usually named "Check the status of your Ration Card". Menu names change occasionally; anything about checking card status is the right place.',
    bn: '"E-Citizen" অংশে রেশন কার্ড চেক বা যাচাই করার অপশনটি খুঁজুন — সাধারণত এর নাম "Check the status of your Ration Card"। মেনুর নাম মাঝে মাঝে বদলায়; কার্ডের স্ট্যাটাস চেক সংক্রান্ত অপশনটিই ঠিক জায়গা।',
  },
  {
    name: "Enter your card number and category",
    text: "Type the ration card number, select the category printed on the card (AAY, PHH, SPHH, RKSY-I or RKSY-II) and complete the captcha.",
    bn: "রেশন কার্ড নম্বরটি লিখুন, কার্ডে ছাপা ক্যাটাগরি (AAY, PHH, SPHH, RKSY-I বা RKSY-II) বেছে নিন এবং captcha পূরণ করুন।",
  },
  {
    name: "Read the result",
    text: "The portal shows whether the card is Active or Deactivated, the holder's name, the category, whether Aadhaar is linked (eKYC done), and the fair-price shop the card is tagged to.",
    bn: "পোর্টাল দেখায় কার্ডটি Active না Deactivated, কার্ডধারীর নাম, ক্যাটাগরি, আধার লিঙ্ক হয়েছে কিনা (eKYC হয়েছে কিনা), এবং কার্ডটি কোন রেশন দোকানের সঙ্গে যুক্ত।",
  },
  {
    name: "If it shows Deactivated, fix it with eKYC",
    text: "A deactivated card is almost always waiting for Aadhaar eKYC. Follow our reactivation guide — the OTP-based linking usually brings the card back to Active after verification.",
    bn: "ডিঅ্যাক্টিভেটেড কার্ড প্রায় সবসময়ই আধার eKYC-র অপেক্ষায় থাকে। আমাদের রিঅ্যাক্টিভেশন গাইড অনুসরণ করুন — OTP-ভিত্তিক লিঙ্ক সাধারণত যাচাইয়ের পর কার্ডটি আবার Active করে দেয়।",
  },
];

export default function VerifyRationCard() {
  const PRICING = usePricing();

  useSeo({
    title: "How to Check if Your Ration Card Is Active in West Bengal (Verify Online, Free)",
    description: `Verify any West Bengal ration card free at food.wb.gov.in in 2 minutes: see Active/Deactivated status, category, Aadhaar-link (eKYC) status and tagged ration shop. If it's active, print it on waterproof PVC from ₹${PRICING.ration.multi.public} per card.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is checking my ration card status free?",
      a: "Yes, completely free on food.wb.gov.in — no login is needed, just the card number and category. Never pay anyone simply to check a card for you.",
      bnQ: "রেশন কার্ডের স্ট্যাটাস চেক করা কি ফ্রি?",
      bnA: "হ্যাঁ, food.wb.gov.in-এ সম্পূর্ণ ফ্রি — কোনো লগইন লাগে না, শুধু কার্ড নম্বর ও ক্যাটাগরি হলেই হয়। শুধু কার্ড চেক করে দেওয়ার জন্য কাউকে কখনও টাকা দেবেন না।",
    },
    {
      q: "Why does my ration card show Deactivated?",
      a: "The most common reason is pending Aadhaar eKYC — the government deactivates cards that haven't been linked with Aadhaar. It can also happen for suspected duplicate cards or long non-use. Completing eKYC reactivates a genuine card; see our reactivation guide.",
      bnQ: "আমার রেশন কার্ড Deactivated দেখাচ্ছে কেন?",
      bnA: "সবচেয়ে সাধারণ কারণ আধার eKYC বাকি থাকা — যেসব কার্ড আধারের সঙ্গে লিঙ্ক হয়নি, সরকার সেগুলো বন্ধ করে দেয়। সন্দেহজনক ডুপ্লিকেট কার্ড বা দীর্ঘদিন ব্যবহার না হওয়ার জন্যও এটা হতে পারে। সঠিক কার্ডের eKYC সেরে ফেললে সেটি আবার চালু হয়; আমাদের রিঅ্যাক্টিভেশন গাইড দেখুন।",
    },
    {
      q: "Can I check cards for my whole family?",
      a: "Yes. In West Bengal every member has an individual card with its own number, so repeat the same check for each member's card number.",
      bnQ: "পুরো পরিবারের কার্ড কি আমি চেক করতে পারি?",
      bnA: "হ্যাঁ। পশ্চিমবঙ্গে প্রত্যেক সদস্যের নিজের নম্বর সহ আলাদা কার্ড থাকে, তাই প্রত্যেক সদস্যের কার্ড নম্বরের জন্য একই চেক আবার করুন।",
    },
    {
      q: "The status page shows my name or details wrong. What now?",
      a: "Correct them free with Form-5 on the official portal — see our ration card correction guide. We can only print the card after the government record itself is fixed.",
      bnQ: "স্ট্যাটাস পেজে আমার নাম বা তথ্য ভুল দেখাচ্ছে। এখন কী করব?",
      bnA: "সরকারি পোর্টালে ফর্ম-৫ দিয়ে ফ্রি-তে সেগুলো সংশোধন করুন — আমাদের রেশন কার্ড সংশোধন গাইড দেখুন। সরকারি রেকর্ড ঠিক হওয়ার পরেই আমরা কার্ডটি প্রিন্ট করতে পারি।",
    },
    {
      q: "My card is Active but the dealer says it isn't working.",
      a: "Ask the dealer to try your Aadhaar fingerprint (e-PoS) once, and check the eKYC column in the status result. If it still fails, contact your local food inspector's office or the toll-free helpline listed on food.wb.gov.in.",
      bnQ: "আমার কার্ড Active, কিন্তু ডিলার বলছেন কাজ করছে না।",
      bnA: "ডিলারকে একবার আপনার আধার আঙুলের ছাপ (e-PoS) দিয়ে চেষ্টা করতে বলুন, আর স্ট্যাটাস ফলাফলে eKYC কলামটি দেখে নিন। তাতেও না হলে স্থানীয় ফুড ইনস্পেক্টরের অফিসে বা food.wb.gov.in-এ দেওয়া টোল-ফ্রি হেল্পলাইনে যোগাযোগ করুন।",
    },
    {
      q: "Does a PVC printed card prove my card is active?",
      a: "No. The PVC card is a durable printed copy of your government-issued card — your entitlements always come from the live government record. That's why it's smart to verify the status once before ordering a print.",
      bnQ: "PVC প্রিন্ট করা কার্ড কি প্রমাণ করে যে আমার কার্ড চালু আছে?",
      bnA: "না। PVC কার্ড হল আপনার সরকার-প্রদত্ত কার্ডের একটি টেকসই প্রিন্ট করা কপি — আপনার প্রাপ্য সবসময় আসে সরকারের লাইভ রেকর্ড থেকে। এই জন্যই প্রিন্ট অর্ডার করার আগে একবার স্ট্যাটাস যাচাই করে নেওয়া বুদ্ধিমানের কাজ।",
    },
    {
      q: "In short — how do I check if my card is active?",
      a: `Go to food.wb.gov.in, open the E-Citizen section, and enter the card number and category to see whether the card is Active or Deactivated — completely free. Card active? erationcards.in prints it on waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "রেশন কার্ড চালু আছে কিনা কীভাবে দেখব?",
      bnA: `food.wb.gov.in-এ গিয়ে E-Citizen অংশে কার্ড নম্বর ও ক্যাটাগরি দিলেই দেখা যায় কার্ডটি Active না Deactivated — সম্পূর্ণ বিনামূল্যে। কার্ড চালু থাকলে erationcards.in থেকে ওয়াটারপ্রুফ PVC প্রিন্ট করাতে পারেন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
    },
  ];

  useGuideSchema({
    idPrefix: "guide-verify",
    canonical: CANONICAL,
    breadcrumbName: "Verify Ration Card Guide",
    howTo: {
      name: "How to verify a West Bengal ration card is active (free, online)",
      description:
        "Check any West Bengal ration card's status free on food.wb.gov.in — Active/Deactivated, category, Aadhaar eKYC status and tagged fair-price shop.",
      totalTime: "PT5M",
      steps: STEPS,
    },
    faqs,
  });

  return (
    <GuideLayout
      title="How to Check if Your West Bengal Ration Card Is Active (Verify Online)"
      intro="A free 2-minute check on food.wb.gov.in shows Active/Deactivated status, category, eKYC status and your tagged ration shop."
      bnIntro="food.wb.gov.in-এ ২ মিনিটের ফ্রি চেকে দেখা যায় কার্ড Active না Deactivated, ক্যাটাগরি, eKYC স্ট্যাটাস এবং যুক্ত রেশন দোকান।"
      quickAnswer={
        <>
          Go to <strong>food.wb.gov.in</strong> (official, free), open the E-Citizen section, choose{" "}
          <strong>"Check the status of your Ration Card"</strong>, and enter the card number and category. The
          result shows Active/Deactivated, the holder's name, whether Aadhaar eKYC is done, and the tagged ration
          shop. A deactivated card can usually be fixed by completing Aadhaar eKYC. Once your card is active,
          erationcards.in can print it on a waterproof PVC card for ₹{PRICING.ration.single.public} (₹
          {PRICING.ration.multi.public} per card for 2 or more), delivered to your door.
        </>
      }
      bnQuickAnswer={
        <>
          <strong>food.wb.gov.in</strong>-এ (সরকারি, ফ্রি) গিয়ে E-Citizen অংশ খুলুন,{" "}
          <strong>"Check the status of your Ration Card"</strong> বেছে নিন, আর কার্ড নম্বর ও ক্যাটাগরি দিন। ফলাফলে
          দেখা যায় কার্ড Active না Deactivated, কার্ডধারীর নাম, আধার eKYC হয়েছে কিনা, এবং যুক্ত রেশন দোকান।
          ডিঅ্যাক্টিভেটেড কার্ড সাধারণত আধার eKYC সেরে ঠিক করা যায়। কার্ড চালু থাকলে erationcards.in সেটি ওয়াটারপ্রুফ
          PVC কার্ডে প্রিন্ট করে ₹{PRICING.ration.single.public}-এ (২টি বা বেশি হলে প্রতি কার্ড ₹
          {PRICING.ration.multi.public}), বাড়িতে পৌঁছে দেওয়া হয়।
        </>
      }
      related={[
        { href: "/guides/reactivate-ration-card-west-bengal", label: "Card deactivated? Reactivate it with Aadhaar eKYC" },
        { href: "/guides/link-aadhaar-ration-card-west-bengal", label: "Link Aadhaar & mobile with your ration card" },
        { href: "/guides/ration-card-types-west-bengal", label: "AAY, PHH, SPHH, RKSY-I & RKSY-II categories explained" },
        { href: "/services", label: "All ration card services — one page" },
      ]}
    >
      <GuideSteps heading="Step-by-step: verify your ration card" steps={STEPS} />

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">How to read the status result</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>
            <strong>Active</strong> — the card is valid. If it's a subsidised category, ration can be drawn from the
            tagged shop as usual.
          </li>
          <li>
            <strong>Deactivated</strong> — usually pending Aadhaar eKYC. Complete the OTP or fingerprint linking and
            the card returns to Active after verification — steps in our{" "}
            <Link href="/guides/reactivate-ration-card-west-bengal" className="text-primary hover:underline">
              reactivation guide
            </Link>
            .
          </li>
          <li>
            <strong>Aadhaar linked / eKYC</strong> — shows whether the member's Aadhaar is seeded. Every member needs
            their own eKYC.
          </li>
          <li>
            <strong>Category</strong> — AAY, PHH, SPHH, RKSY-I or RKSY-II decides your entitlements. Unsure what
            yours means? See the{" "}
            <Link href="/guides/ration-card-types-west-bengal" className="text-primary hover:underline">
              card types guide
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">Don't know your card number?</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Check any old paper card or SMS from the food department, or ask your ration dealer — they can look it up.
          Our{" "}
          <Link href="/guides/lost-ration-card-west-bengal" className="text-primary hover:underline">
            lost ration card guide
          </Link>{" "}
          covers every free way to recover the number.
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Card verified and active? Make it permanent"
        body={`Print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West Bengal districts included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
