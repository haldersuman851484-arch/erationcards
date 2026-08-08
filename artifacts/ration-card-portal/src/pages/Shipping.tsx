import { Navbar, Footer, BRAND } from "@/components/layout";
import { useContact } from "@/hooks/use-contact";
import { useSeo } from "@/hooks/use-seo";
import {
  AlertTriangle, Truck, Clock, MapPin, IndianRupee,
  Package, Navigation, AlertCircle, Camera, Mail, Phone,
} from "lucide-react";

const LAST_UPDATED = "20 July 2026";

interface SectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

function Section({ icon: Icon, title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#41b8f0]/15 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#41b8f0]" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <div className="pl-10 text-slate-600 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function Shipping() {
  const contact = useContact();
  useSeo({
    title: "Shipping Policy | PVC Card Portal — Ration Card Delivery",
    description: "Learn how we ship your PVC ration card. 3–5 working days in West Bengal, 5–7 days pan-India. Shipping included in card price. No hidden charges.",
    canonical: "https://erationcards.in/shipping",
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 py-14 px-4">
        <div className="container mx-auto max-w-2xl space-y-10">

          {/* Header */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-amber-500 mb-3">
              Legal
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
              Shipping Policy
            </h1>
            <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
            <p className="mt-4 text-slate-600 text-sm leading-relaxed">
              At <span className="font-semibold text-slate-800">{BRAND.name}</span>, we take care
              of printing and delivering your PVC ration card securely to your doorstep. Please
              read this policy to understand how shipping works.
            </p>
          </div>

          {/* Shipping Method */}
          <Section icon={Truck} title="1. Shipping Method">
            <p>
              All PVC cards are shipped via trusted courier partners including{" "}
              <span className="font-medium text-slate-700">India Post</span> and leading private
              courier services. The courier used may vary based on your delivery location.
            </p>
            <p>
              Cards are packed securely to prevent damage during transit. Each card is wrapped in
              a protective sleeve before dispatch.
            </p>
          </Section>

          {/* Delivery Timeline */}
          <Section icon={Clock} title="2. Delivery Timeline">
            <p>Estimated delivery after your order is dispatched:</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { area: "Within West Bengal", time: "3–5 working days" },
                { area: "Other states in India", time: "5–7 working days" },
              ].map(({ area, time }) => (
                <div key={area} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">{area}</p>
                  <p className="font-bold text-slate-800">{time}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              * Working days exclude Sundays and public holidays. Delivery to remote or hilly areas
              may take additional time.
            </p>
          </Section>

          {/* Order Processing */}
          <Section icon={Package} title="3. Order Processing Time">
            <p>
              Before your card is dispatched, it goes through the following steps:
            </p>
            <ol className="mt-2 space-y-2 list-none">
              {[
                "Payment is confirmed automatically when you pay online",
                "All ration card PDFs are received from the customer",
                "Card is printed and quality-checked",
                "Card is packed and handed over to the courier",
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#41b8f0]/20 text-[#41b8f0] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-2">
              This processing typically takes{" "}
              <span className="font-medium text-slate-700">1–2 working days</span> after payment
              verification and PDF receipt.
            </p>
          </Section>

          {/* Coverage */}
          <Section icon={MapPin} title="4. Shipping Coverage">
            <p>We currently ship to:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>All districts of <span className="font-medium text-slate-700">West Bengal</span></li>
              <li>Other states across India (where courier service is available)</li>
            </ul>
            <p className="mt-2">
              If your pincode is not serviceable, we will notify you after order placement and
              issue a full refund.
            </p>
          </Section>

          {/* Shipping Charges */}
          <Section icon={IndianRupee} title="5. Shipping Charges">
            <p>
              Shipping is <span className="font-bold text-slate-800">included in the card price</span>. There are no additional delivery charges.
              The amount shown at checkout is the final amount — no hidden fees.
            </p>
          </Section>

          {/* Tracking */}
          <Section icon={Navigation} title="6. Order Tracking">
            <p>
              Once your card is dispatched, a tracking number will be shared with you via the
              order tracking page. You can use it to track your delivery on the courier's website.
            </p>
            <p>
              To track your order, visit the{" "}
              <a href="/track" className="text-primary hover:underline font-medium">
                Track Order
              </a>{" "}
              page and enter your order number.
            </p>
          </Section>

          {/* Failed Delivery */}
          <Section icon={AlertCircle} title="7. Failed Delivery">
            <p>
              If a delivery attempt fails (e.g., recipient unavailable, incorrect address), the
              courier will typically make up to 2–3 attempts before returning the package.
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Please ensure someone is available at the delivery address during business hours</li>
              <li>If the package is returned due to an incorrect address provided by you, re-shipping charges may apply</li>
              <li>If the package is returned due to our error, we will re-ship at no additional cost</li>
            </ul>
            <p className="mt-2">
              Contact us immediately if you notice your address is incorrect after placing an
              order — we can correct it before dispatch.
            </p>
          </Section>

          {/* Damaged in Transit */}
          <Section icon={Camera} title="8. Damaged or Lost in Transit">
            <p>
              If your PVC card arrives damaged or is lost in transit:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Report the issue within <span className="font-medium text-slate-700">48 hours</span> of delivery</li>
              <li>Share a clear photo of the damaged card and packaging</li>
              <li>We will arrange a free replacement or issue a full refund</li>
            </ul>
            <p className="mt-2">
              To report, email us at{" "}
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline font-medium">
                {contact.email}
              </a>{" "}
              with your order number and photos.
            </p>
          </Section>

          {/* Contact */}
          <Section icon={Mail} title="9. Contact Us">
            <p>
              For any shipping-related queries, our support team is available {contact.hours}.
            </p>
            <div className="mt-2 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                  {contact.email}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                  {contact.phone}
                </a>
              </p>
            </div>
          </Section>

          {/* Disclaimer */}
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">Disclaimer</p>
              <p>
                {BRAND.name} is not affiliated with or endorsed by the Department of Food &amp;
                Supplies, Government of West Bengal. Our services are limited only to PVC printing
                of existing e-Ration Cards as uploaded by the customer. Official ration card
                services are available free of cost at food.wb.gov.in.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center pb-4">
            For refund-related queries, see our{" "}
            <a href="/refund" className="underline hover:text-slate-600">Refund Policy</a>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
