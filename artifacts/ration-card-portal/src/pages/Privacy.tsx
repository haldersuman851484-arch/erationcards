import { Navbar, Footer, BRAND } from "@/components/layout";
import { useContact } from "@/hooks/use-contact";
import { useSeo } from "@/hooks/use-seo";
import { AlertTriangle, Shield, Cookie, Database, Lock, Mail, Phone, UserCheck } from "lucide-react";

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

export default function Privacy() {
  const contact = useContact();
  useSeo({
    title: "Privacy & Cookie Policy | PVC Card Portal",
    description: "Read the Privacy and Cookie Policy of PVC Card Portal. Learn how we collect, use, and protect your personal data.",
    canonical: "https://erationcards.in/privacy",
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
              Privacy &amp; Cookie Policy
            </h1>
            <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
            <p className="mt-4 text-slate-600 text-sm leading-relaxed">
              This policy explains how{" "}
              <span className="font-semibold text-slate-800">{BRAND.name}</span> collects, uses,
              and protects the personal information you provide when using our PVC ration card
              printing service.
            </p>
          </div>

          {/* Sections */}
          <Section icon={Database} title="1. Information We Collect">
            <p>When you place an order or register as an operator, we collect:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Full name, phone number, and email address</li>
              <li>Delivery address (street, district, pincode)</li>
              <li>Ration card number(s) and card type</li>
              <li>Payment confirmation from our payment gateway (order ID and payment status — never your UPI PIN or card details)</li>
              <li>e-Ration Card PDF file(s) uploaded for printing</li>
            </ul>
            <p className="mt-2">
              We do not collect any Aadhaar numbers, bank account details, or passwords.
            </p>
          </Section>

          <Section icon={UserCheck} title="2. How We Use Your Information">
            <p>We use your information solely to:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Process and fulfil your PVC card printing order</li>
              <li>Confirm your online payment through our payment gateway</li>
              <li>Deliver the printed card to your address</li>
              <li>Send order status updates (if email/phone provided)</li>
            </ul>
            <p className="mt-2 font-medium text-slate-700">
              We do not sell, rent, or share your personal information with any third party for
              marketing purposes.
            </p>
          </Section>

          <Section icon={Lock} title="3. Data Storage &amp; Security">
            <p>
              All data is stored on secured servers. Uploaded PDF files are
              retained only for the duration required to fulfil your order. We implement reasonable
              technical safeguards to protect your data from unauthorised access.
            </p>
            <p>
              You may request deletion of your personal data at any time by contacting us at{" "}
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline font-medium">
                {contact.email}
              </a>
              .
            </p>
          </Section>

          <Section icon={Cookie} title="4. Cookies">
            <p>
              This website uses only{" "}
              <span className="font-medium text-slate-700">functional cookies</span> — small files
              stored in your browser to keep you logged in as an operator or admin across page
              loads.
            </p>
            <p>We do <span className="font-medium text-slate-700">not</span> use:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Advertising or tracking cookies</li>
              <li>Analytics cookies (e.g. Google Analytics)</li>
              <li>Third-party marketing pixels</li>
            </ul>
            <p className="mt-2">
              You can clear cookies at any time through your browser settings. Disabling cookies
              may prevent operator/admin login from working correctly.
            </p>
          </Section>

          <Section icon={Shield} title="5. Third-Party Services">
            <p>
              Payments are processed securely by Cashfree Payments, an RBI-authorised payment
              gateway. Your UPI, card or net-banking details are handled on Cashfree's systems
              under their own privacy policy — we never see your UPI PIN, card number or bank
              password, and we do not have access to your bank or wallet account.
            </p>
          </Section>

          <Section icon={Mail} title="6. Your Rights">
            <p>You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Request a copy of the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data after order completion</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at:</p>
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
                Supplies, Government of West Bengal. Official ration card services are available
                free of cost at food.wb.gov.in. Our services are limited only to PVC printing of
                existing e-Ration Cards as uploaded by the customer.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center pb-4">
            By using this website, you agree to the terms of this Privacy &amp; Cookie Policy.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
