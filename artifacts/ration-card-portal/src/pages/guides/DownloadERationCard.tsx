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
  },
  {
    name: "Find the e-Ration Card download option",
    text: 'Look for the "E-Citizen" section and choose the option to view or download your e-Ration Card (often shown as "e-RC"). Menu names change from time to time — anything named "e-Ration Card" or "e-RC download" is the right place.',
  },
  {
    name: "Enter your ration card number and category",
    text: "Type your ration card number, select the card category printed on your card (AAY, PHH, SPHH, RKSY-I or RKSY-II) and complete the captcha check.",
  },
  {
    name: "View and save the PDF",
    text: "Your e-Ration Card opens as a PDF. Save it to your phone or email it to yourself. You need the PDF file itself (not a photo or screenshot) if you want a PVC print later.",
  },
  {
    name: "Repeat for each family member",
    text: "Every family member has their own e-Ration Card with their own card number, so download one PDF per member.",
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
    },
    {
      q: "Does every family member have a separate e-Ration Card PDF?",
      a: "Yes. In West Bengal each member has an individual digital ration card with their own number. Download one PDF per member — and if you order PVC prints, one card is printed per PDF.",
    },
    {
      q: "I don't know my ration card number. What do I do?",
      a: "Check any old paper card, an SMS from the food department, or ask your local ration dealer — they can look up your number. The official portal also has search options (these change as the site is updated). See our lost ration card guide for the full recovery steps.",
    },
    {
      q: "Can I download it on my phone?",
      a: "Yes. The portal works in any mobile browser (Chrome, etc.). The PDF saves to your Downloads folder — from there you can upload it directly when ordering a PVC print.",
    },
    {
      q: "The details on my e-Ration Card are wrong. Can you fix them?",
      a: "No — corrections are a government service, free of charge, at food.wb.gov.in or your nearest food & supplies office. We only print the card exactly as issued; fix any errors before ordering a PVC copy.",
    },
    {
      q: "I have the PDF. How do I get it as a plastic card?",
      a: `Order on erationcards.in: fill in your details, pay by UPI and upload the PDF. A wallet-size waterproof PVC print costs ₹${PRICING.ration.single.public} for one card or ₹${PRICING.ration.multi.public} per card for 2 or more, delivery included, dispatched within 24–48 hours.`,
    },
    {
      q: "ই-রেশন কার্ড কি বিনামূল্যে ডাউনলোড করা যায়?",
      a: `হ্যাঁ, সম্পূর্ণ বিনামূল্যে। food.wb.gov.in-এ গিয়ে রেশন কার্ড নম্বর ও ক্যাটাগরি দিয়ে PDF ডাউনলোড করুন — কোনো ফি নেই। ডাউনলোডের পর চাইলে erationcards.in থেকে ওয়াটারপ্রুফ PVC কার্ড প্রিন্ট করাতে পারেন — একটি কার্ড ₹${PRICING.ration.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}।`,
      lang: "bn",
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
      ...(f.lang ? { inLanguage: f.lang } : {}),
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
      quickAnswer={
        <>
          Go to <strong>food.wb.gov.in</strong> (official, free), open the E-Citizen section, choose the e-Ration
          Card (e-RC) download option, enter your ration card number and category, and save the PDF. Each family
          member has their own card, so repeat per member. Once you have the PDF, erationcards.in can print it on a
          waterproof, wallet-size PVC card for ₹{PRICING.ration.single.public} (₹{PRICING.ration.multi.public} per
          card for 2 or more), delivered to your door.
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
          <li>Your card category — AAY, PHH, SPHH, RKSY-I or RKSY-II (also printed on the card)</li>
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
