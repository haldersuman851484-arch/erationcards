import { Navbar, Footer, BRAND } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  CreditCard, Search, Download, Users, FileText, CheckCircle, Clock,
  Shield, Truck, Star, Lock, MapPin, Award,
} from "lucide-react";
import { useSeo } from "@/hooks/use-seo";
import { useEffect, useRef, useState } from "react";
import { useListApprovedReviews } from "@workspace/api-client-react";
import { DISTRICTS } from "@/pages/DistrictPage";
import { usePricing } from "@/hooks/use-pricing";
import { useJsonLd } from "@/lib/jsonld";

function HeroPVCCard() {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -12, y: dx * 12 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
  }

  return (
    <div className="relative w-full flex items-center justify-center select-none">
      <div className="absolute w-80 h-80 rounded-full bg-[#41b8f0]/20 blur-3xl animate-pulse" />
      <div className="absolute w-56 h-56 rounded-full bg-primary/15 blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div
        className="absolute top-4 right-2 md:right-8 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700"
        style={{ animation: "floatA 3s ease-in-out infinite" }}
      >
        <Truck className="w-3.5 h-3.5 text-[#41b8f0]" />
        Fast Delivery
      </div>

      <div
        className="absolute bottom-8 left-2 md:left-4 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700"
        style={{ animation: "floatB 3.5s ease-in-out infinite" }}
      >
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        100% Secure
      </div>

      <div
        className="absolute top-10 left-2 md:left-0 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700"
        style={{ animation: "floatC 4s ease-in-out infinite" }}
      >
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        4.9 Rated
      </div>

      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative z-10 cursor-pointer"
        style={{
          transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: "transform 0.15s ease-out",
          animation: tilt.x === 0 && tilt.y === 0 ? "floatCard 4s ease-in-out infinite" : undefined,
        }}
      >
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[85%] h-8 bg-black/20 blur-xl rounded-full" />

        <div
          className="relative w-[340px] md:w-[400px] rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f4c81 0%, #1a7fc4 40%, #41b8f0 70%, #0f4c81 100%)",
            boxShadow: "0 25px 60px rgba(15,76,129,0.45), 0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
        >
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
              backgroundSize: "200% 200%",
              animation: "shimmer 3s ease-in-out infinite",
            }}
          />
          <div className="relative px-6 pt-6 pb-3 flex items-start justify-between">
            <div
              className="w-10 h-8 rounded-md"
              style={{
                background: "linear-gradient(145deg, #d4a843, #f5c842, #b8861a)",
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              <div className="w-full h-full rounded-md border border-yellow-600/40 grid grid-cols-2 gap-px p-1 opacity-60">
                <div className="bg-yellow-700/50 rounded-sm" />
                <div className="bg-yellow-700/50 rounded-sm" />
                <div className="bg-yellow-700/50 rounded-sm" />
                <div className="bg-yellow-700/50 rounded-sm" />
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white/90" />
              </div>
              <span className="text-[11px] text-white/60 mt-1 font-medium tracking-widest uppercase">Govt. of WB</span>
            </div>
          </div>

          <div className="px-6 pb-2">
            <p className="text-white/50 text-[12px] tracking-widest uppercase font-medium mb-1">Ration Card No.</p>
            <p className="text-white font-mono text-lg tracking-[0.2em] font-bold drop-shadow">
              WB •••• •••• 7291
            </p>
          </div>

          <div className="px-6 pb-4 pt-1 flex items-end justify-between">
            <div>
              <p className="text-white/50 text-[12px] tracking-widest uppercase font-medium mb-0.5">Card Holder</p>
              <p className="text-white font-bold text-sm tracking-wide">RAHUL SHARMA</p>
              <p className="text-white/60 text-xs mt-0.5">Family of 4 · PHH</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-[12px] tracking-widest uppercase font-medium mb-0.5">Valid Thru</p>
              <p className="text-white font-bold text-sm tracking-wider">12/28</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm px-6 py-2 flex items-center justify-between border-t border-white/10">
            <span className="text-white/70 text-[12px] tracking-widest uppercase font-semibold">West Bengal</span>
            <span className="text-white/70 text-[12px] tracking-widest uppercase font-semibold flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PVC Printed
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes floatCard {
          0%, 100% { transform: perspective(800px) translateY(0px) rotateX(2deg) rotateY(-4deg); }
          50% { transform: perspective(800px) translateY(-14px) rotateX(2deg) rotateY(-4deg); }
        }
        @keyframes floatA {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0%; }
          50% { background-position: -200% 0%; }
          100% { background-position: 200% 0%; }
        }
      `}</style>
    </div>
  );
}

const CARD_TYPES = [
  {
    code: "AAY",
    name: "Antyodaya Anna Yojana",
    desc: "For the poorest of poor families — highest food grain entitlement.",
    color: "bg-red-50 border-red-200 text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  {
    code: "PHH",
    name: "Priority Household",
    desc: "Below poverty line households identified by the state government.",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    code: "SPHH",
    name: "Special Priority Household",
    desc: "Specially categorized households under West Bengal's priority scheme.",
    color: "bg-purple-50 border-purple-200 text-purple-700",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    code: "RKSY-I",
    name: "Rajya Khadya Suraksha Yojana — I",
    desc: "State food security scheme category I — above poverty line families.",
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    code: "RKSY-II",
    name: "Rajya Khadya Suraksha Yojana — II",
    desc: "State food security scheme category II — general beneficiary households.",
    color: "bg-amber-50 border-amber-200 text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
];

// The 3 non-ration PVC card products — pricing comes from @workspace/pricing
// so this section always matches the order form and the server.
const SPECIAL_CARD_PRODUCTS = [
  {
    code: "ABHA",
    name: "ABHA Health Card",
    desc: "Ayushman Bharat Health Account card printed on premium PVC — carry your health ID everywhere.",
    color: "bg-sky-50 border-sky-200 text-sky-700",
    badge: "bg-sky-100 text-sky-700",
  },
  {
    code: "E-SHRAM",
    name: "E-SHRAM Card",
    desc: "Unorganised workers' E-SHRAM card in durable wallet size — waterproof and long-lasting.",
    color: "bg-rose-50 border-rose-200 text-rose-700",
    badge: "bg-rose-100 text-rose-700",
  },
  {
    code: "GENERAL",
    name: "General PVC Card",
    desc: "Any other document or card printed as a premium PVC card — same quality and delivery.",
    color: "bg-slate-50 border-slate-300 text-slate-700",
    badge: "bg-slate-200 text-slate-700",
  },
];

const STATS = [
  { value: "10,000+", label: "Cards Delivered", icon: Award },
  { value: "8,500+", label: "Happy Customers", icon: Star },
  { value: "23", label: "Districts Covered", icon: MapPin },
  { value: "24hr", label: "Order Processing", icon: Clock },
];

const STATIC_TESTIMONIALS = [
  {
    name: "Sunita Devi",
    initials: "SD",
    avatarColor: "linear-gradient(135deg, #7f1d1d, #b91c1c)",
    district: "Murshidabad",
    cardType: "AAY",
    badgeClass: "bg-red-100 text-red-700",
    rating: 5,
    quote: "কার্ডটি মাত্র ৬ দিনে পৌঁছে গেছে। খুব সুন্দর প্রিন্ট, একদম আসল কার্ডের মতো দেখতে। পরিবারের সবাই খুশি। The quality is excellent — waterproof and wallet-fit.",
    date: "June 2025",
  },
  {
    name: "Rahul Sharma",
    initials: "RS",
    avatarColor: "linear-gradient(135deg, #0f4c81, #1a7fc4)",
    district: "Kolkata",
    cardType: "PHH",
    badgeClass: "bg-blue-100 text-blue-700",
    rating: 5,
    quote: "Ordered online on Monday, card arrived by Saturday. The PVC print is sharp and the card fits perfectly in my wallet alongside Aadhaar. Highly recommend to anyone who is tired of laminated paper cards.",
    date: "May 2025",
  },
  {
    name: "Priya Mondal",
    initials: "PM",
    avatarColor: "linear-gradient(135deg, #064e3b, #059669)",
    district: "Howrah",
    cardType: "RKSY-I",
    badgeClass: "bg-emerald-100 text-emerald-700",
    rating: 5,
    quote: "দারুণ সার্ভিস! UPI দিয়ে পেমেন্ট করার পর ট্র্যাকিং লিংক পেয়েছিলাম। কার্ডটি দেখতে একদম ব্যাংক কার্ডের মতো মজবুত। ৫০ টাকায় এত ভালো কার্ড পাওয়া সত্যিই অবাক করা।",
    date: "June 2025",
  },
  {
    name: "Mohammed Iqbal",
    initials: "MI",
    avatarColor: "linear-gradient(135deg, #4c1d95, #7c3aed)",
    district: "North 24 Parganas",
    cardType: "SPHH",
    badgeClass: "bg-purple-100 text-purple-700",
    rating: 4,
    quote: "Process was smooth. Uploaded my screenshot and got confirmation the same day. Card quality is good — text is clear and lamination is solid. Slight delay in dispatch but overall satisfied.",
    date: "April 2025",
  },
  {
    name: "Lakshmi Sarkar",
    initials: "LS",
    avatarColor: "linear-gradient(135deg, #78350f, #d97706)",
    district: "Nadia",
    cardType: "RKSY-II",
    badgeClass: "bg-amber-100 text-amber-700",
    rating: 5,
    quote: "আমার পুরনো কাগজের কার্ড অনেক আগেই নষ্ট হয়ে গিয়েছিল। এই PVC কার্ড পেয়ে অনেক উপকার হয়েছে। দোকানে দেখালে সবাই বুঝতে পারছে। সত্যিই দারুণ উদ্যোগ।",
    date: "July 2025",
  },
];

const CARD_TYPE_BADGE: Record<string, string> = {
  AAY: "bg-red-100 text-red-700",
  PHH: "bg-blue-100 text-blue-700",
  SPHH: "bg-purple-100 text-purple-700",
  "RKSY-I": "bg-emerald-100 text-emerald-700",
  "RKSY-II": "bg-amber-100 text-amber-700",
};

const AVATAR_COLORS = [
  "linear-gradient(135deg, #7f1d1d, #b91c1c)",
  "linear-gradient(135deg, #0f4c81, #1a7fc4)",
  "linear-gradient(135deg, #064e3b, #059669)",
  "linear-gradient(135deg, #4c1d95, #7c3aed)",
  "linear-gradient(135deg, #78350f, #d97706)",
  "linear-gradient(135deg, #134e4a, #0d9488)",
  "linear-gradient(135deg, #1e1b4b, #4338ca)",
];

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0] ?? "").join("").toUpperCase().slice(0, 2);
}

function formatReviewDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export default function Home() {
  const PRICING = usePricing();
  useSeo({
    title: "Order PVC Ration Card Online | West Bengal",
    description: `Order a durable, wallet-size PVC printed ration card online for West Bengal. Fast doorstep delivery across all 23 districts. From ₹${PRICING.ration.multi.public} per card.`,
    canonical: "https://erationcards.in/",
  });

  // HowTo structured data — captured into the prerendered snapshot for AI crawlers.
  useJsonLd("howto-order-ld", {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to order a PVC ration card online in West Bengal",
    description: `Order a wallet-size PVC print of your West Bengal e-Ration Card for doorstep delivery. Total cost from ₹${PRICING.ration.multi.public} per card including delivery.`,
    totalTime: "P5D",
    estimatedCost: { "@type": "MonetaryAmount", currency: "INR", value: String(PRICING.ration.single.public) },
    step: [
      { "@type": "HowToStep", position: 1, name: "Fill the order form", text: "Go to erationcards.in/order and enter your name, mobile number and delivery address.", url: "https://erationcards.in/order" },
      { "@type": "HowToStep", position: 2, name: "Pay by UPI", text: "Pay using Google Pay, PhonePe, Paytm or any UPI app and upload the payment screenshot." },
      { "@type": "HowToStep", position: 3, name: "Upload your e-Ration Card PDF", text: "Upload each family member's e-Ration Card PDF downloaded from food.wb.gov.in — one PVC card is printed per PDF." },
      { "@type": "HowToStep", position: 4, name: "Receive your card", text: "Cards are printed and dispatched within 24–48 hours; Speed Post delivery takes 3–5 working days anywhere in West Bengal." },
    ],
  });

  const { data: liveReviews } = useListApprovedReviews();
  const testimonials = liveReviews && liveReviews.length > 0
    ? liveReviews.map((r, idx) => ({
        name: r.customerName,
        initials: getInitials(r.customerName),
        avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
        district: r.district,
        cardType: r.cardType,
        badgeClass: CARD_TYPE_BADGE[r.cardType] ?? "bg-slate-100 text-slate-700",
        rating: r.rating,
        quote: r.quote,
        date: formatReviewDate(r.createdAt),
      }))
    : STATIC_TESTIMONIALS;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      {/* Hero Section */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="container mx-auto px-4 py-20 md:py-32 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Shield className="w-4 h-4" />
              Private Printing Service · West Bengal
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Get Your PVC <br className="hidden md:block" />
              <span className="text-primary font-extrabold"> Ration Card</span> Today
            </h1>
            <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
              Order a durable, high-quality PVC printed ration card — wallet-size, waterproof — delivered straight to your doorstep across all 23 districts of West Bengal.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/order">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-md text-base px-8 h-12">
                  Order PVC Card
                </Button>
              </Link>
              <Link href="/track">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 h-12 border-slate-300">
                  Track Order Status
                </Button>
              </Link>
            </div>
          </div>
          <div className="flex-1 relative flex items-center justify-center min-h-[420px]">
            <HeroPVCCard />
          </div>
        </div>
      </section>
      {/* Stats Bar */}
      <section className="bg-primary py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {STATS.map(({ value, label, icon: Icon }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1">
                <Icon className="w-6 h-6 text-white/70 mb-1" />
                <span className="text-3xl font-extrabold text-white">{value}</span>
                <span className="text-white/75 text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Quick Answers — direct, fact-dense GEO block for AI search engines */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">PVC Ration Card West Bengal — Quick Answers</h2>
            <p className="text-slate-600 max-w-3xl mx-auto leading-relaxed" data-testid="text-quick-answer">
              <strong>PVC Card Portal (erationcards.in)</strong> is a private online service that prints your existing
              government-issued West Bengal e-Ration Card onto a wallet-size, waterproof PVC card and delivers it to
              your doorstep in all 23 districts. Prices start at ₹{PRICING.ration.multi.public} per card, dispatch is
              within 24–48 hours, and delivery takes 3–5 working days. We are not a government website — official
              ration card services are free at food.wb.gov.in.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">How much does a PVC ration card cost in West Bengal?</h3>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm" data-testid="table-price">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700">
                      <th className="text-left font-semibold px-4 py-3">Card type</th>
                      <th className="text-right font-semibold px-4 py-3">1 card</th>
                      <th className="text-right font-semibold px-4 py-3">2+ cards (each)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">Ration card (AAY, PHH, SPHH, RKSY-I, RKSY-II)</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{PRICING.ration.single.public}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{PRICING.ration.multi.public}</td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="px-4 py-3 text-slate-700">ABHA / E-SHRAM / GENERAL card</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{PRICING.special.single.public}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">₹{PRICING.special.multi.public}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Prices as of July 2026 — printing, packaging and Speed Post doorstep delivery included. Payment by UPI
                (Google Pay, PhonePe, Paytm).
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">How do I order a PVC ration card online?</h3>
              <ol className="space-y-3">
                {[
                  "Fill in your name, mobile number and delivery address on the order form.",
                  "Pay by UPI (Google Pay, PhonePe, Paytm) and upload the payment screenshot.",
                  "Upload each family member's e-Ration Card PDF — one PVC card is printed per PDF.",
                  "Cards are printed and dispatched within 24–48 hours; Speed Post delivery takes 3–5 working days.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="flex gap-3 mt-5">
                <Link href="/order">
                  <Button className="bg-primary hover:bg-primary/90">Start Your Order</Button>
                </Link>
                <Link href="/faq">
                  <Button variant="outline" className="border-slate-300">
                    Read All FAQs
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-600" data-testid="text-guide-links">
            <strong className="text-slate-900">Helpful guides:</strong>{" "}
            <Link href="/guides/download-e-ration-card" className="text-primary hover:underline">
              How to download your e-Ration Card PDF (free)
            </Link>
            {" · "}
            <Link href="/guides/ration-card-types-west-bengal" className="text-primary hover:underline">
              AAY, PHH, SPHH &amp; RKSY card types explained
            </Link>
            {" · "}
            <Link href="/guides/lost-ration-card-west-bengal" className="text-primary hover:underline">
              Lost your ration card?
            </Link>
          </p>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              ["Card size", "85.6 × 54 mm (CR80, bank-card size)"],
              ["Material", "Waterproof PVC, ~760 microns"],
              ["Dispatch time", "Within 24–48 hours of confirmation"],
              ["Coverage", "All 23 districts of West Bengal"],
            ].map(([dt, dd]) => (
              <div key={dt} className="bg-white border border-slate-200 rounded-lg px-4 py-3 shadow-sm">
                <dt className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{dt}</dt>
                <dd className="text-sm text-slate-900 font-medium mt-1">{dd}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      {/* Sample Card Gallery */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">What Your PVC Ration Card Looks Like</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              High-quality, credit-card-size PVC prints for every West Bengal ration card category. Waterproof, scratch-resistant, and built to last.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 max-w-6xl mx-auto">

            {/* ── AAY Card — bright sky blue ── */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-sky-200" style={{ background: "#29b5e8", aspectRatio: "85.6/54" }}>
                <div className="h-full flex flex-col px-3 py-2 gap-0.5">
                  <p className="text-white font-bold" style={{ fontSize: "9px" }}>Ration Card No: AAY</p>
                  <div className="border-t border-white/40 my-0.5" />
                  <div className="space-y-0.5 flex-1">
                    {["Name of the Card Holder", "Name of the Father/Husband", "Head of the Family", "Date of Birth", "Dealer Name"].map(f => (
                      <p key={f} className="text-white/90" style={{ fontSize: "6px" }}>{f} :</p>
                    ))}
                  </div>
                  <p className="text-white/90" style={{ fontSize: "6px" }}>Dealer Address :</p>
                  <p className="text-white/65 pt-0.5" style={{ fontSize: "5px" }}>Not Transferable (হস্তান্তরযোগ্য নয়)</p>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-sky-100 text-sky-700 text-xs font-bold px-3 py-0.5 rounded-full mb-1">AAY Card</span>
                <p className="text-slate-600 text-sm">Antyodaya Anna Yojana</p>
              </div>
            </div>

            {/* ── PHH Card — white background ── */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-slate-200" style={{ background: "#f5f5f5", aspectRatio: "85.6/54" }}>
                <div className="h-full flex flex-col px-3 py-2 gap-0.5">
                  <p className="text-slate-900 font-bold" style={{ fontSize: "9px" }}>Ration Card No : PHH</p>
                  <div className="border-t border-slate-300 my-0.5" />
                  <div className="space-y-0.5 flex-1">
                    {["Name of the Card Holder", "Name of the Father/Husband", "Head of the Family", "Date of Birth", "Dealer Name"].map(f => (
                      <p key={f} className="text-slate-700" style={{ fontSize: "6px" }}>{f} :</p>
                    ))}
                  </div>
                  <p className="text-slate-700" style={{ fontSize: "6px" }}>Dealer Address :</p>
                  <p className="text-slate-400 pt-0.5" style={{ fontSize: "5px" }}>Not Transferable (হস্তান্তরযোগ্য নয়)</p>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-3 py-0.5 rounded-full mb-1">PHH Card</span>
                <p className="text-slate-600 text-sm">Priority Household</p>
              </div>
            </div>

            {/* ── SPHH Card — lighter cyan-blue ── */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-cyan-200" style={{ background: "#5ecde0", aspectRatio: "85.6/54" }}>
                <div className="h-full flex flex-col px-3 py-2 gap-0.5">
                  <p className="text-white font-bold" style={{ fontSize: "9px" }}>Ration Card No : SPHH</p>
                  <div className="border-t border-white/40 my-0.5" />
                  <div className="space-y-0.5 flex-1">
                    {["Name of the Card Holder", "Name of the Father/Husband", "Head of the Family", "Date of Birth", "Dealer Name"].map(f => (
                      <p key={f} className="text-white/90" style={{ fontSize: "6px" }}>{f} :</p>
                    ))}
                  </div>
                  <p className="text-white/90" style={{ fontSize: "6px" }}>Dealer Address :</p>
                  <p className="text-white/65 pt-0.5" style={{ fontSize: "5px" }}>Not Transferable (হস্তান্তরযোগ্য নয়)</p>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-cyan-100 text-cyan-700 text-xs font-bold px-3 py-0.5 rounded-full mb-1">SPHH Card</span>
                <p className="text-slate-600 text-sm">Special Priority Household</p>
              </div>
            </div>

            {/* ── RKSY-I Card — white centre + dark green side stripes ── */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-full rounded-xl overflow-hidden shadow-2xl border border-green-300" style={{ background: "white", aspectRatio: "85.6/54" }}>
                <div className="h-full flex" style={{ minHeight: 0 }}>
                  {/* Left green stripe */}
                  <div className="flex-shrink-0" style={{ background: "#1a5c2a", width: "20%" }} />

                  {/* Centre white area */}
                  <div className="flex flex-col flex-1 px-2 py-2 gap-0.5" style={{ minWidth: 0 }}>
                    <p className="text-slate-900 font-bold" style={{ fontSize: "8px" }}>Ration Card No : RKSY-I</p>
                    <div className="border-t border-slate-200 my-0.5" />
                    <div className="space-y-0.5 flex-1">
                      {["Name of the Card Holder", "Name of the Father/Husband", "Head of the Family", "Date of Birth", "Dealer Name"].map(f => (
                        <p key={f} className="text-slate-700 truncate" style={{ fontSize: "5.5px" }}>{f} :</p>
                      ))}
                    </div>
                    <p className="text-slate-700" style={{ fontSize: "5.5px" }}>Dealer Address :</p>
                    <p className="text-slate-400 pt-0.5" style={{ fontSize: "4.5px" }}>Not Transferable (হস্তান্তরযোগ্য নয়)</p>
                  </div>

                  {/* Right green stripe */}
                  <div className="flex-shrink-0" style={{ background: "#1a5c2a", width: "20%" }} />
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-0.5 rounded-full mb-1">RKSY-I Card</span>
                <p className="text-slate-600 text-sm">Rajya Khadya Suraksha Yojana</p>
              </div>
            </div>

          </div>

          <div className="mt-10 text-center">
            <p className="text-slate-500 text-sm mb-4">
              All cards printed at <strong>85.6mm × 54mm</strong> (standard credit card size) on high-quality PVC with UV-resistant ink.
            </p>
            <Link href="/order">
              <Button className="bg-primary hover:bg-primary/90 px-8">Order PVC Card</Button>
            </Link>
          </div>
        </div>
      </section>
      {/* Quick Actions */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Services</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Access all ration card services through our centralized portal. Everything you need in one place.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-slate-200 shadow-sm hover:shadow-md hover:border-[#41b8f0] hover:bg-[#41b8f0]/10 transition-all group cursor-pointer">
              <Link href="/order">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-[#41b8f0] group-hover:text-white transition-colors text-primary">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <CardTitle>Order PVC Card</CardTitle>
                  <CardDescription>Apply for a physical PVC print of your digital ration card.</CardDescription>
                </CardHeader>
              </Link>
            </Card>
            <Card className="border-slate-200 shadow-sm hover:shadow-md hover:border-[#41b8f0] hover:bg-[#41b8f0]/10 transition-all group cursor-pointer">
              <Link href="/track">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-[#41b8f0] group-hover:text-white transition-colors text-blue-500">
                    <Search className="w-6 h-6" />
                  </div>
                  <CardTitle>Track Order</CardTitle>
                  <CardDescription>Check the real-time printing and delivery status.</CardDescription>
                </CardHeader>
              </Link>
            </Card>
            <Card className="border-slate-200 shadow-sm hover:shadow-md hover:border-[#41b8f0] hover:bg-[#41b8f0]/10 transition-all group cursor-pointer">
              <Link href="/download">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center mb-4 group-hover:bg-[#41b8f0] group-hover:text-white transition-colors text-emerald-500">
                    <Download className="w-6 h-6" />
                  </div>
                  <CardTitle>Download e-Card</CardTitle>
                  <CardDescription>Get a digital PDF copy of your ration card instantly.</CardDescription>
                </CardHeader>
              </Link>
            </Card>
            <Card className="border-slate-200 shadow-sm hover:shadow-md hover:border-[#41b8f0] hover:bg-[#41b8f0]/10 transition-all group cursor-pointer">
              <Link href="/operator/register">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center mb-4 group-hover:bg-[#41b8f0] group-hover:text-white transition-colors text-purple-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <CardTitle>Operator Login</CardTitle>
                  <CardDescription>Register as a printing partner and fulfill local orders.</CardDescription>
                </CardHeader>
              </Link>
            </Card>
          </div>
        </div>
      </section>
      {/* 3 Easy Steps */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Get PVC Card in 3 Easy Steps</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">A streamlined process designed for efficiency and convenience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl font-bold text-primary mb-6 relative z-10">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">Submit Details</h3>
              <p className="text-slate-600">Enter your ration card number and basic delivery details in our secure form.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl font-bold text-primary mb-6 relative z-10">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">Pay via UPI</h3>
              <p className="text-slate-600">Pay the nominal processing fee securely via UPI (GPay, PhonePe, Paytm).</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl font-bold text-primary mb-6 relative z-10">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Card Delivered</h3>
              <p className="text-slate-600">Your high-quality PVC card (85.6mm × 54mm) will be printed and delivered within 5–7 working days.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Ration Card Types */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">All Ration Card Types — AAY, PHH, SPHH, RKSY-I, RKSY-II</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We support PVC printing for all West Bengal ration card categories. Your card type is already determined by the government — just order and we'll print it.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 max-w-6xl mx-auto">
            {CARD_TYPES.map((ct) => (
              <div key={ct.code} className={`border rounded-xl p-5 flex flex-col gap-2 ${ct.color}`}>
                <span className={`self-start text-xs font-bold px-2 py-0.5 rounded-full ${ct.badge}`}>{ct.code}</span>
                <h3 className="font-semibold text-sm leading-snug">{ct.name}</h3>
                <p className="text-xs leading-relaxed opacity-80">{ct.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-8">
            Not sure which category you have? It's printed on your existing ration card or visible in your e-Ration Card PDF from{" "}
            <a href="https://food.wb.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary underline">food.wb.gov.in</a>.
          </p>
        </div>
      </section>
      {/* NEW: ABHA / E-SHRAM / GENERAL PVC cards */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-white to-cyan-50 border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-4">
              <CreditCard className="w-4 h-4" />
              New Services
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4"> We Are Also Printing ABHA, E-SHRAM & GENERAL Cards</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Get the same premium PVC print for your ABHA health card, E-SHRAM labour card, or any other card — with doorstep delivery across West Bengal.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {SPECIAL_CARD_PRODUCTS.map((ct) => (
              <div key={ct.code} className={`border rounded-xl p-5 flex flex-col gap-2 ${ct.color}`} data-testid={`card-special-${ct.code}`}>
                <span className={`self-start text-xs font-bold px-2 py-0.5 rounded-full ${ct.badge}`}>{ct.code}</span>
                <h3 className="font-semibold text-sm leading-snug">{ct.name}</h3>
                <p className="text-xs leading-relaxed opacity-80">{ct.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/order">
              <Button className="bg-primary hover:bg-primary/90 px-8">Order Now</Button>
            </Link>
          </div>
        </div>
      </section>
      {/* Customer Testimonials */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              Verified Customer Reviews
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">What Our Customers Say</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Real feedback from customers across West Bengal who received their PVC ration cards.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <div
                key={`${t.name}-${i}`}
                className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: t.avatarColor }}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 text-sm leading-tight">{t.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {t.district}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${t.badgeClass}`}>
                    {t.cardType}
                  </span>
                </div>

                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < t.rating ? "fill-amber-400 text-amber-400" : "text-slate-200 fill-slate-200"}`}
                    />
                  ))}
                  <span className="text-xs text-slate-500 ml-1.5">{t.rating}.0</span>
                </div>

                <p className="text-slate-600 text-sm leading-relaxed flex-1">"{t.quote}"</p>

                <p className="text-xs text-slate-400">{t.date}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Features */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Why Choose a PVC Ration Card?</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Durability</h4>
                  <p className="text-slate-600 text-sm">Unlike paper cards that tear or fade, PVC cards are waterproof, tear-resistant, and built to last for years.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Standard Wallet Size (85.6mm × 54mm)</h4>
                  <p className="text-slate-600 text-sm">Same size as a credit card — fits perfectly in your wallet alongside your Aadhaar, PAN, and driving licence.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Quick Processing</h4>
                  <p className="text-slate-600 text-sm">Our network of printing operators ensures your card is processed and dispatched within 24–48 hours of payment confirmation.</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <img
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2000&auto=format&fit=crop"
              alt="Quality PVC card printing service West Bengal"
              className="rounded-2xl shadow-xl w-full"
            />
          </div>
        </div>
      </section>
      {/* District Coverage */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              Doorstep Delivery Across West Bengal
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">We Deliver to All 23 Districts of West Bengal</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Whether you're in Kolkata or Kalimpong, Howrah or Jalpaiguri — we deliver your PVC ration card to your doorstep via Speed Post.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-4xl mx-auto">
            {Object.values(DISTRICTS).map((d) => (
              <Link key={d.slug} href={`/pvc-ration-card/${d.slug}`}>
                <div className="flex flex-col gap-0.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-primary/5 hover:border-primary/30 transition-colors group">
                  <span className="text-sm text-slate-700 font-medium group-hover:text-primary leading-snug">{d.name}</span>
                  <span className="text-xs text-slate-500 leading-snug">{d.bengali}</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/order">
              <Button className="bg-primary hover:bg-primary/90 px-8">Order Your PVC Card Now</Button>
            </Link>
          </div>
        </div>
      </section>
      {/* Bengali Section */}
      <section className="py-16 bg-primary" lang="bn">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            বাংলায় PVC রেশন কার্ড অর্ডার করুন
          </h2>
          <p className="text-white/85 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-6">
            আপনার ই-রেশন কার্ডকে একটি টেকসই PVC কার্ডে রূপান্তর করুন — সাশ্রয়ী মূল্যে।
            পশ্চিমবঙ্গের ২৩টি জেলায় দ্রুত ডেলিভারি। জলরোধী, টেকসই এবং ওয়ালেট সাইজের কার্ড।
            AAY, PHH, SPHH, RKSY-I এবং RKSY-II — সমস্ত ধরনের রেশন কার্ড সমর্থিত।
            এখন ABHA, E-SHRAM এবং GENERAL কার্ডও PVC প্রিন্ট করা যায়।
          </p>
          <p className="text-white/70 text-sm mb-8">
            এটি একটি বেসরকারি মুদ্রণ পরিষেবা। পশ্চিমবঙ্গ সরকারের সাথে সম্পর্কিত নয়।
          </p>
          <Link href="/order">
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary px-8 h-12 text-base font-semibold">
              এখনই অর্ডার করুন
            </Button>
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
