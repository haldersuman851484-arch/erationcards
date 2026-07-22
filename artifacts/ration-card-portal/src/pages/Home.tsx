import { Navbar, Footer, BRAND } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import {
  CreditCard, Search, Download, Users, FileText, CheckCircle, Clock,
  Shield, Truck, Star, Lock, AlertTriangle, MapPin, Award,
} from "lucide-react";
import { useSeo } from "@/hooks/use-seo";
import { useEffect, useRef, useState } from "react";

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
              <span className="text-[9px] text-white/60 mt-1 font-medium tracking-widest uppercase">Govt. of WB</span>
            </div>
          </div>

          <div className="px-6 pb-2">
            <p className="text-white/50 text-[10px] tracking-widest uppercase font-medium mb-1">Ration Card No.</p>
            <p className="text-white font-mono text-lg tracking-[0.2em] font-bold drop-shadow">
              WB •••• •••• 7291
            </p>
          </div>

          <div className="px-6 pb-4 pt-1 flex items-end justify-between">
            <div>
              <p className="text-white/50 text-[10px] tracking-widest uppercase font-medium mb-0.5">Card Holder</p>
              <p className="text-white font-bold text-sm tracking-wide">RAHUL SHARMA</p>
              <p className="text-white/60 text-xs mt-0.5">Family of 4 · PHH</p>
            </div>
            <div className="text-right">
              <p className="text-white/50 text-[10px] tracking-widest uppercase font-medium mb-0.5">Valid Thru</p>
              <p className="text-white font-bold text-sm tracking-wider">12/28</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm px-6 py-2 flex items-center justify-between border-t border-white/10">
            <span className="text-white/70 text-[10px] tracking-widest uppercase font-semibold">West Bengal</span>
            <span className="text-white/70 text-[10px] tracking-widest uppercase font-semibold flex items-center gap-1">
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

const WB_DISTRICTS = [
  "Kolkata", "Howrah", "North 24 Parganas", "South 24 Parganas",
  "Murshidabad", "Purba Bardhaman (Burdwan)", "Paschim Bardhaman (Burdwan)", "Nadia",
  "Hooghly", "Paschim Medinipur (Midnapore)", "Purba Medinipur (Midnapore)", "Bankura",
  "Purulia", "Birbhum", "Malda", "Uttar Dinajpur (North Dinajpur)",
  "Dakshin Dinajpur (South Dinajpur)", "Jalpaiguri", "Darjeeling", "Cooch Behar",
  "Alipurduar", "Jhargram", "Kalimpong",
];

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

const STATS = [
  { value: "10,000+", label: "Cards Delivered", icon: Award },
  { value: "8,500+", label: "Happy Customers", icon: Star },
  { value: "23", label: "Districts Covered", icon: MapPin },
  { value: "24hr", label: "Order Processing", icon: Clock },
];

export default function Home() {
  useSeo({
    title: "Order PVC Ration Card Online | West Bengal",
    description: "Order a durable, wallet-size PVC printed ration card online for West Bengal. Fast doorstep delivery across all 23 districts. ₹70 for single card, ₹50 each for 2+ cards.",
    canonical: "https://erationcards.in/",
  });
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Disclaimer bar */}
      <div className="bg-amber-50 border-b border-amber-200 py-2 px-4">
        <div className="container mx-auto flex items-center justify-center gap-2 text-amber-800 text-xs sm:text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>
            <strong>Important:</strong> This is a <strong>private non-government</strong> PVC printing service. Not affiliated with the Govt. of West Bengal.{" "}
            <a href="https://food.wb.gov.in" target="_blank" rel="noopener noreferrer" className="underline font-medium">
              Official ration card services are free at food.wb.gov.in
            </a>
          </span>
        </div>
      </div>

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
                  Order PVC Card — ₹70
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

      {/* Sample Card Gallery */}
      <section className="py-20 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">What Your PVC Ration Card Looks Like</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              High-quality, credit-card-size PVC prints for every West Bengal ration card category. Waterproof, scratch-resistant, and built to last.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* AAY Sample */}
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-full rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: "linear-gradient(135deg, #7f1d1d 0%, #b91c1c 40%, #ef4444 70%, #7f1d1d 100%)", aspectRatio: "85.6/54" }}
              >
                <div className="relative h-full px-5 pt-4 pb-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-6 rounded bg-yellow-400/80 grid grid-cols-2 gap-px p-1 opacity-70">
                      <div className="bg-yellow-700/60 rounded-sm" /><div className="bg-yellow-700/60 rounded-sm" />
                      <div className="bg-yellow-700/60 rounded-sm" /><div className="bg-yellow-700/60 rounded-sm" />
                    </div>
                    <span className="text-white/70 text-[8px] font-bold tracking-widest uppercase">Govt. of WB</span>
                  </div>
                  <div>
                    <p className="text-white/50 text-[8px] tracking-widest uppercase">Ration Card No.</p>
                    <p className="text-white font-mono text-sm tracking-wider font-bold">WB •••• •••• 1047</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-white/50 text-[8px] tracking-widest uppercase mb-0.5">Card Holder</p>
                      <p className="text-white font-bold text-xs">SUNITA DEVI</p>
                      <p className="text-white/60 text-[9px]">Family of 6 · AAY</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-[8px] tracking-widest uppercase">Valid</p>
                      <p className="text-white font-bold text-xs">09/27</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full mb-1">AAY Card</span>
                <p className="text-slate-600 text-sm">Antyodaya Anna Yojana</p>
              </div>
            </div>

            {/* PHH Sample */}
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-full rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: "linear-gradient(135deg, #0f4c81 0%, #1a7fc4 40%, #41b8f0 70%, #0f4c81 100%)", aspectRatio: "85.6/54" }}
              >
                <div className="relative h-full px-5 pt-4 pb-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-6 rounded bg-yellow-400/80 grid grid-cols-2 gap-px p-1 opacity-70">
                      <div className="bg-yellow-700/60 rounded-sm" /><div className="bg-yellow-700/60 rounded-sm" />
                      <div className="bg-yellow-700/60 rounded-sm" /><div className="bg-yellow-700/60 rounded-sm" />
                    </div>
                    <span className="text-white/70 text-[8px] font-bold tracking-widest uppercase">Govt. of WB</span>
                  </div>
                  <div>
                    <p className="text-white/50 text-[8px] tracking-widest uppercase">Ration Card No.</p>
                    <p className="text-white font-mono text-sm tracking-wider font-bold">WB •••• •••• 7291</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-white/50 text-[8px] tracking-widest uppercase mb-0.5">Card Holder</p>
                      <p className="text-white font-bold text-xs">RAHUL SHARMA</p>
                      <p className="text-white/60 text-[9px]">Family of 4 · PHH</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-[8px] tracking-widest uppercase">Valid</p>
                      <p className="text-white font-bold text-xs">12/28</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full mb-1">PHH Card</span>
                <p className="text-slate-600 text-sm">Priority Household</p>
              </div>
            </div>

            {/* RKSY Sample */}
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-full rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: "linear-gradient(135deg, #064e3b 0%, #059669 40%, #34d399 70%, #064e3b 100%)", aspectRatio: "85.6/54" }}
              >
                <div className="relative h-full px-5 pt-4 pb-3 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-6 rounded bg-yellow-400/80 grid grid-cols-2 gap-px p-1 opacity-70">
                      <div className="bg-yellow-700/60 rounded-sm" /><div className="bg-yellow-700/60 rounded-sm" />
                      <div className="bg-yellow-700/60 rounded-sm" /><div className="bg-yellow-700/60 rounded-sm" />
                    </div>
                    <span className="text-white/70 text-[8px] font-bold tracking-widest uppercase">Govt. of WB</span>
                  </div>
                  <div>
                    <p className="text-white/50 text-[8px] tracking-widest uppercase">Ration Card No.</p>
                    <p className="text-white font-mono text-sm tracking-wider font-bold">WB •••• •••• 3584</p>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-white/50 text-[8px] tracking-widest uppercase mb-0.5">Card Holder</p>
                      <p className="text-white font-bold text-xs">PRIYA MONDAL</p>
                      <p className="text-white/60 text-[9px]">Family of 3 · RKSY-I</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-[8px] tracking-widest uppercase">Valid</p>
                      <p className="text-white font-bold text-xs">03/28</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <span className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full mb-1">RKSY-I Card</span>
                <p className="text-slate-600 text-sm">Rajya Khadya Suraksha Yojana</p>
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-slate-500 text-sm mb-4">
              All cards printed at <strong>85.6mm × 54mm</strong> (standard credit card size) on high-quality PVC with UV-resistant ink.
            </p>
            <Link href="/order">
              <Button className="bg-primary hover:bg-primary/90 px-8">Order Your Card — ₹70</Button>
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
                  <CardTitle>Operator Portal</CardTitle>
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
              <h3 className="text-xl font-semibold mb-3">Pay ₹70 via UPI</h3>
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

      {/* Features */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
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
            {WB_DISTRICTS.map((district) => (
              <div
                key={district}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 font-medium hover:bg-primary/5 hover:border-primary/30 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                {district}
              </div>
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
            আপনার ই-রেশন কার্ডকে একটি টেকসই PVC কার্ডে রূপান্তর করুন — মাত্র <strong className="text-white">₹৭০</strong> খরচে।
            পশ্চিমবঙ্গের ২৩টি জেলায় দ্রুত ডেলিভারি। জলরোধী, টেকসই এবং ওয়ালেট সাইজের কার্ড।
            AAY, PHH, SPHH, RKSY-I এবং RKSY-II — সমস্ত ধরনের রেশন কার্ড সমর্থিত।
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
