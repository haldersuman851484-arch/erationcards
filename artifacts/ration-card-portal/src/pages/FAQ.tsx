import { Navbar, Footer } from "@/components/layout";
import { useSeo } from "@/hooks/use-seo";
import { useJsonLd } from "@/lib/jsonld";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import type { PricingMatrix } from "@workspace/pricing";
import { usePricing } from "@/hooks/use-pricing";
import { useContact } from "@/hooks/use-contact";

/**
 * Every entry is bilingual: q/a in English (these also feed the FAQPage
 * JSON-LD, which stays English-only by design), bnQ/bnA the Bengali
 * equivalents rendered with lang="bn" directly under the English text.
 */
interface FaqEntry {
  q: string;
  a: string;
  /** Bengali version of the question, shown under the English one. */
  bnQ: string;
  /** Bengali version of the answer, shown under the English one. */
  bnA: string;
}

/**
 * FAQ content is rendered with native <details> elements (not a JS accordion)
 * so every answer is present in the HTML for AI crawlers (GPTBot,
 * PerplexityBot, ClaudeBot) that do not execute JavaScript. The same list
 * feeds the FAQPage JSON-LD below.
 */
const buildFaqs = (PRICING: PricingMatrix, contact: { phone: string; email: string }): FaqEntry[] => [
  {
    q: "What is a PVC ration card?",
    a: "A PVC ration card is a durable, wallet-size printed version of your digital West Bengal e-Ration Card. Made from bank-card grade PVC (polyvinyl chloride), it is waterproof, tear-resistant, and lasts for years unlike paper printouts or laminated copies. The standard size is 85.6mm × 54mm — exactly the same as a credit or debit card.",
    bnQ: "PVC রেশন কার্ড কী?",
    bnA: "PVC রেশন কার্ড হলো আপনার ডিজিটাল পশ্চিমবঙ্গ e-Ration Card-এর টেকসই, ওয়ালেট-সাইজ প্রিন্ট করা সংস্করণ। ব্যাংক কার্ডের মানের PVC (পলিভিনাইল ক্লোরাইড) দিয়ে তৈরি বলে এটি জলরোধী, সহজে ছেঁড়ে না, আর কাগজের প্রিন্ট বা ল্যামিনেট কপির মতো নষ্ট না হয়ে বছরের পর বছর টেকে। মাপ 85.6mm × 54mm — ঠিক ক্রেডিট বা ডেবিট কার্ডের সমান।",
  },
  {
    q: "Is erationcards.in a government website?",
    a: "No. erationcards.in (PVC Card Portal) is a private card-printing service. We are not affiliated with the Government of West Bengal or the Department of Food & Supplies. We only print your existing, already-issued e-Ration Card onto a PVC card. New ration card applications, corrections and updates are free government services available at food.wb.gov.in.",
    bnQ: "erationcards.in কি সরকারি ওয়েবসাইট?",
    bnA: "না। erationcards.in (PVC Card Portal) একটি বেসরকারি কার্ড প্রিন্টিং পরিষেবা। আমরা পশ্চিমবঙ্গ সরকার বা খাদ্য ও সরবরাহ দফতরের সঙ্গে যুক্ত নই। আমরা শুধু আপনার ইতিমধ্যে ইস্যু হওয়া e-Ration Card-টি PVC কার্ডে প্রিন্ট করি। নতুন রেশন কার্ডের আবেদন, সংশোধন ও আপডেট food.wb.gov.in-এ বিনামূল্যের সরকারি পরিষেবা।",
  },
  {
    q: "Is it legal to print a government ration card on PVC?",
    a: "Yes. Printing your existing, officially issued e-Ration Card on a PVC card for personal convenience is permitted. We do not modify, edit, or tamper with any government-issued content — we only reproduce your existing approved card onto a durable PVC format. Our service is a private printing service, not a government body.",
    bnQ: "সরকারি রেশন কার্ড PVC-তে প্রিন্ট করা কি বৈধ?",
    bnA: "হ্যাঁ। ব্যক্তিগত সুবিধার জন্য আপনার ইতিমধ্যে ইস্যু হওয়া অফিসিয়াল e-Ration Card PVC কার্ডে প্রিন্ট করা যায়। আমরা সরকারের দেওয়া কোনো তথ্য বদলাই না, এডিট করি না — শুধু আপনার অনুমোদিত কার্ডটাই টেকসই PVC ফরম্যাটে ছাপি। এটি একটি বেসরকারি প্রিন্টিং পরিষেবা, কোনো সরকারি সংস্থা নয়।",
  },
  {
    q: "How much does a PVC ration card cost in West Bengal?",
    a: `A PVC ration card costs ₹${PRICING.ration.single.public} for a single card, or ₹${PRICING.ration.multi.public} per card when you order 2 or more together — printing and doorstep delivery included (prices as of July 2026). ABHA, E-SHRAM and GENERAL PVC cards cost ₹${PRICING.special.single.public} for a single card, or ₹${PRICING.special.multi.public} per card for 2 or more.`,
    bnQ: "পশ্চিমবঙ্গে PVC রেশন কার্ডের দাম কত?",
    bnA: `পশ্চিমবঙ্গে একটি PVC রেশন কার্ডের দাম ₹${PRICING.ration.single.public}। একসাথে ২টি বা তার বেশি কার্ড অর্ডার করলে প্রতি কার্ড ₹${PRICING.ration.multi.public}। প্রিন্টিং ও বাড়িতে ডেলিভারি — সব খরচ এই দামের মধ্যেই ধরা (জুলাই ২০২৬-এর দাম)। ABHA, E-SHRAM ও GENERAL কার্ডের দাম একটি হলে ₹${PRICING.special.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.special.multi.public}।`,
  },
  {
    q: "Are there any hidden charges or delivery fees?",
    a: "No. The price you pay covers printing, packaging and Speed Post doorstep delivery anywhere in West Bengal. There are no extra delivery fees, no GST surprises and no per-district surcharges. You pay once by UPI when placing the order.",
    bnQ: "কোনো লুকানো চার্জ বা ডেলিভারি ফি আছে কি?",
    bnA: "না। যে দাম দেন তার মধ্যেই প্রিন্টিং, প্যাকেজিং আর পশ্চিমবঙ্গের যেকোনো জায়গায় Speed Post-এ বাড়িতে ডেলিভারি ধরা। আলাদা ডেলিভারি ফি নেই, GST-র চমক নেই, জেলাভেদে বাড়তি চার্জও নেই। অর্ডারের সময় UPI দিয়ে একবারই পেমেন্ট করবেন।",
  },
  {
    q: "What is the size of the PVC ration card?",
    a: "The PVC card is printed in the standard CR80 credit card size: 85.6mm × 54mm (3.375\" × 2.125\") with a thickness of approximately 760 microns. It fits perfectly in any standard wallet slot alongside your Aadhaar, PAN card, or driving licence.",
    bnQ: "PVC রেশন কার্ডের মাপ কত?",
    bnA: "কার্ডটি স্ট্যান্ডার্ড CR80 ক্রেডিট কার্ড সাইজে প্রিন্ট হয়: 85.6mm × 54mm, পুরুত্ব প্রায় 760 মাইক্রন। আধার, PAN কার্ড বা ড্রাইভিং লাইসেন্সের পাশে যেকোনো সাধারণ ওয়ালেটের খোপে সহজে এঁটে যায়।",
  },
  {
    q: "Which ration card types (AAY, PHH, SPHH, RKSY) do you support?",
    a: "We support PVC printing for all West Bengal ration card categories: AAY (Antyodaya Anna Yojana), PHH (Priority Household), SPHH (Special Priority Household), RKSY-I (Rajya Khadya Suraksha Yojana Category I), and RKSY-II (Rajya Khadya Suraksha Yojana Category II). Your card category is already determined by the government — simply upload your e-Ration Card PDF and we'll print whichever type you have.",
    bnQ: "কোন কোন রেশন কার্ডের ধরন (AAY, PHH, SPHH, RKSY) সাপোর্ট করেন?",
    bnA: "পশ্চিমবঙ্গের সব রেশন কার্ড ক্যাটাগরিই আমরা PVC-তে প্রিন্ট করি: AAY (অন্ত্যোদয় অন্ন যোজনা), PHH (প্রায়োরিটি হাউসহোল্ড), SPHH (স্পেশাল প্রায়োরিটি হাউসহোল্ড), RKSY-I ও RKSY-II (রাজ্য খাদ্য সুরক্ষা যোজনা)। আপনার কার্ডের ক্যাটাগরি সরকারই আগে থেকে ঠিক করে দিয়েছে — শুধু e-Ration Card PDF আপলোড করুন, যে ধরনেরই হোক আমরা প্রিন্ট করে দেব।",
  },
  {
    q: "Can you print ABHA, E-SHRAM or other cards on PVC?",
    a: `Yes. Besides ration cards, we print ABHA health cards, E-SHRAM cards and other GENERAL cards on durable PVC. These cost ₹${PRICING.special.single.public} for one card or ₹${PRICING.special.multi.public} per card for 2 or more, printing and delivery included.`,
    bnQ: "ABHA, E-SHRAM বা অন্য কার্ডও কি PVC-তে প্রিন্ট করা যায়?",
    bnA: `হ্যাঁ। রেশন কার্ড ছাড়াও আমরা ABHA হেলথ কার্ড, E-SHRAM কার্ড ও অন্যান্য GENERAL কার্ড টেকসই PVC-তে প্রিন্ট করি। দাম একটি কার্ডে ₹${PRICING.special.single.public}, ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.special.multi.public} — প্রিন্টিং ও ডেলিভারি ধরা।`,
  },
  {
    q: "What documents do I need to place an order?",
    a: "Only your existing e-Ration Card PDF, which you can download free from food.wb.gov.in (we also link it on our Download page), plus your name, mobile number and delivery address. No Aadhaar photocopy, no application form, and no OTP from the government portal is required.",
    bnQ: "অর্ডার করতে কী কী লাগবে?",
    bnA: "শুধু আপনার e-Ration Card PDF (food.wb.gov.in থেকে বিনামূল্যে ডাউনলোড করা যায় — আমাদের Download পেজেও লিঙ্ক আছে), সঙ্গে নাম, মোবাইল নম্বর আর ডেলিভারির ঠিকানা। আধারের ফটোকপি, আবেদন ফর্ম বা সরকারি পোর্টালের OTP — কিছুই লাগে না।",
  },
  {
    q: "Which districts in West Bengal do you deliver to?",
    a: "We deliver to all 23 districts of West Bengal: Kolkata, Howrah, North 24 Parganas, South 24 Parganas, Murshidabad, Purba Bardhaman, Paschim Bardhaman, Nadia, Hooghly, Paschim Medinipur, Purba Medinipur, Bankura, Purulia, Birbhum, Malda, Uttar Dinajpur, Dakshin Dinajpur, Jalpaiguri, Darjeeling, Cooch Behar, Alipurduar, Jhargram, and Kalimpong. Delivery is via Speed Post.",
    bnQ: "পশ্চিমবঙ্গের কোন কোন জেলায় ডেলিভারি দেন?",
    bnA: "পশ্চিমবঙ্গের ২৩টি জেলাতেই ডেলিভারি দিই: কলকাতা, হাওড়া, উত্তর ২৪ পরগনা, দক্ষিণ ২৪ পরগনা, মুর্শিদাবাদ, পূর্ব বর্ধমান, পশ্চিম বর্ধমান, নদিয়া, হুগলি, পশ্চিম মেদিনীপুর, পূর্ব মেদিনীপুর, বাঁকুড়া, পুরুলিয়া, বীরভূম, মালদা, উত্তর দিনাজপুর, দক্ষিণ দিনাজপুর, জলপাইগুড়ি, দার্জিলিং, কোচবিহার, আলিপুরদুয়ার, ঝাড়গ্রাম ও কালিম্পং। ডেলিভারি হয় Speed Post-এ।",
  },
  {
    q: "How is this different from the government ration card service?",
    a: "The Government of West Bengal issues free digital e-Ration Cards (PDF format) through food.wb.gov.in. Our service is separate — we take your already-approved e-Ration Card and print it onto a durable, wallet-size PVC card for a small printing fee. We do not issue, create, or modify any government documents. Official services (new applications, corrections, updates) are free at food.wb.gov.in.",
    bnQ: "সরকারি রেশন কার্ড পরিষেবার সঙ্গে এর পার্থক্য কী?",
    bnA: "পশ্চিমবঙ্গ সরকার food.wb.gov.in-এর মাধ্যমে বিনামূল্যে ডিজিটাল e-Ration Card (PDF) দেয়। আমাদের পরিষেবা আলাদা — আপনার অনুমোদিত e-Ration Card-টি আমরা সামান্য প্রিন্টিং খরচে টেকসই, ওয়ালেট-সাইজ PVC কার্ডে ছাপি। আমরা কোনো সরকারি নথি ইস্যু, তৈরি বা পরিবর্তন করি না। অফিসিয়াল পরিষেবা (নতুন আবেদন, সংশোধন, আপডেট) food.wb.gov.in-এ বিনামূল্যে পাওয়া যায়।",
  },
  {
    q: "Can I order PVC cards for all family members?",
    a: `Yes. You can order a PVC card for every member listed on your ration card. Ration card prints cost ₹${PRICING.ration.single.public} for one card, or ₹${PRICING.ration.multi.public} per card when you order 2 or more together. You'll upload the PDF for each family member during the order process.`,
    bnQ: "পরিবারের সবার জন্য কি PVC কার্ড অর্ডার করা যায়?",
    bnA: `হ্যাঁ। রেশন কার্ডে নাম থাকা প্রত্যেক সদস্যের জন্যই PVC কার্ড অর্ডার করতে পারেন। রেশন কার্ড প্রিন্টের দাম একটিতে ₹${PRICING.ration.single.public}, একসাথে ২টি বা বেশি হলে প্রতি কার্ড ₹${PRICING.ration.multi.public}। অর্ডারের সময় প্রতিটি সদস্যের PDF আলাদা করে আপলোড করবেন।`,
  },
  {
    q: "How do I place an order?",
    a: "Click on 'Order PVC Card' from the home page, fill in your personal details, ration card number, and delivery address. Select your card category (AAY / PHH / SPHH / RKSY-I / RKSY-II — or ABHA / E-SHRAM / GENERAL for other PVC cards), complete the UPI payment, and upload your e-Ration Card PDF. We'll take care of printing and delivery.",
    bnQ: "কীভাবে PVC রেশন কার্ড অর্ডার করব?",
    bnA: "হোম পেজ থেকে 'Order PVC Card'-এ ক্লিক করুন। নাম, রেশন কার্ড নম্বর ও ডেলিভারির ঠিকানা লিখুন, কার্ডের ক্যাটাগরি বেছে নিন (AAY / PHH / SPHH / RKSY-I / RKSY-II — অন্য কার্ডের জন্য ABHA / E-SHRAM / GENERAL), UPI পেমেন্ট সেরে আপনার e-Ration Card PDF আপলোড করুন। প্রিন্টিং আর ডেলিভারির দায়িত্ব আমাদের।",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept UPI payments via Google Pay, PhonePe, Paytm, and any UPI-enabled app. After placing your order, you'll receive our UPI ID and a QR code to scan for payment.",
    bnQ: "কোন কোন পেমেন্ট পদ্ধতি নেওয়া হয়?",
    bnA: "Google Pay, PhonePe, Paytm-সহ যেকোনো UPI অ্যাপে পেমেন্ট নেওয়া হয়। অর্ডার দেওয়ার পর আমাদের UPI ID আর স্ক্যান করার QR কোড পেয়ে যাবেন।",
  },
  {
    q: "How long does delivery take?",
    a: "Your PVC card will be printed and dispatched within 24–48 hours of payment and PDF confirmation. Delivery via Speed Post typically takes 3–5 working days within West Bengal and 5–7 working days for other states.",
    bnQ: "ডেলিভারি হতে কত দিন লাগে?",
    bnA: "পেমেন্ট ও PDF নিশ্চিত হওয়ার পর ২৪–৪৮ ঘণ্টার মধ্যে কার্ড প্রিন্ট ও ডিসপ্যাচ হয়। পশ্চিমবঙ্গের মধ্যে Speed Post ডেলিভারিতে সাধারণত ৩–৫ কর্মদিবস, অন্য রাজ্যে ৫–৭ কর্মদিবস লাগে।",
  },
  {
    q: "How do I track my order?",
    a: "Use the 'Track Order' feature on our portal. Enter your order number (provided after placing an order) or your ration card number to see the current status: Pending → Confirmed → Printed → Dispatched → Delivered.",
    bnQ: "অর্ডার কীভাবে ট্র্যাক করব?",
    bnA: "পোর্টালের 'Track Order' ফিচারটি ব্যবহার করুন। অর্ডার নম্বর (অর্ডার দেওয়ার পর পাবেন) বা রেশন কার্ড নম্বর দিলেই বর্তমান স্ট্যাটাস দেখা যায়: Pending → Confirmed → Printed → Dispatched → Delivered।",
  },
  {
    q: "Is my personal data and ration card PDF safe?",
    a: "Yes. Your uploaded PDFs and payment screenshots are stored privately and used only to print and verify your order. Order receipt pages are blocked from search engines, and we do not sell or share your personal details with third parties.",
    bnQ: "আমার ব্যক্তিগত তথ্য ও রেশন কার্ডের PDF কি নিরাপদ?",
    bnA: "হ্যাঁ। আপলোড করা PDF ও পেমেন্ট স্ক্রিনশট গোপনে সংরক্ষিত থাকে এবং শুধু অর্ডার প্রিন্ট ও যাচাইয়ের কাজে ব্যবহার হয়। রসিদের পেজ সার্চ ইঞ্জিন থেকে ব্লক করা, আর আপনার তথ্য আমরা কারো কাছে বিক্রি বা শেয়ার করি না।",
  },
  {
    q: "What is the difference between a PVC card and a laminated paper card?",
    a: "A laminated paper printout can peel, fade, and tear within months, and shopkeepers often refuse damaged cards. A PVC card is solid plastic — the same material as your ATM card — so it is waterproof, does not fade in sunlight, and typically lasts 5–10 years of daily wallet use.",
    bnQ: "PVC কার্ড আর ল্যামিনেট করা কাগজের কার্ডের পার্থক্য কী?",
    bnA: "ল্যামিনেট করা কাগজের প্রিন্ট কয়েক মাসেই উঠে যায়, রং জ্বলে যায়, ছিঁড়ে যায় — নষ্ট কার্ড দোকানদাররা অনেক সময় নিতেও চান না। PVC কার্ড পুরোপুরি প্লাস্টিকের — আপনার ATM কার্ডের মতোই — তাই জলে নষ্ট হয় না, রোদে রং জ্বলে না, রোজ ওয়ালেটে রেখেও সাধারণত ৫–১০ বছর টেকে।",
  },
  {
    q: "My order shows 'delivered' but I haven't received it. What do I do?",
    a: `Please contact our support team at ${contact.email} or call ${contact.phone} with your order number. Our team will investigate and assist you within 24 hours.`,
    bnQ: "অর্ডারে 'delivered' দেখাচ্ছে কিন্তু কার্ড হাতে পাইনি — কী করব?",
    bnA: `অর্ডার নম্বর-সহ আমাদের সাপোর্ট টিমকে ${contact.email}-এ লিখুন বা ${contact.phone} নম্বরে ফোন করুন। আমাদের টিম ২৪ ঘণ্টার মধ্যে খতিয়ে দেখে আপনাকে সাহায্য করবে।`,
  },
  {
    q: "Can I get a refund if I cancel my order?",
    a: "Cancellations are accepted within 24 hours of placing the order if printing has not started. Contact our support team to initiate a cancellation. Once printing has started, cancellations may not be possible. See our Refund Policy for details.",
    bnQ: "অর্ডার বাতিল করলে কি টাকা ফেরত পাব?",
    bnA: "প্রিন্টিং শুরু না হয়ে থাকলে অর্ডার দেওয়ার ২৪ ঘণ্টার মধ্যে বাতিলের অনুরোধ নেওয়া হয়। বাতিল করতে সাপোর্ট টিমের সঙ্গে যোগাযোগ করুন। প্রিন্টিং শুরু হয়ে গেলে বাতিল নাও হতে পারে। বিস্তারিত আমাদের Refund Policy-তে দেখুন।",
  },
  {
    q: "How can I become an operator / printing partner?",
    a: "Register as an operator by clicking 'Register As Operator' from the home page or footer. Fill in your shop and personal details. Once approved, you can receive card printing orders in your area and earn per-card commissions.",
    bnQ: "অপারেটর / প্রিন্টিং পার্টনার কীভাবে হব?",
    bnA: "হোম পেজ বা ফুটার থেকে 'Register As Operator'-এ ক্লিক করে দোকান ও নিজের তথ্য দিয়ে রেজিস্টার করুন। অনুমোদন পেলে আপনার এলাকার কার্ড প্রিন্টের অর্ডার পাবেন এবং প্রতি কার্ডে কমিশন আয় করতে পারবেন।",
  },
];

export default function FAQ() {
  const pricing = usePricing();
  const contact = useContact();
  const FAQS = buildFaqs(pricing, contact);
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
          <p lang="bn" className="text-slate-600 mt-1">
            পশ্চিমবঙ্গে PVC রেশন কার্ড অর্ডার নিয়ে যা যা জানা দরকার — বৈধতা, কার্ডের ধরন (AAY, PHH, SPHH, RKSY-I, RKSY-II), কোন কোন জেলায় ডেলিভারি, আর দাম।
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
                className="group border border-slate-200 rounded-lg bg-white shadow-sm"
                data-testid={`faq-item-${idx}`}
              >
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-4 hover:text-primary [&::-webkit-details-marker]:hidden">
                  <div className="text-left">
                    <h2 className="text-base font-medium text-slate-900 group-hover:text-primary">{faq.q}</h2>
                    <p lang="bn" className="text-sm text-slate-500 mt-0.5">
                      {faq.bnQ}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed space-y-2">
                  <p>{faq.a}</p>
                  <p lang="bn">{faq.bnA}</p>
                </div>
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
            <h3 className="text-base font-bold text-slate-900 mt-5 mb-2">Card-type pages — price &amp; details</h3>
            <p className="text-sm leading-relaxed" data-testid="text-faq-cardtypes">
              <Link href="/pvc-card/aay" className="text-primary hover:underline">AAY</Link>
              {" · "}
              <Link href="/pvc-card/phh" className="text-primary hover:underline">PHH</Link>
              {" · "}
              <Link href="/pvc-card/sphh" className="text-primary hover:underline">SPHH</Link>
              {" · "}
              <Link href="/pvc-card/rksy-1" className="text-primary hover:underline">RKSY-I</Link>
              {" · "}
              <Link href="/pvc-card/rksy-2" className="text-primary hover:underline">RKSY-II</Link>
              {" · "}
              <Link href="/pvc-card/abha" className="text-primary hover:underline">ABHA</Link>
              {" · "}
              <Link href="/pvc-card/e-shram" className="text-primary hover:underline">E-SHRAM</Link>
              {" · "}
              <Link href="/pvc-card/general" className="text-primary hover:underline">General</Link>
            </p>
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
