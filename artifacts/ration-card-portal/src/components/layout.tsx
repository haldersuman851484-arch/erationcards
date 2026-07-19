import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export const BRAND = {
  name: "PVC Card Portal",
  phone: "+91 96359 60507",
  email: "help@erationcards.in",
  address: "26 Krishna Nibas, Kolkata, South 24 Parganas – 700001",
  city: "Kolkata, West Bengal",
  hours: "Monday – Saturday, 9:00 AM – 6:00 PM IST",
  tagline: "A secure and efficient platform for citizens to order high-quality PVC printed ration cards.",
};

export function Navbar() {
  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white font-bold text-sm">
            PVC
          </div>
          <span className="font-bold text-lg text-slate-900 tracking-tight">{BRAND.name}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="/order" className="hover:text-primary transition-colors">Order PVC</Link>
          <Link href="/track" className="hover:text-primary transition-colors">Track Order</Link>
          <Link href="/download" className="hover:text-primary transition-colors">Download e-Card</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/operator/login" className="text-sm font-medium text-slate-600 hover:text-primary hidden md:block">
            Operator Login
          </Link>
          <Link href="/order">
            <Button className="bg-primary hover:bg-primary/90 text-white rounded-md px-6 shadow-sm">
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
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
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
          <h3 className="text-white font-semibold mb-4">Information</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-white font-semibold mb-4">Partners</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/operator/register" className="hover:text-primary transition-colors">Register as Operator</Link></li>
            <li><Link href="/operator/login" className="hover:text-primary transition-colors">Operator Portal</Link></li>
            <li><Link href="/admin/login" className="hover:text-primary transition-colors">Admin Access</Link></li>
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
