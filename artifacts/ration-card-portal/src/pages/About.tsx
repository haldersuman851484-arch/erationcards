import { Link } from "wouter";
import { Navbar, Footer } from "@/components/layout";
import { useSeo } from "@/hooks/use-seo";
import { useJsonLd } from "@/lib/jsonld";
import { usePricing } from "@/hooks/use-pricing";
import { useContact } from "@/hooks/use-contact";
import { Target, Eye, Heart, AlertTriangle, ChevronDown } from "lucide-react";

const pillars = [
  {
    icon: Target,
    title: "Our mission",
    desc: "Make ration card portability practical for every household, with a card that lasts.",
  },
  {
    icon: Eye,
    title: "Our vision",
    desc: "A state where every beneficiary carries a durable, scannable ration card in their wallet.",
  },
  {
    icon: Heart,
    title: "Our values",
    desc: "Transparency, affordability, and respect for the citizens we serve.",
  },
];

const stats = [
  { value: "2,00,000+", label: "Cards Delivered" },
  { value: "1,500+", label: "Registered Operators" },
  { value: "28", label: "States Covered" },
];

export default function About() {
  const PRICING = usePricing();
  const contact = useContact();
  useSeo({
    title: "About Us — Online PVC Card Printing Service in India | PVC Card Portal",
    description: "Trusted online PVC card printing service in India: WB e-Ration Card PVC print, ABHA, E-SHRAM, Voter ID, school & corporate ID cards — durable, waterproof, delivered to your door.",
    canonical: "https://erationcards.in/about",
  });

  /** Bilingual FAQ — English feeds the FAQPage JSON-LD; Bengali renders under each answer. */
  const ABOUT_FAQS = [
    {
      q: "How do I order a PVC card online?",
      a: "Fill the order form at erationcards.in/order with your name, mobile number and delivery address, pay by UPI (Google Pay, PhonePe, Paytm), upload the payment screenshot, then upload the PDF of each card you want printed. We print within 24–48 hours and deliver by Speed Post / courier in about 3–5 working days in West Bengal.",
      bnQ: "অনলাইনে PVC কার্ড কীভাবে অর্ডার করব?",
      bnA: "erationcards.in/order-এ নাম, মোবাইল নম্বর ও ঠিকানা দিয়ে ফর্ম পূরণ করুন, UPI-তে (Google Pay, PhonePe, Paytm) পেমেন্ট করে স্ক্রিনশট আপলোড করুন, তারপর যে কার্ড ছাপাতে চান তার PDF আপলোড করুন। ২৪–৪৮ ঘণ্টায় প্রিন্ট, পশ্চিমবঙ্গে ৩–৫ কর্মদিবসে ডেলিভারি।",
    },
    {
      q: "Which PVC cards do you print?",
      a: "West Bengal e-Ration Cards (AAY, PHH, SPHH, RKSY-I, RKSY-II), Ayushman Bharat ABHA health cards, E-SHRAM cards, and — as GENERAL cards — Voter ID, Driving Licence, PAN and similar personal documents printed from your own PDF. We also take bulk orders for school student ID cards, corporate identity cards, plastic business cards and QR-code smart cards.",
      bnQ: "কোন কোন PVC কার্ড প্রিন্ট করেন?",
      bnA: "পশ্চিমবঙ্গের e-Ration Card (AAY, PHH, SPHH, RKSY-I, RKSY-II), আয়ুষ্মান ভারত ABHA হেলথ কার্ড, E-SHRAM কার্ড, আর GENERAL হিসেবে ভোটার আইডি, ড্রাইভিং লাইসেন্স, PAN ইত্যাদি — আপনার নিজের PDF থেকে। স্কুল আইডি, কর্পোরেট আইডি, প্লাস্টিক বিজনেস কার্ড ও QR স্মার্ট কার্ডের বাল্ক অর্ডারও নিই।",
    },
    {
      q: "What is the PVC card printing price with delivery?",
      a: `A single ration card PVC print costs ₹${PRICING.ration.single.public}; two or more in one order cost ₹${PRICING.ration.multi.public} per card. ABHA, E-SHRAM and GENERAL cards (Voter ID, Driving Licence, PAN) cost ₹${PRICING.special.single.public} for one and ₹${PRICING.special.multi.public} per card for two or more. Printing, packaging and doorstep delivery are all included — no hidden charges.`,
      bnQ: "ডেলিভারি সহ PVC কার্ড প্রিন্টের দাম কত?",
      bnA: `একটি রেশন কার্ড ₹${PRICING.ration.single.public}, একসাথে দুটি বা বেশি হলে প্রতিটি ₹${PRICING.ration.multi.public}। ABHA, E-SHRAM ও GENERAL কার্ড (ভোটার আইডি, ড্রাইভিং লাইসেন্স, PAN) একটি ₹${PRICING.special.single.public}, দুটি বা বেশি হলে প্রতিটি ₹${PRICING.special.multi.public}। প্রিন্টিং, প্যাকেজিং, বাড়িতে ডেলিভারি — সব দামের মধ্যেই, লুকানো খরচ নেই।`,
    },
    {
      q: "Why should I choose PVC Card Portal for PVC card printing?",
      a: `Because we combine quality with honesty: bank-card grade waterproof PVC (85.6mm × 54mm, about 760 micron), sharp scannable printing, transparent prices from ₹${PRICING.ration.multi.public} per card, live order tracking, and support in Bengali and English on ${contact.phone} or by email at ${contact.email}. Over 2,00,000 cards delivered and 1,500+ registered operators trust us — and we always tell you when a government service is free (like new applications or corrections at food.wb.gov.in), because we are a private printing service, not a government website.`,
      bnQ: "PVC কার্ড প্রিন্টের জন্য PVC Card Portal-ই কেন বেছে নেব?",
      bnA: `কারণ মান আর সততা — দুটোই: ব্যাংক কার্ডের মানের ওয়াটারপ্রুফ PVC (85.6mm × 54mm, প্রায় 760 মাইক্রন), ঝকঝকে স্ক্যানযোগ্য প্রিন্ট, স্বচ্ছ দাম — প্রতি কার্ড ₹${PRICING.ration.multi.public} থেকে শুরু, লাইভ অর্ডার ট্র্যাকিং, আর বাংলা ও ইংরেজিতে সাপোর্ট (${contact.phone}, ইমেইল ${contact.email})। ২,০০,০০০+ কার্ড ডেলিভারি আর ১,৫০০+ রেজিস্টার্ড অপারেটরের ভরসা। কোন সরকারি পরিষেবা ফ্রি (যেমন food.wb.gov.in-এ নতুন আবেদন বা সংশোধন) — সেটা আমরা সবসময় আগে বলে দিই, কারণ আমরা বেসরকারি প্রিন্টিং পরিষেবা, সরকারি ওয়েবসাইট নই।`,
    },
    {
      q: "Do you deliver PVC cards near me?",
      a: "Yes — doorstep delivery in all 23 districts of West Bengal, including Kolkata, Howrah, Purba & Paschim Bardhaman, Hooghly, North & South 24 Parganas, Nadia and Murshidabad, and by courier across India. You order online and the card arrives at your letterbox — no shop visit needed.",
      bnQ: "আমার এলাকায় কি PVC কার্ড ডেলিভারি হয়?",
      bnA: "হ্যাঁ — কলকাতা, হাওড়া, পূর্ব ও পশ্চিম বর্ধমান, হুগলি, উত্তর ও দক্ষিণ ২৪ পরগনা, নদিয়া, মুর্শিদাবাদ সহ পশ্চিমবঙ্গের ২৩টি জেলাতেই বাড়িতে ডেলিভারি — আর কুরিয়ারে সারা ভারতে। দোকানে যাওয়ার দরকার নেই।",
    },
    {
      q: "Can you print an Aadhaar PVC card from my PDF?",
      a: "For Aadhaar we recommend the official route: UIDAI prints its own Aadhaar PVC card with government security features for a small official fee at uidai.gov.in, and that version is the one banks and offices trust most. We would rather give you that honest answer than charge you for a copy the government does better.",
      bnQ: "আমার PDF থেকে কি আধার PVC কার্ড ছাপাতে পারবেন?",
      bnA: "আধারের জন্য আমরা অফিসিয়াল পথই বলি: UIDAI নিজেই uidai.gov.in-এ সামান্য সরকারি ফি-তে বিশেষ সিকিউরিটি ফিচার সহ আধার PVC কার্ড ছাপে — সেটিই সবচেয়ে নির্ভরযোগ্য, আর সেটিই অর্ডার করার পরামর্শ দিই।",
    },
    {
      q: "I run a shop — how do I become an operator?",
      a: `Register directly at erationcards.in/operator/register — or message us through the contact page, WhatsApp (${contact.phone}) or email (${contact.email}) and we will set up your operator login the same day. Operators get a bulk-order dashboard and wholesale rates — for example ₹${PRICING.ration.multi.operator} per ration card on multi-card orders — so the margin on every customer stays with you.`,
      bnQ: "আমার দোকান আছে — অপারেটর কীভাবে হব?",
      bnA: `সরাসরি erationcards.in/operator/register-এ রেজিস্টার করুন — অথবা কন্টাক্ট পেজ, WhatsApp-এ (${contact.phone}) বা ইমেইলে (${contact.email}) মেসেজ করুন, সেদিনই আপনার অপারেটর লগইন চালু করে দিই। বাল্ক অর্ডারের আলাদা ড্যাশবোর্ড আর পাইকারি দাম (যেমন মাল্টি-কার্ড অর্ডারে রেশন কার্ড প্রতি ₹${PRICING.ration.multi.operator}) — প্রতিটি গ্রাহকের মার্জিন পুরোটাই আপনার।`,
    },
  ];

  useJsonLd("about-faq-ld", {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: ["en-IN", "bn"],
    mainEntity: ABOUT_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        {/* Hero section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-500 mb-3">
              About Us
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-6">
              An initiative to support citizens of West Bengal
            </h1>
            <div className="space-y-4 text-slate-600 leading-relaxed">
              <p>
                In West Bengal, the Department of Food &amp; Supplies issues an{" "}
                <span className="font-semibold text-slate-800">e-Ration Card</span> — a
                downloadable digital version of the ration card available on the official
                government website food.wb.gov.in. Beneficiaries can download and use it at
                fair-price shops in printed or digital form.
              </p>
              <p>
                <span className="font-semibold text-slate-800">Our platform erationcards.in</span> is a
                private PVC card printing service managed by PVC ID Card Printing Service. We help
                citizens print their already-approved e-Ration Cards on durable PVC cards for
                convenience and ease of use. Customers simply upload their downloaded e-Ration Card
                PDF, and we print and deliver it securely to their home.
              </p>
            </div>
          </div>
        </section>

        {/* Mission / Vision / Values */}
        <section className="bg-slate-100 py-12 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {pillars.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 bg-[#41b8f0]">
                    <Icon className="w-5 h-5 text-amber-400" />
                  </div>
                  <p className="font-bold text-slate-900 mb-2">{title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats banner */}
        <section className="bg-primary py-12 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
              {stats.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-4xl font-bold mb-1">{value}</p>
                  <p className="text-white/75 text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SEO / GEO article — full service overview */}
        <section id="pvc-article" className="py-14 px-4">
          <article className="container mx-auto max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              India's trusted online PVC card printing service
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              erationcards.in started with a simple observation: paper documents do not survive
              Indian life. They tear at the fold, fade in the sun, and dissolve in one monsoon
              downpour or one trip through the washing machine. Yet the documents families depend
              on most — the ration card, the health card, the school ID — are still handed out as
              printouts. We built an online PVC card printing service to fix that: you upload the
              PDF of a card you already own, and we return it as a durable PVC card — the same
              size, feel and toughness as a bank ATM card. More than 2,00,000 cards delivered and
              1,500+ registered operators later, families across West Bengal and India trust us
              when they search for the best PVC card online.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-8">
              সংক্ষেপে: erationcards.in একটি বিশ্বস্ত অনলাইন PVC কার্ড প্রিন্টিং পরিষেবা — আপনার কার্ডের PDF
              আপলোড করুন, আমরা ব্যাংক কার্ডের মতো মজবুত PVC কার্ড ছাপিয়ে বাড়িতে পৌঁছে দিই। বিস্তারিত নিচে পড়ুন।
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
              Every type of PVC card we print
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              "PVC card" covers a whole family of documents, and we print nearly all of them. If
              you can download it as a PDF, we can almost certainly turn it into a wallet-size
              PVC ID card. Here are the ones our customers order every day:
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              PVC কার্ড মানে শুধু রেশন কার্ড নয় — PDF হিসেবে ডাউনলোড করা যায় এমন প্রায় যেকোনো কার্ডই আমরা
              ওয়ালেট-সাইজ PVC আইডি কার্ডে ছাপতে পারি। আমাদের গ্রাহকরা রোজ যেগুলো অর্ডার করেন:
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">
              West Bengal e-Ration Card PVC print
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Our specialty and the reason most customers find us. If you search{" "}
              <em>eration card PVC print online</em>, <em>WB eration card PVC print</em> or{" "}
              <em>convert ration card to PVC card online</em> — this is exactly what we do. You
              download your digital ration card PDF free from the government's food.wb.gov.in
              website (our <Link href="/guides/download-e-ration-card" data-testid="link-about-guide-download" className="text-primary font-semibold hover:underline">step-by-step guide</Link> shows
              how), upload it to us, and we print it on waterproof PVC — one card per family
              member, every card type: AAY, PHH, SPHH, RKSY-I and RKSY-II.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              আমাদের মূল পরিষেবা — পশ্চিমবঙ্গের e-Ration Card PVC প্রিন্ট। food.wb.gov.in থেকে বিনামূল্যে
              ডাউনলোড করা আপনার ডিজিটাল রেশন কার্ডের PDF আপলোড করুন, আমরা ওয়াটারপ্রুফ PVC-তে ছাপি —
              পরিবারের প্রত্যেক সদস্যের জন্য আলাদা কার্ড, সব ধরন: AAY, PHH, SPHH, RKSY-I, RKSY-II।
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">
              Ayushman Bharat (ABHA) &amp; E-SHRAM card PVC print
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Your Ayushman Bharat health account (ABHA) card and E-SHRAM labour card are
              documents you may need at a hospital desk or a government office years from now.
              An Ayushman Bharat PVC card print keeps those numbers safe in your wallet instead
              of folded in a drawer. Upload the PDF the same way — we handle the rest.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              আয়ুষ্মান ভারত (ABHA) হেলথ কার্ড আর E-SHRAM শ্রম কার্ডও একইভাবে PVC-তে ছাপি — হাসপাতাল বা
              অফিসে দরকারের সময় নম্বরগুলো মানিব্যাগেই থাকবে, ভাঁজ করা কাগজে নয়।
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">
              Voter ID, Driving Licence &amp; PAN card on PVC
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              People searching <em>voter ID card PVC print online</em>,{" "}
              <em>driving license PVC card print online</em> or <em>PVC PAN card</em> want the
              same thing: a clean, durable plastic copy of a document they already hold, printed
              from the PDF they downloaded from the official portal. We print these under our
              GENERAL card option — same waterproof PVC, same doorstep delivery anywhere in
              India. Your original remains your official document; our card is the everyday copy
              that saves it from wear and tear.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              ভোটার আইডি, ড্রাইভিং লাইসেন্স, PAN কার্ড — অফিসিয়াল পোর্টাল থেকে ডাউনলোড করা PDF থেকে আমরা
              GENERAL কার্ড হিসেবে প্রিন্ট করি। আপনার আসল নথিই অফিসিয়াল থাকে; আমাদের কার্ডটা রোজকার
              ব্যবহারের মজবুত কপি।
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">
              A honest note about Aadhaar PVC cards
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Searching for <em>Aadhaar card PVC print from PDF</em>? Here is the honest answer
              you will not find on every printing website: the Government of India's UIDAI prints
              its own official Aadhaar PVC card, with security features only they can print, for
              a small official fee on uidai.gov.in — and that is the version we recommend you
              order. We would rather point you to the right place than sell you something the
              government does better. That honesty is how we run this whole service.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              আধার নিয়ে সৎ কথা: ভারত সরকারের UIDAI নিজেই অফিসিয়াল আধার PVC কার্ড ছাপে (uidai.gov.in-এ,
              সামান্য সরকারি ফি-তে) — বিশেষ সিকিউরিটি ফিচার সহ। আমরা সেটাই অর্ডার করার পরামর্শ দিই — এই
              সততাই আমাদের গোটা পরিষেবার ভিত্তি।
            </p>

            <h3 className="text-lg font-bold text-slate-900 mt-6 mb-2">
              School ID, corporate ID, business &amp; smart cards
            </h3>
            <p className="text-slate-600 leading-relaxed mb-4">
              Beyond personal documents, we take bulk orders: school student ID card PVC printing
              for classes and admissions, bulk corporate identity card printing for offices and
              field teams, custom plastic business card printing that makes a first impression
              paper never will, and PVC smart card printing with QR codes for attendance,
              membership and access systems. Bulk pricing depends on quantity and design — reach
              us through the <Link href="/contact" data-testid="link-about-contact" className="text-primary font-semibold hover:underline">contact page</Link>{" "}
              or WhatsApp ({contact.phone}) or email us at {contact.email} for a quick quote.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              স্কুলের ছাত্রছাত্রীদের আইডি কার্ড, অফিসের কর্পোরেট আইডি, প্লাস্টিক বিজনেস কার্ড, QR কোড সহ স্মার্ট
              কার্ড — বাল্ক অর্ডারও নিই। পরিমাণ ও ডিজাইন অনুযায়ী দাম — কন্টাক্ট পেজ, WhatsApp ({contact.phone}) বা ইমেইলে ({contact.email})
              যোগাযোগ করুন।
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-12 mb-4">
              How to order a PVC card online — from PDF to plastic in four steps
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              If you have never ordered before, here is exactly how to order PVC cards from us.
              The whole process is designed to print PDF to PVC card online without forms,
              photocopies or office visits:
            </p>
            <ol className="list-decimal pl-6 space-y-3 text-slate-600 leading-relaxed mb-4">
              <li>
                <span className="font-semibold text-slate-800">Fill the order form.</span> Go to
                our <Link href="/order" data-testid="link-about-order" className="text-primary font-semibold hover:underline">order page</Link> and
                enter your name, mobile number and delivery address.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Pay by UPI.</span> Google Pay,
                PhonePe, Paytm — any UPI app works. Upload the payment screenshot so we can match
                your order instantly.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Upload your card PDF.</span> One
                PDF per card — for a family of four ration cards, upload four PDFs and we print
                four PVC cards.
              </li>
              <li>
                <span className="font-semibold text-slate-800">We print and dispatch within
                24–48 hours.</span> Your cards travel by Speed Post / courier with a tracking
                number you can follow on our{" "}
                <Link href="/track" data-testid="link-about-track" className="text-primary font-semibold hover:underline">track order page</Link> —
                delivery typically takes 3–5 working days in West Bengal.
              </li>
            </ol>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              সংক্ষেপে: অর্ডার পেজে নাম-ঠিকানা দিন → UPI-তে পেমেন্ট করে স্ক্রিনশট আপলোড করুন → প্রতিটি কার্ডের
              PDF আপলোড করুন → ২৪–৪৮ ঘণ্টায় প্রিন্ট ও ডিসপ্যাচ, পশ্চিমবঙ্গে ৩–৫ কর্মদিবসে ডেলিভারি। যেকোনো
              সময় Track Order পেজে অর্ডার ট্র্যাক করুন।
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-12 mb-4">
              Ration card plastic print price — simple and transparent
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              No hidden charges, no "delivery extra" surprise at checkout. A single ration card
              PVC print costs ₹{PRICING.ration.single.public} including printing, packaging and
              doorstep delivery. Ordering for the whole family? Two or more cards in one order
              drop to ₹{PRICING.ration.multi.public} per card. ABHA, E-SHRAM and GENERAL cards
              (voter ID, driving licence, PAN and similar) are ₹{PRICING.special.single.public}{" "}
              for a single card and ₹{PRICING.special.multi.public} per card for two or more.
              Every price you see on this website is the live, current price — the same amount
              our server charges when you order. Full details are on our{" "}
              <Link href="/faq" data-testid="link-about-faq" className="text-primary font-semibold hover:underline">FAQ page</Link>.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              দাম একদম স্বচ্ছ: একটি রেশন কার্ড ₹{PRICING.ration.single.public}, দুটি বা বেশি হলে প্রতিটি
              ₹{PRICING.ration.multi.public}। ABHA, E-SHRAM ও GENERAL কার্ড একটি হলে ₹{PRICING.special.single.public},
              দুটি বা বেশি হলে প্রতিটি ₹{PRICING.special.multi.public}। প্রিন্টিং, প্যাকেজিং, বাড়িতে ডেলিভারি — সব
              এই দামের মধ্যেই, কোনো লুকানো খরচ নেই।
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-12 mb-4">
              Why choose us — a durable PVC card built to last years
            </h2>
            <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed mb-4">
              <li>
                <span className="font-semibold text-slate-800">Bank-card build quality.</span>{" "}
                Standard CR80 size (85.6mm × 54mm), roughly 760 microns thick, fully waterproof.
                A durable PVC card that survives wallets, rain and years of daily handling.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Sharp, scannable printing.</span>{" "}
                Barcodes and QR codes on your card are printed crisp enough to scan at the
                fair-price shop or office reader — that is the whole point of the card.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Honesty first.</span> We are a
                private printing service, not a government website. Applying for, correcting or
                updating a ration card is always free on food.wb.gov.in — our guides link you to
                the official page for every such service, and we only charge for the plastic
                printing you actually order.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Support in your language.</span>{" "}
                Bengali and English, on WhatsApp and phone ({contact.phone}) or email ({contact.email}), {contact.hours}.
                Real humans in {contact.city}, not a chatbot.
              </li>
              <li>
                <span className="font-semibold text-slate-800">Track from print to doorstep.</span>{" "}
                Every order gets an order number and live courier tracking on our website.
              </li>
            </ul>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              কেন আমরা: ব্যাংক কার্ডের মানের মজবুত, ওয়াটারপ্রুফ কার্ড; স্ক্যানযোগ্য ঝকঝকে প্রিন্ট; বাংলা ও ইংরেজিতে
              সাপোর্ট ({contact.phone}, ইমেইল {contact.email}); লাইভ অর্ডার ট্র্যাকিং — আর সততা: আমরা বেসরকারি পরিষেবা, সরকারি কাজ
              (নতুন আবেদন, সংশোধন, আপডেট) সবসময় food.wb.gov.in-এ ফ্রি।
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-12 mb-4">
              Searching "PVC card near me"? We are already near you
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              You do not need a print shop in your neighbourhood — we bring the shop to your
              door. Customers order PVC card printing online in Kolkata and receive cards in
              Salt Lake, Behala and Dum Dum; families search digital ration card PVC print near
              Bardhaman and get delivery in both Purba and Paschim Bardhaman; we are the answer
              to best online PVC card print in Hooghly, and our PVC plastic card delivery in
              South 24 Parganas reaches from Baruipur to the Sundarbans. In total we deliver to
              all 23 districts of West Bengal — and by courier across India, from Assam to
              Maharashtra. Wherever you are, "near me" is your own letterbox.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              কলকাতা, বর্ধমান, হুগলি, দক্ষিণ ২৪ পরগনা সহ পশ্চিমবঙ্গের ২৩টি জেলাতেই বাড়িতে ডেলিভারি — আর
              কুরিয়ারে সারা ভারতে। "কাছাকাছি PVC কার্ডের দোকান" খোঁজার দরকার নেই — আপনার চিঠির বাক্সই
              আমাদের দোকান।
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-12 mb-4">
              Benefits for operators &amp; shop owners
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Run a cyber café, xerox shop, mobile recharge point or customer-service kiosk? Our
              operator programme lets you offer PVC card printing as your own service. Operators
              get a dedicated dashboard to place and track customer orders in bulk, plus
              wholesale rates — for example ₹{PRICING.ration.multi.operator} per ration card and
              ₹{PRICING.special.multi.operator} per ABHA/E-SHRAM/GENERAL card on multi-card
              orders — so the margin you earn on every customer is yours to keep. More than
              1,500 operators across West Bengal already use it as a steady side income. To
              register, sign up directly on the{" "}
              <Link href="/operator/register" data-testid="link-about-operator-register" className="text-primary font-semibold hover:underline">operator registration page</Link>{" "}
              — or message us through the{" "}
              <Link href="/contact" data-testid="link-about-contact-operator" className="text-primary font-semibold hover:underline">contact page</Link>{" "}
              and we will set up your operator login the same day.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              সাইবার ক্যাফে, জেরক্স দোকান বা মোবাইল রিচার্জ পয়েন্ট চালান? আমাদের অপারেটর প্রোগ্রামে যোগ দিন —
              আলাদা ড্যাশবোর্ড, পাইকারি দাম (যেমন মাল্টি-কার্ড অর্ডারে রেশন কার্ড প্রতি ₹{PRICING.ration.multi.operator}),
              মার্জিন পুরোটাই আপনার। ১,৫০০-র বেশি অপারেটর ইতিমধ্যে যুক্ত। সরাসরি{" "}
              <Link href="/operator/register" data-testid="link-about-operator-register-bn" className="text-primary font-semibold hover:underline">অপারেটর রেজিস্ট্রেশন পেজে</Link>{" "}
              সাইন আপ করুন, বা কন্টাক্ট পেজে মেসেজ করুন।
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-12 mb-4">
              PVC card printing — frequently asked questions
            </h2>
            <p lang="bn" className="text-slate-600 leading-relaxed mb-4">
              PVC কার্ড প্রিন্টিং নিয়ে সবচেয়ে বেশি জিজ্ঞাসা করা প্রশ্ন — ইংরেজি ও বাংলায়।
            </p>
            <div className="space-y-2 mb-4">
              {ABOUT_FAQS.map((faq, idx) => (
                <details
                  key={idx}
                  open={idx === 0}
                  className="group border border-slate-200 rounded-lg bg-white shadow-sm"
                  data-testid={`about-faq-item-${idx}`}
                >
                  <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-4 hover:text-primary [&::-webkit-details-marker]:hidden">
                    <div className="text-left">
                      <h3 className="text-base font-medium text-slate-900 group-hover:text-primary">{faq.q}</h3>
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

            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-12 mb-4">
              Start your PVC card order today
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              Whether it is one ration card for your grandmother, PVC copies of every document in
              the family folder, or five hundred student ID cards for a school — the order takes
              five minutes, and the card lasts for years. Place your PVC card order on the{" "}
              <Link href="/order" data-testid="link-about-order-cta" className="text-primary font-semibold hover:underline">order page</Link>, browse
              all options on our <Link href="/services" data-testid="link-about-services" className="text-primary font-semibold hover:underline">services page</Link>, or
              talk to us first — we are happy to help in Bengali or English.
            </p>
            <p lang="bn" className="text-slate-600 leading-relaxed">
              সংক্ষিপ্ত সারাংশ: আমরা রেশন কার্ড, ABHA, E-SHRAM, ভোটার আইডি, ড্রাইভিং লাইসেন্স, PAN, স্কুল ও
              অফিস আইডি — প্রায় সব ধরনের কার্ড PDF থেকে মজবুত, ওয়াটারপ্রুফ PVC কার্ডে প্রিন্ট করি। একটি রেশন
              কার্ড ₹{PRICING.ration.single.public}, দুটি বা বেশি হলে প্রতিটি ₹{PRICING.ration.multi.public} —
              ডেলিভারি সহ, কোনো লুকানো খরচ নেই। পশ্চিমবঙ্গের ২৩টি জেলা সহ সারা ভারতে বাড়িতে ডেলিভারি।
              সরকারি পরিষেবা (নতুন আবেদন, সংশোধন) সবসময় food.wb.gov.in-এ ফ্রি — আমরা শুধু PVC প্রিন্টিংয়ের
              দাম নিই। অর্ডার করতে উপরের "Order PVC" বোতামে ক্লিক করুন।
            </p>
          </article>
        </section>

        {/* Disclaimer */}
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-3xl">
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 leading-relaxed">
                <p className="font-bold mb-1">Disclaimer</p>
                <p>
                  This website is not affiliated with or endorsed by the Department of Food &amp;
                  Supplies, Government of West Bengal. Official ration card services, including
                  application and correction, are available free of cost at food.wb.gov.in. Our
                  services are limited only to PVC printing of existing e-Ration Cards as uploaded
                  by the customer.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
