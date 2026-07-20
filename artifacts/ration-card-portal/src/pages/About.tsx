import { Navbar, Footer } from "@/components/layout";
import { useSeo } from "@/hooks/use-seo";
import { Target, Eye, Heart, AlertTriangle } from "lucide-react";

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
  useSeo({
    title: "About Us | PVC Card Portal — West Bengal Ration Card Printing",
    description: "Learn about PVC Card Portal — a trusted private printing service that converts your West Bengal e-Ration Card into a durable, wallet-size PVC card.",
    canonical: "https://erationcards.in/about",
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
                <span className="font-semibold text-slate-800">Our platform erationcard.in</span> is a
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
