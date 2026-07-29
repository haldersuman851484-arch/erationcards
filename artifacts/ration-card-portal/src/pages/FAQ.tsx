import { Navbar, Footer } from "@/components/layout";
import { useSeo } from "@/hooks/use-seo";
import { useJsonLd } from "@/lib/jsonld";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { PricingMatrix } from "@workspace/pricing";
import { usePricing } from "@/hooks/use-pricing";

interface FaqEntry {
  q: string;
  a: string;
  /** BCP-47 language of the entry (defaults to English). */
  lang?: "bn";
}

/**
 * FAQ content is rendered with native <details> elements (not a JS accordion)
 * so every answer is present in the HTML for AI crawlers (GPTBot,
 * PerplexityBot, ClaudeBot) that do not execute JavaScript. The same list
 * feeds the FAQPage JSON-LD below.
 */
const buildFaqs = (PRICING: PricingMatrix): FaqEntry[] => [
  {
    q: "What is a PVC ration card?",
    a: "A PVC ration card is a durable, wallet-size printed version of your digital West Bengal e-Ration Card. Made from bank-card grade PVC (polyvinyl chloride), it is waterproof, tear-resistant, and lasts for years unlike paper printouts or laminated copies. The standard size is 85.6mm × 54mm — exactly the same as a credit or debit card.",
  },
  {
    q: "Is erationcards.in a government website?",
    a: "No. erationcards.in (PVC Card Portal) is a private card-printing service. We are not affiliated with the Government of West Bengal or the Department of Food & Supplies. We only print your existing, already-issued e-Ration Card onto a PVC card. New ration card applications, corrections and updates are free government services available at food.wb.gov.in.",
  },
  {
    q: "Is it legal to print a government ration card on PVC?",
    a: "Yes. Printing your existing, officially issued e-Ration Card on a PVC card for personal convenience is permitted. We do not modify, edit, or tamper with any government-issued content — we only reproduce your existing approved card onto a durable PVC format. Our service is a private printing service, not a government body.",
  },
  {
    q: "How much does a PVC ration card cost in West Bengal?",
    a: `A PVC ration card costs ₹${PRICING.ration.single.public} for a single card, or ₹${PRICING.ration.multi.public} per card when you order 2 or more together — printing and doorstep delivery included (prices as of July 2026). ABHA, E-SHRAM and GENERAL PVC cards cost ₹${PRICING.special.single.public} for a single card, or ₹${PRICING.special.multi.public} per card for 2 or more.`,
  },
  {
    q: "Are there any hidden charges or delivery fees?",
    a: "No. The price you pay covers printing, packaging and Speed Post doorstep delivery anywhere in West Bengal. There are no extra delivery fees, no GST surprises and no per-district surcharges. You pay once by UPI when placing the order.",
  },
  {
    q: "What is the size of the PVC ration card?",
    a: "The PVC card is printed in the standard CR80 credit card size: 85.6mm × 54mm (3.375\" × 2.125\") with a thickness of approximately 760 microns. It fits perfectly in any standard wallet slot alongside your Aadhaar, PAN card, or driving licence.",
  },
  {
    q: "Which ration card types (AAY, PHH, SPHH, RKSY) do you support?",
    a: "We support PVC printing for all West Bengal ration card categories: AAY (Antyodaya Anna Yojana), PHH (Priority Household), SPHH (Special Priority Household), RKSY-I (Rajya Khadya Suraksha Yojana Category I), and RKSY-II (Rajya Khadya Suraksha Yojana Category II). Your card category is already determined by the government — simply upload your e-Ration Card PDF and we'll print whichever type you have.",
  },
  {
    q: "Can you print ABHA, E-SHRAM or other cards on PVC?",
    a: `Yes. Besides ration cards, we print ABHA health cards, E-SHRAM cards and other GENERAL cards on durable PVC. These cost ₹${PRICING.special.single.public} for one card or ₹${PRICING.special.multi.public} per card for 2 or more, printing and delivery included.`,
  },
  {
    q: "What documents do I need to place an order?",
    a: "Only your existing e-Ration Card PDF, which you can download free from food.wb.gov.in (we also link it on our Download page), plus your name, mobile number and delivery address. No Aadhaar photocopy, no application form, and no OTP from the government portal is required.",
  },
  {
    q: "Which districts in West Bengal do you deliver to?",
    a: "We deliver to all 23 districts of West Bengal: Kolkata, Howrah, North 24 Parganas, South 24 Parganas, Murshidabad, Purba Bardhaman, Paschim Bardhaman, Nadia, Hooghly, Paschim Medinipur, Purba Medinipur, Bankura, Purulia, Birbhum, Malda, Uttar Dinajpur, Dakshin Dinajpur, Jalpaiguri, Darjeeling, Cooch Behar, Alipurduar, Jhargram, and Kalimpong. Delivery is via Speed Post.",
  },
  {
    q: "How is this different from the government ration card service?",
    a: "The Government of West Bengal issues free digital e-Ration Cards (PDF format) through food.wb.gov.in. Our service is separate — we take your already-approved e-Ration Card and print it onto a durable, wallet-size PVC card for a small printing fee. We do not issue, create, or modify any government documents. Official services (new applications, corrections, updates) are free at food.wb.gov.in.",
  },
  {
    q: "Can I order PVC cards for all family members?",
    a: `Yes. You can order a PVC card for every member listed on your ration card. Ration card prints cost ₹${PRICING.ration.single.public} for one card, or ₹${PRICING.ration.multi.public} per card when you order 2 or more together. You'll upload the PDF for each family member during the order process.`,
  },
  {
    q: "How do I place an order?",
    a: "Click on 'Order PVC Card' from the home page, fill in your personal details, ration card number, and delivery address. Select your card category (AAY / PHH / SPHH / RKSY-I / RKSY-II — or ABHA / E-SHRAM / GENERAL for other PVC cards), complete the UPI payment, and upload your e-Ration Card PDF. We'll take care of printing and delivery.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept UPI payments via Google Pay, PhonePe, Paytm, and any UPI-enabled app. After placing your order, you'll receive our UPI ID and a QR code to scan for payment.",
  },
  {
    q: "How long does delivery take?",
    a: "Your PVC card will be printed and dispatched within 24–48 hours of payment and PDF confirmation. Delivery via Speed Post typically takes 3–5 working days within West Bengal and 5–7 working days for other states.",
  },
  {
    q: "How do I track my order?",
    a: "Use the 'Track Order' feature on our portal. Enter your order number (provided after placing an order) or your ration card number to see the current status: Pending → Confirmed → Printed → Dispatched → Delivered.",
  },
  {
    q: "Is my personal data and ration card PDF safe?",
    a: "Yes. Your uploaded PDFs and payment screenshots are stored privately and used only to print and verify your order. Order receipt pages are blocked from search engines, and we do not sell or share your personal details with third parties.",
  },
  {
    q: "What is the difference between a PVC card and a laminated paper card?",
    a: "A laminated paper printout can peel, fade, and tear within months, and shopkeepers often refuse damaged cards. A PVC card is solid plastic — the same material as your ATM card — so it is waterproof, does not fade in sunlight, and typically lasts 5–10 years of daily wallet use.",
  },
  {
    q: "My order shows 'delivered' but I haven't received it. What do I do?",
    a: "Please contact our support team at help@erationcards.in or call +91 96359 60507 with your order number. Our team will investigate and assist you within 24 hours.",
  },
  {
    q: "Can I get a refund if I cancel my order?",
    a: "Cancellations are accepted within 24 hours of placing the order if printing has not started. Contact our support team to initiate a cancellation. Once printing has started, cancellations may not be possible. See our Refund Policy for details.",
  },
  {
    q: "How can I become an operator / printing partner?",
    a: "Register as an operator by clicking 'Register As Operator' from the home page or footer. Fill in your shop and personal details. Once approved, you can receive card printing orders in your area and earn per-card commissions.",
  },
  {
    q: "পিভিসি রেশন কার্ডের দাম কত?",
    a: `পশ্চিমবঙ্গে একটি PVC রেশন কার্ডের দাম ₹${PRICING.ration.single.public}। একসাথে ২টি বা তার বেশি কার্ড অর্ডার করলে প্রতি কার্ড ₹${PRICING.ration.multi.public}। প্রিন্টিং ও বাড়িতে ডেলিভারি — সব খরচ এই দামের মধ্যেই ধরা, কোনো লুকানো চার্জ নেই। ABHA, E-SHRAM ও GENERAL কার্ডের দাম একটি হলে ₹${PRICING.special.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.special.multi.public}।`,
    lang: "bn",
  },
  {
    q: "কীভাবে PVC রেশন কার্ড অর্ডার করব?",
    a: "erationcards.in-এ গিয়ে 'Order PVC Card' বোতামে ক্লিক করুন। নাম, মোবাইল নম্বর ও ঠিকানা লিখুন, UPI (Google Pay, PhonePe, Paytm) দিয়ে পেমেন্ট করুন, তারপর আপনার e-Ration Card PDF আপলোড করুন। পেমেন্ট নিশ্চিত হওয়ার পর ২৪–৪৮ ঘণ্টার মধ্যে কার্ড প্রিন্ট হয়ে Speed Post-এ পাঠানো হয়।",
    lang: "bn",
  },
  {
    q: "ডেলিভারি হতে কত দিন লাগে?",
    a: "পেমেন্ট ও PDF নিশ্চিত হওয়ার পর ২৪–৪৮ ঘণ্টার মধ্যে কার্ড প্রিন্ট ও ডিসপ্যাচ হয়। পশ্চিমবঙ্গের মধ্যে Speed Post ডেলিভারিতে সাধারণত ৩–৫ কর্মদিবস লাগে। erationcards.in/track পেজে অর্ডার নম্বর দিয়ে যেকোনো সময় স্ট্যাটাস দেখতে পারবেন।",
    lang: "bn",
  },
];

export default function FAQ() {
  const pricing = usePricing();
  const FAQS = buildFaqs(pricing);
  useSeo({
    title: "FAQ — PVC Ration Card Printing | AAY PHH SPHH RKSY West Bengal",
    description: `Answers to common questions about PVC ration card printing: legality, card size (85.6mm×54mm), card types (AAY, PHH, SPHH, RKSY-I, RKSY-II, ABHA, E-SHRAM, GENERAL), district delivery, pricing from ₹${pricing.ration.multi.public}, and more.`,
    canonical: "https://erationcards.in/faq",
  });
  useJsonLd("faq-page-ld", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: ["en-IN", "bn"],
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      ...(f.lang ? { inLanguage: f.lang } : {}),
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-12">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-slate-600">
            Everything you need to know about ordering a PVC ration card in West Bengal — legality, card types (AAY, PHH, SPHH, RKSY-I, RKSY-II), delivery districts, and pricing.
          </p>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 shadow-sm" data-testid="text-faq-quick-answer">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>Quick answer:</strong> PVC Card Portal (erationcards.in) is a private online service that prints
              your existing West Bengal e-Ration Card on a wallet-size, waterproof PVC card for ₹
              {pricing.ration.single.public} (single card) or ₹{pricing.ration.multi.public} per card for 2 or more,
              delivered by Speed Post to all 23 districts in 3–5 working days. It is not a government website — official
              ration card services are free at food.wb.gov.in.
            </p>
            <p className="text-xs text-slate-400 mt-3">Last updated: July 2026 · Prices shown are current</p>
          </div>

          <div className="space-y-2">
            {FAQS.map((faq, idx) => (
              <details
                key={idx}
                open={idx === 0}
                lang={faq.lang}
                className="group border border-slate-200 rounded-lg bg-white shadow-sm"
                data-testid={`faq-item-${idx}`}
              >
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-4 hover:text-primary [&::-webkit-details-marker]:hidden">
                  <h2 className="text-base font-medium text-slate-900 group-hover:text-primary text-left">{faq.q}</h2>
                  <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>

          <div className="mt-10 bg-white border border-slate-200 rounded-xl p-5 shadow-sm" data-testid="text-faq-guides">
            <h3 className="text-base font-bold text-slate-900 mb-2">Step-by-step guides</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li>
                <Link href="/guides/download-e-ration-card" className="text-primary hover:underline">
                  How to download your e-Ration Card PDF free (food.wb.gov.in)
                </Link>
              </li>
              <li>
                <Link href="/guides/ration-card-types-west-bengal" className="text-primary hover:underline">
                  AAY, PHH, SPHH, RKSY-I &amp; RKSY-II — card types explained
                </Link>
              </li>
              <li>
                <Link href="/guides/lost-ration-card-west-bengal" className="text-primary hover:underline">
                  Lost or damaged ration card? What to do
                </Link>
              </li>
            </ul>
          </div>

          <div className="mt-12 bg-primary/5 rounded-2xl p-8 text-center border border-primary/20">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Still have questions?</h3>
            <p className="text-slate-600 text-sm mb-5">Our support team is happy to help you with any other queries.</p>
            <Link href="/contact">
              <Button className="bg-primary hover:bg-primary/90 px-8">Contact Support</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
