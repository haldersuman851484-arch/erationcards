import { Navbar, Footer, BRAND } from "@/components/layout";
import { Shield, Users, Award, Clock } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-16">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">About {BRAND.name}</h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            A modern, citizen-friendly digital platform based in {BRAND.city} to help millions of beneficiaries obtain high-quality PVC printed ration cards quickly and conveniently.
          </p>
        </div>
      </div>

      <main className="flex-1 py-16">
        <div className="container mx-auto px-4 max-w-4xl space-y-16">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We bridge the gap between digital governance and grassroots citizens. Every household deserves a durable, wallet-size ration card that doesn't fade, tear, or become unusable within months.
              </p>
              <p className="text-slate-600 leading-relaxed">
                By connecting citizens with a network of certified local printing operators, we ensure fast, reliable, and affordable PVC card delivery to every corner of India.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, label: "Secure Platform", desc: "End-to-end secure data handling" },
                { icon: Users, label: "Pan-India Network", desc: "Operators in 28 states" },
                { icon: Award, label: "Quality Assured", desc: "High-durability PVC material" },
                { icon: Clock, label: "Fast Delivery", desc: "5–7 working days" },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <Icon className="w-7 h-7 text-primary mb-3" />
                  <p className="font-semibold text-slate-900 text-sm mb-1">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-primary rounded-2xl p-10 text-white text-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-4xl font-bold mb-1">2,00,000+</p>
                <p className="text-primary-foreground/80 text-sm">Cards Delivered</p>
              </div>
              <div>
                <p className="text-4xl font-bold mb-1">1,500+</p>
                <p className="text-primary-foreground/80 text-sm">Registered Operators</p>
              </div>
              <div>
                <p className="text-4xl font-bold mb-1">28</p>
                <p className="text-primary-foreground/80 text-sm">States Covered</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Our Process</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {["Order Online", "Operator Assigned", "Card Printed", "Home Delivery"].map((step, i) => (
                <div key={step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 font-bold text-lg">{i + 1}</div>
                  <p className="font-medium text-slate-900">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
