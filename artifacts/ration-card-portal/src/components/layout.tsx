import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

export const BRAND = {
  name: "PVC Card Portal",
  phone: "+91 96359 60507",
  email: "help@erationcards.in",
  address: "26 Krishna Nibas, Kolkata, South 24 Parganas – 700001",
  city: "Kolkata, West Bengal",
  hours: "Monday – Saturday, 9:00 AM – 6:00 PM IST",
  tagline: "This is a non-government website managed by PVC ID Card Portal Service. A secure and efficient platform for citizens to order high-quality and durable PVC cards. We are not affiliated by government.",
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/order", label: "Order PVC" },
  { href: "/track", label: "Track Order" },
  { href: "/download", label: "Download e-Card" },
  { href: "/operator/login", label: "Operator Login" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => { setOpen(false); }, [location]);

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold text-sm">
            PVC
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">{BRAND.name}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
          {NAV_LINKS.slice(0, 4).map(({ href, label }) => (
            <Link key={href} href={href} className="px-4 py-1.5 rounded-md border border-slate-300 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Operator Login — desktop only */}
          <Link href="/operator/login" className="hidden md:block text-sm font-medium px-4 py-1.5 rounded-md border border-slate-300 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all">
            Operator Login
          </Link>

          {/* Apply Now — always visible */}
          <Link href="/order" className="hidden md:block">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-md px-6 shadow-sm">
              Apply Now
            </Button>
          </Link>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <span className="relative block w-5 h-5">
              <Menu className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${open ? "opacity-0 rotate-90 scale-75" : "opacity-100 rotate-0 scale-100"}`} />
              <X className={`w-5 h-5 absolute inset-0 transition-all duration-300 ${open ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-75"}`} />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu — always in DOM, animated with max-height + opacity */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 space-y-2 shadow-lg">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="block w-full text-center py-2.5 rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
            >
              {label}
            </Link>
          ))}
          <Link href="/order" className="block">
            <Button className="w-full bg-primary hover:bg-primary/90 text-white rounded-md shadow-sm mt-1">
              Apply Now
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold text-sm">
              PVC
            </div>
            <span className="font-bold text-lg text-white tracking-tight">
              {BRAND.name}
            </span>
          </div>
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">{BRAND.tagline}</p>
          <div className="space-y-1 text-xs text-slate-500">
            <p>{BRAND.address}</p>
            <p><a href={`tel:${BRAND.phone}`} className="hover:text-primary transition-colors">{BRAND.phone}</a></p>
            <p><a href={`mailto:${BRAND.email}`} className="hover:text-primary transition-colors">{BRAND.email}</a></p>
          </div>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Services</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/order" className="hover:text-primary transition-colors">Order PVC Card</Link></li>
            <li><Link href="/track" className="hover:text-primary transition-colors">Track Status</Link></li>
            <li><Link href="/download" className="hover:text-primary transition-colors">Download Digital Copy</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Card Types</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/pvc-card/aay" className="hover:text-primary transition-colors">AAY Ration Card</Link></li>
            <li><Link href="/pvc-card/phh" className="hover:text-primary transition-colors">PHH Ration Card</Link></li>
            <li><Link href="/pvc-card/sphh" className="hover:text-primary transition-colors">SPHH Ration Card</Link></li>
            <li><Link href="/pvc-card/rksy-1" className="hover:text-primary transition-colors">RKSY-I Ration Card</Link></li>
            <li><Link href="/pvc-card/rksy-2" className="hover:text-primary transition-colors">RKSY-II Ration Card</Link></li>
            <li><Link href="/pvc-card/abha" className="hover:text-primary transition-colors">ABHA Health Card</Link></li>
            <li><Link href="/pvc-card/e-shram" className="hover:text-primary transition-colors">E-SHRAM Card</Link></li>
            <li><Link href="/pvc-card/general" className="hover:text-primary transition-colors">General PVC Card</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Information</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            <li><Link href="/guides/download-e-ration-card" className="hover:text-primary transition-colors">Guide: Download e-Ration Card</Link></li>
            <li><Link href="/guides/ration-card-types-west-bengal" className="hover:text-primary transition-colors">Guide: Ration Card Types</Link></li>
            <li><Link href="/guides/lost-ration-card-west-bengal" className="hover:text-primary transition-colors">Guide: Lost Ration Card</Link></li>
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms &amp; Conditions</Link></li>
            <li><Link href="/refund" className="hover:text-primary transition-colors">Return &amp; Refund Policy</Link></li>
            <li><Link href="/shipping" className="hover:text-primary transition-colors">Shipping Policy</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Partners</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/operator/register" className="hover:text-primary transition-colors">Register as Operator</Link></li>
            <li><Link href="/operator/login" className="hover:text-primary transition-colors">Operator Login</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500 flex flex-col md:flex-row justify-between items-center">
        <p>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
