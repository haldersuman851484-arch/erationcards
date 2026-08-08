import { Link } from "wouter";
import { useSeo } from "@/hooks/use-seo";
import { useJsonLd } from "@/lib/jsonld";
import { usePricing } from "@/hooks/use-pricing";
import { GuideLayout, GuideFaqList, GuideCta, GuideDisclaimer, type GuideFaq } from "./GuideLayout";

const CANONICAL = "https://erationcards.in/guides/download-e-ration-card";

const STEPS = [
  {
    name: "Open the official portal — food.wb.gov.in",
    text: "Go to food.wb.gov.in, the official website of the West Bengal Department of Food & Supplies (Khadya Sathi). It works in any browser on a phone or computer. The same service is also reachable via wbpds.wb.gov.in.",
    bn: "food.wb.gov.in-এ যান, এটি পশ্চিমবঙ্গ খাদ্য ও সরবরাহ দফতরের (খাদ্য সাথী) সরকারি ওয়েবসাইট। ফোন বা কম্পিউটারের যেকোনো ব্রাউজারে এটি চলে। একই পরিষেবা wbpds.wb.gov.in থেকেও পাওয়া যায়।",
  },
  {
    name: "Find the e-Ration Card download option",
    text: 'Look for the "E-Citizen" section and choose the option to view or download your e-Ration Card (often shown as "e-RC"). Menu names change from time to time — anything named "e-Ration Card" or "e-RC download" is the right place.',
    bn: '"E-Citizen" বিভাগটি খুঁজে নিয়ে আপনার ই-রেশন কার্ড দেখা বা ডাউনলোড করার অপশনটি বেছে নিন (প্রায়ই "e-RC" নামে দেখানো হয়)। মেনুর নাম মাঝে মাঝে বদলায় — "e-Ration Card" বা "e-RC download" নামের যেকোনো অপশনই ঠিক জায়গা।',
  },
  {
    name: "Enter your ration card number and category",
    text: "Type your ration card number, select the card type printed on your card (AAY, PHH, SPHH, RKSY-I or RKSY-II) and complete the captcha check.",
    bn: "আপনার রেশন কার্ড নম্বর লিখুন, কার্ডে ছাপা ক্যাটাগরি (AAY, PHH, SPHH, RKSY-I বা RKSY-II) বেছে নিন এবং ক্যাপচা যাচাইটি সম্পূর্ণ করুন।",
  },
  {
    name: "View and save the PDF",
    text: "Your e-Ration Card opens as a PDF. Save it to your phone or email it to yourself. You need the PDF file itself (not a photo or screenshot) if you want a PVC print later.",
    bn: "আপনার ই-রেশন কার্ড একটি PDF হিসেবে খুলবে। এটি ফোনে সেভ করুন বা নিজের কাছে ইমেল করে রাখুন। পরে PVC প্রিন্ট করাতে চাইলে PDF ফাইলটিই লাগবে (ছবি বা স্ক্রিনশট নয়)।",
  },
  {
    name: "Repeat for each family member",
    text: "Every family member has their own e-Ration Card with their own card number, so download one PDF per member.",
    bn: "পরিবারের প্রত্যেক সদস্যের নিজস্ব কার্ড নম্বর সহ আলাদা ই-রেশন কার্ড থাকে, তাই প্রতি সদস্যের জন্য একটি করে PDF ডাউনলোড করুন।",
  },
];

export default function DownloadERationCard() {
  const PRICING = usePricing();

  useSeo({
    title: "How to Download e-Ration Card PDF West Bengal (Free) | Step-by-Step Guide",
    description: `Download your West Bengal e-Ration Card PDF free from food.wb.gov.in in 5 steps — no fee, no agent, works on any phone. Then get it printed on a waterproof PVC card from ₹${PRICING.ration.multi.public}.`,
    canonical: CANONICAL,
  });

  const faqs: GuideFaq[] = [
    {
      q: "Is downloading the e-Ration Card free?",
      a: "Yes, completely free. The e-Ration Card is issued by the Government of West Bengal and downloading it from food.wb.gov.in costs nothing. Never pay an agent or website just to download it for you.",
      bnQ: "ই-রেশন কার্ড ডাউনলোড করা কি বিনামূল্যে?",
      bnA: "হ্যাঁ, সম্পূর্ণ বিনামূল্যে। ই-রেশন কার্ড পশ্চিমবঙ্গ সরকার ইস্যু করে এবং food.wb.gov.in থেকে এটি ডাউনলোড করতে কোনো খরচ নেই। শুধু ডাউনলোড করে দেওয়ার জন্য কোনো এজেন্ট বা ওয়েবসাইটকে কখনও টাকা দেবেন না।",
    },
    {
      q: "Does every family member have a separate e-Ration Card PDF?",
      a: "Yes. In West Bengal each member has an individual digital ration card with their own number. Download one PDF per member — and if you order PVC prints, one card is printed per PDF.",
      bnQ: "পরিবারের প্রত্যেক সদস্যের কি আলাদা ই-রেশন কার্ড PDF থাকে?",
      bnA: "হ্যাঁ। পশ্চিমবঙ্গে প্রত্যেক সদস্যের নিজস্ব নম্বর সহ আলাদা ডিজিটাল রেশন কার্ড থাকে। প্রতি সদস্যের জন্য একটি করে PDF ডাউনলোড করুন — আর PVC প্রিন্ট অর্ডার করলে প্রতি PDF-এর জন্য একটি করে কার্ড প্রিন্ট হয়।",
    },
    {
      q: "I don't know my ration card number. What do I do?",
      a: "Check any old paper card, an SMS from the food department, or ask your local ration dealer — they can look up your number. The official portal also has search options (these change as the site is updated). See our lost ration card guide for the full recovery steps.",
      bnQ: "আমি আমার রেশন কার্ড নম্বর জানি না। কী করব?",
      bnA: "পুরনো কোনো কাগজের কার্ড, খাদ্য দফতরের কোনো SMS দেখে নিন, অথবা স্থানীয় রেশন ডিলারকে জিজ্ঞেস করুন — তাঁরা আপনার নম্বর খুঁজে দিতে পারেন। সরকারি পোর্টালেও সার্চ করার অপশন আছে (সাইট আপডেট হওয়ার সঙ্গে এগুলি বদলায়)। পুরো ফিরে পাওয়ার ধাপগুলির জন্য আমাদের হারানো রেশন কার্ড গাইডটি দেখুন।",
    },
    {
      q: "Can I download it on my phone?",
      a: "Yes. The portal works in any mobile browser (Chrome, etc.). The PDF saves to your Downloads folder — from there you can upload it directly when ordering a PVC print.",
      bnQ: "আমি কি ফোনে এটি ডাউনলোড করতে পারি?",
      bnA: "হ্যাঁ। পোর্টালটি যেকোনো মোবাইল ব্রাউজারে (Chrome ইত্যাদি) চলে। PDF-টি আপনার Downloads ফোল্ডারে সেভ হয় — সেখান থেকে PVC প্রিন্ট অর্ডার করার সময় সরাসরি আপলোড করতে পারবেন।",
    },
    {
      q: "The details on my e-Ration Card are wrong. Can you fix them?",
      a: "No — corrections are a government service, free of charge, at food.wb.gov.in or your nearest food & supplies office. We only print the card exactly as issued; fix any errors before ordering a PVC copy.",
      bnQ: "আমার ই-রেশন কার্ডের তথ্য ভুল আছে। আপনারা কি ঠিক করে দিতে পারবেন?",
      bnA: "না — সংশোধন একটি সরকারি পরিষেবা, food.wb.gov.in-এ বা আপনার নিকটবর্তী খাদ্য ও সরবরাহ দফতরে বিনামূল্যে করা যায়। আমরা কার্ডটি যেমন ইস্যু হয়েছে ঠিক তেমনভাবেই প্রিন্ট করি; PVC কপি অর্ডার করার আগে যেকোনো ভুল ঠিক করে নিন।",
    },
    {
      q: "I have the PDF. How do I get it as a plastic card?",
      a: `Order on erationcards.in: fill in your details, pay by UPI and upload the PDF. A wallet-size waterproof PVC print costs ₹${PRICING.ration.single.public} for one card or ₹${PRICING.ration.multi.public} per card for 2 or more, delivery included, dispatched within 24–48 hours.`,
      bnQ: "আমার কাছে PDF আছে। এটি প্লাস্টিক কার্ড হিসেবে কীভাবে পাব?",
      bnA: `erationcards.in-এ অর্ডার করুন: আপনার তথ্য দিন, UPI-তে পেমেন্ট করুন এবং PDF আপলোড করুন। পকেট-সাইজের ওয়াটারপ্রুফ PVC প্রিন্টের দাম একটি কার্ডের জন্য ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}, ডেলিভারি সহ, ২৪–৪৮ ঘণ্টার মধ্যে পাঠানো হয়।`,
    },
    {
      q: "In short — how do I download and print the e-Ration Card?",
      a: `Go to food.wb.gov.in, open the E-Citizen section, enter your ration card number and category (PHH, SPHH, AAY, RKSY-I or RKSY-II) and save the free PDF — one per family member. Want a durable copy? erationcards.in prints it on waterproof PVC: ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more.`,
      bnQ: "ই-রেশন কার্ড কি বিনামূল্যে ডাউনলোড করা যায়?",
      bnA: `হ্যাঁ, সম্পূর্ণ বিনামূল্যে। food.wb.gov.in-এ গিয়ে রেশন কার্ড নম্বর ও ক্যাটাগরি দিয়ে PDF ডাউনলোড করুন — কোনো ফি নেই। ডাউনলোডের পর চাইলে erationcards.in থেকে ওয়াটারপ্রুফ PVC কার্ড প্রিন্ট করাতে পারেন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
    },
  ];

  useJsonLd("guide-dl-howto-ld", {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to download your West Bengal e-Ration Card PDF (free)",
    description:
      "Download the official West Bengal e-Ration Card PDF free from food.wb.gov.in — no fee, no agent needed.",
    totalTime: "PT10M",
    estimatedCost: { "@type": "MonetaryAmount", currency: "INR", value: "0" },
    step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
  });
  useJsonLd("guide-dl-faq-ld", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: ["en-IN", "bn"],
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
  useJsonLd("guide-dl-breadcrumb-ld", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://erationcards.in/" },
      { "@type": "ListItem", position: 2, name: "Download e-Ration Card Guide", item: CANONICAL },
    ],
  });

  return (
    <GuideLayout
      title="How to Download Your e-Ration Card PDF in West Bengal (Free)"
      intro="The official 5-step process on food.wb.gov.in — no fee, no agent, works on any phone."
      bnIntro="food.wb.gov.in-এর সরকারি ৫-ধাপের প্রক্রিয়া — কোনো ফি নেই, কোনো এজেন্ট নেই, যেকোনো ফোনে চলে।"
      quickAnswer={
        <>
          Go to <strong>food.wb.gov.in</strong> (official, free), open the E-Citizen section, choose the e-Ration
          Card (e-RC) download option, enter your ration card number and category, and save the PDF. Each family
          member has their own card, so repeat per member. Once you have the PDF, erationcards.in can print it on a
          waterproof, wallet-size PVC card for ₹{PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per
          card for 2 or more), delivered to your door.
        </>
      }
      bnQuickAnswer={
        <>
          <strong>food.wb.gov.in</strong>-এ (সরকারি, ফ্রি) যান, E-Citizen বিভাগটি খুলুন, e-Ration Card (e-RC) ডাউনলোড
          অপশনটি বেছে নিন, আপনার রেশন কার্ড নম্বর ও ক্যাটাগরি দিন এবং PDF সেভ করুন। পরিবারের প্রত্যেক সদস্যের নিজস্ব কার্ড আছে,
          তাই প্রতি সদস্যের জন্য একবার করে করুন। PDF পেয়ে গেলে erationcards.in সেটি পকেট-সাইজের ওয়াটারপ্রুফ PVC কার্ডে প্রিন্ট
          করে বাড়িতে পৌঁছে দেয়, একটি কার্ড ₹{PRICING.ration.single.public} (২টি বা বেশি হলে প্রতি কার্ড ₹
          {PRICING.ration.multi.public})।
        </>
      }
      related={[
        { href: "/guides/ration-card-types-west-bengal", label: "AAY, PHH, SPHH, RKSY-I & RKSY-II — card types explained" },
        { href: "/guides/lost-ration-card-west-bengal", label: "Lost or damaged ration card? Here's what to do" },
        { href: "/download", label: "Official download links (e-Ration Card, ABHA, e-Shram)" },
      ]}
    >
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-4">Step-by-step: download your e-Ration Card</h2>
        <ol className="space-y-4">
          {STEPS.map((s, i) => (
            <li key={i} className="flex gap-4 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">{s.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.text}</p>
                <p lang="bn" className="text-sm text-slate-600 leading-relaxed mt-1.5">{s.bn}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-4">
          <strong>It is completely free.</strong> The government never charges for the e-Ration Card PDF. If someone
          asks for money just to download it, walk away — the only thing that costs anything is an optional durable
          PVC print of the card you already have.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-slate-900 mb-3">What you need before you start</h2>
        <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-600 leading-relaxed">
          <li>Your ration card number (printed on your old card, or ask your ration dealer)</li>
          <li>Your card type — AAY, PHH, SPHH, RKSY-I or RKSY-II (also printed on the card)</li>
          <li>Any phone or computer with an internet connection — no login or OTP is needed in most cases</li>
        </ul>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          Not sure which category you have? Read our{" "}
          <Link href="/guides/ration-card-types-west-bengal" className="text-primary hover:underline">
            ration card types guide
          </Link>
          . Lost your number entirely? Start with the{" "}
          <Link href="/guides/lost-ration-card-west-bengal" className="text-primary hover:underline">
            lost ration card guide
          </Link>
          .
        </p>
      </section>

      <GuideFaqList faqs={faqs} />

      <GuideCta
        heading="Have your PDF? Make it permanent"
        body={`Paper printouts fade and tear. We print your e-Ration Card on bank-card grade waterproof PVC — ₹${PRICING.ration.single.public} for one card, ₹${PRICING.ration.multi.public} per card for 2 or more, doorstep delivery across all 23 West Bengal districts included.`}
      />
      <GuideDisclaimer />
    </GuideLayout>
  );
}
