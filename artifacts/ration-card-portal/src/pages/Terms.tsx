import { Navbar, Footer, BRAND } from "@/components/layout";
import { useContact } from "@/hooks/use-contact";
import { useSeo } from "@/hooks/use-seo";
import {
  AlertTriangle, FileCheck, ShoppingCart, Upload, RefreshCcw,
  Truck, Ban, Shield, Info, Phone, Mail, FilePen,
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

export default function Terms() {
  const contact = useContact();
  useSeo({
    title: "Terms & Conditions | PVC Card Portal",
    description: "Read the Terms & Conditions of PVC Card Portal. Understand your rights and responsibilities when using our PVC ration card printing service.",
    canonical: "https://erationcards.in/terms",
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
              Terms &amp; Conditions
            </h1>
            <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
            <p className="mt-4 text-slate-600 text-sm leading-relaxed">
              Please read these Terms &amp; Conditions carefully before using{" "}
              <span className="font-semibold text-slate-800">{BRAND.name}</span>. By placing an
              order or using this website, you agree to be bound by these terms.
            </p>
          </div>

          {/* Sections */}
          <Section icon={FileCheck} title="1. Acceptance of Terms">
            <p>
              By accessing or using this website and placing an order, you confirm that you have
              read, understood, and agreed to these Terms &amp; Conditions. If you do not agree,
              please do not use this service.
            </p>
          </Section>

          <Section icon={Info} title="2. Our Service">
            <p>
              {BRAND.name} is a <span className="font-medium text-slate-700">private PVC card
              printing service</span>. We print durable PVC ration cards from the official
              e-Ration Card PDFs provided by customers. We are not a government service and are
              not affiliated with the Department of Food &amp; Supplies, Government of West Bengal.
            </p>
            <p>
              We do not issue, modify, correct, or cancel ration cards. All such services are
              available free of cost at the official government portal{" "}
              <a href="https://food.wb.gov.in" target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline font-medium">food.wb.gov.in</a>.
            </p>
          </Section>

          <Section icon={Shield} title="3. Eligibility">
            <p>
              By placing an order, you confirm that:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>You are the legitimate holder or authorised representative of the ration card being printed</li>
              <li>All information and documents you provide are genuine and accurate</li>
              <li>You are at least 18 years of age</li>
            </ul>
          </Section>

          <Section icon={ShoppingCart} title="4. Ordering &amp; Payment">
            <ul className="list-disc list-inside space-y-1">
              <li>Payment must be made in advance via UPI (GPay, PhonePe, Paytm) or Net Banking</li>
              <li>An order is confirmed only after our team manually verifies your payment screenshot</li>
              <li>We reserve the right to reject any order that appears fraudulent or incomplete</li>
              <li>Prices are subject to change without prior notice; the price shown at checkout applies to your order</li>
            </ul>
          </Section>

          <Section icon={Upload} title="5. PDF Upload Responsibility">
            <p>
              You are solely responsible for uploading the correct and original e-Ration Card PDF
              downloaded from the official government website. We print exactly what is in the
              uploaded document.
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>We are not responsible for errors, misprints, or outdated information present in the source PDF</li>
              <li>Do not modify, edit, or tamper with the PDF before uploading</li>
              <li>One PDF per card holder slot must be uploaded before processing begins</li>
            </ul>
          </Section>

          <Section icon={RefreshCcw} title="6. Refund Policy">
            <ul className="list-disc list-inside space-y-1">
              <li>Refund requests must be submitted before printing has begun</li>
              <li>Once a card has been printed and dispatched, no refund will be issued</li>
              <li>If we are unable to process your order due to an issue on our end, a full refund will be provided</li>
              <li>Orders cancelled due to fraudulent or invalid documents will not be refunded</li>
            </ul>
            <p className="mt-2">
              To request a refund, contact us at{" "}
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline font-medium">
                {contact.email}
              </a>{" "}
              with your order number.
            </p>
          </Section>

          <Section icon={Truck} title="7. Delivery">
            <ul className="list-disc list-inside space-y-1">
              <li>Estimated delivery is <span className="font-medium text-slate-700">5–7 working days</span> after payment confirmation and PDF upload</li>
              <li>Delivery timelines may vary due to courier delays, public holidays, or remote locations</li>
              <li>We are not liable for delays caused by the courier or circumstances beyond our control</li>
              <li>Please ensure the delivery address provided is complete and accurate; we cannot be held responsible for non-delivery due to incorrect addresses</li>
            </ul>
          </Section>

          <Section icon={Ban} title="8. Prohibited Use">
            <p>You must not use this service to:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Upload fraudulent, forged, or tampered ration card documents</li>
              <li>Order a PVC card for a person other than the legitimate card holder without authorisation</li>
              <li>Engage in any activity that violates applicable Indian laws or regulations</li>
            </ul>
            <p className="mt-2 font-medium text-slate-700">
              Orders found to involve fraudulent documents will be cancelled immediately without
              refund, and may be reported to the relevant authorities.
            </p>
          </Section>

          <Section icon={FilePen} title="9. Limitation of Liability">
            <p>
              {BRAND.name} is a printing intermediary only. We are not liable for:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Errors or inaccuracies in government ration card data</li>
              <li>Rejection of the printed PVC card at any government outlet</li>
              <li>Any indirect, consequential, or incidental damages arising from use of our service</li>
            </ul>
            <p className="mt-2">
              Our maximum liability in any case is limited to the amount paid for the specific order in question.
            </p>
          </Section>

          <Section icon={Info} title="10. Amendments">
            <p>
              We may update these Terms &amp; Conditions at any time. Changes will be posted on
              this page with an updated date. Continued use of the website after changes are posted
              constitutes your acceptance of the revised terms.
            </p>
          </Section>

          <Section icon={Mail} title="11. Contact Us">
            <p>For any questions regarding these terms, reach us at:</p>
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
                Supplies, Government of West Bengal. Official ration card services, including
                application and correction, are available free of cost at food.wb.gov.in. Our
                services are limited only to PVC printing of existing e-Ration Cards as uploaded
                by the customer.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center pb-4">
            By placing an order, you confirm that you have read and agree to these Terms &amp; Conditions.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
