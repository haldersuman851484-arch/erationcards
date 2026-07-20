import { Navbar, Footer, BRAND } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { CreditCard, Search, Download, Users, FileText, CheckCircle, Clock, Shield, Truck, Star, Lock } from "lucide-react";
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
      {/* Ambient glow rings */}
      <div className="absolute w-80 h-80 rounded-full bg-[#41b8f0]/20 blur-3xl animate-pulse" />
      <div className="absolute w-56 h-56 rounded-full bg-primary/15 blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Floating badge — top right */}
      <div
        className="absolute top-4 right-2 md:right-8 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700"
        style={{ animation: "floatA 3s ease-in-out infinite" }}
      >
        <Truck className="w-3.5 h-3.5 text-[#41b8f0]" />
        Fast Delivery
      </div>

      {/* Floating badge — bottom left */}
      <div
        className="absolute bottom-8 left-2 md:left-4 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700"
        style={{ animation: "floatB 3.5s ease-in-out infinite" }}
      >
        <Lock className="w-3.5 h-3.5 text-emerald-500" />
        100% Secure
      </div>

      {/* Floating badge — top left */}
      <div
        className="absolute top-10 left-2 md:left-0 z-20 flex items-center gap-1.5 bg-white border border-slate-200 shadow-lg rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700"
        style={{ animation: "floatC 4s ease-in-out infinite" }}
      >
        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        4.9 Rated
      </div>

      {/* The card itself */}
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
        {/* Card shadow */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[85%] h-8 bg-black/20 blur-xl rounded-full" />

        {/* PVC Card body */}
        <div
          className="relative w-[340px] md:w-[400px] rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #0f4c81 0%, #1a7fc4 40%, #41b8f0 70%, #0f4c81 100%)",
            boxShadow: "0 25px 60px rgba(15,76,129,0.45), 0 0 0 1px rgba(255,255,255,0.1) inset",
          }}
        >
          {/* Holographic shimmer overlay */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              background:
                "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)",
              backgroundSize: "200% 200%",
              animation: "shimmer 3s ease-in-out infinite",
            }}
          />
          {/* Chip + logo row */}
          <div className="relative px-6 pt-6 pb-3 flex items-start justify-between">
            {/* EMV Chip */}
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
            {/* Govt emblem placeholder */}
            <div className="flex flex-col items-end">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white/90" />
              </div>
              <span className="text-[9px] text-white/60 mt-1 font-medium tracking-widest uppercase">Govt. of WB</span>
            </div>
          </div>

          {/* Card number */}
          <div className="px-6 pb-2">
            <p className="text-white/50 text-[10px] tracking-widest uppercase font-medium mb-1">Ration Card No.</p>
            <p className="text-white font-mono text-lg tracking-[0.2em] font-bold drop-shadow">
              WB •••• •••• 7291
            </p>
          </div>

          {/* Holder info */}
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

          {/* Bottom strip */}
          <div className="bg-white/10 backdrop-blur-sm px-6 py-2 flex items-center justify-between border-t border-white/10">
            <span className="text-white/70 text-[10px] tracking-widest uppercase font-semibold">West Bengal</span>
            <span className="text-white/70 text-[10px] tracking-widest uppercase font-semibold flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PVC Printed
            </span>
          </div>
        </div>
      </div>

      {/* Keyframe styles */}
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

export default function Home() {
  useSeo({
    title: "Order PVC Ration Card Online | West Bengal",
    description: "Order a durable, wallet-size PVC printed ration card online for West Bengal. Fast doorstep delivery across all districts. ₹70 for single card, ₹50 each for 2+ cards.",
    canonical: "https://erationcards.in/",
  });
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      {/* Hero Section */}
      <section className="bg-slate-50 border-b border-slate-200">
        <div className="container mx-auto px-4 py-20 md:py-32 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Shield className="w-4 h-4" />
              Official Service Portal
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Get Your PVC <br className="hidden md:block" />
              <span className="text-primary font-extrabold"> Card</span> Today
            </h1>
            <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
              Order a durable, high-quality PVC printed ration card delivered straight to your doorstep. Fast, secure, and officially recognized.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/order">
                <Button size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-md text-base px-8 h-12">
                  Apply for PVC Card
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
              <h3 className="text-xl font-semibold mb-3">Make Payment</h3>
              <p className="text-slate-600">Pay the nominal processing fee of ₹50 securely via multiple payment options.</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-2xl font-bold text-primary mb-6 relative z-10">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">Card Delivered</h3>
              <p className="text-slate-600">Your high-quality PVC card will be printed and delivered to your address within days.</p>
            </div>
          </div>
        </div>
      </section>
      {/* Features */}
      <section className="py-20 bg-white">
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
                  <h4 className="font-semibold text-lg mb-1">Convenient Size</h4>
                  <p className="text-slate-600 text-sm">Fits perfectly in your wallet alongside your Aadhar, PAN, and credit cards for easy access anywhere.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-lg mb-1">Quick Processing</h4>
                  <p className="text-slate-600 text-sm">Our decentralized network of printing operators ensures your card is processed and dispatched rapidly.</p>
                </div>
              </div>
            </div>
          </div>
          <div>
            <img 
              src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2000&auto=format&fit=crop" 
              alt="Quality Assurance" 
              className="rounded-2xl shadow-xl w-full"
            />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
