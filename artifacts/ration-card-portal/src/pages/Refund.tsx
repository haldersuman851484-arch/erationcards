import { Navbar, Footer, BRAND } from "@/components/layout";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  AlertTriangle, RefreshCcw, CheckCircle2, XCircle, Clock,
  Mail, Phone, Ban, HelpCircle, IndianRupee,
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

const eligibleCases = [
  "Your payment was confirmed but we were unable to process or deliver your order due to an issue on our end",
  "You cancelled the order before printing began (i.e., before your PDFs were uploaded and printing was initiated)",
  "The printed card was damaged or defective on arrival — supported by a photo within 48 hours of delivery",
  "Duplicate payment was made for the same order",
];

const nonEligibleCases = [
  "The card has already been printed and dispatched",
  "The uploaded PDF contained incorrect or outdated information — we print exactly what is in the document",
  "You changed your mind after printing has begun",
  "The order was cancelled due to submission of fraudulent, forged, or tampered documents",
  "Delivery delays caused by the courier, natural disasters, or other circumstances beyond our control",
  "You provided an incorrect delivery address",
];

export default function Refund() {
  usePageTitle("Refund Policy");

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
              Refund Policy
            </h1>
            <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
            <p className="mt-4 text-slate-600 text-sm leading-relaxed">
              At <span className="font-semibold text-slate-800">{BRAND.name}</span>, we aim to
              deliver every order accurately and on time. Please read this policy carefully to
              understand when refunds are applicable.
            </p>
          </div>

          {/* Eligible */}
          <Section icon={CheckCircle2} title="1. When You Are Eligible for a Refund">
            <p>You may be eligible for a full refund in the following situations:</p>
            <ul className="mt-2 space-y-2">
              {eligibleCases.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Not eligible */}
          <Section icon={XCircle} title="2. When You Are NOT Eligible for a Refund">
            <p>Refunds will not be issued in the following cases:</p>
            <ul className="mt-2 space-y-2">
              {nonEligibleCases.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Process */}
          <Section icon={RefreshCcw} title="3. How to Request a Refund">
            <p>To initiate a refund request, please contact us with the following details:</p>
            <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5 text-slate-700">
              <p>• Your <span className="font-medium">Order Number</span></p>
              <p>• Your <span className="font-medium">registered phone number</span></p>
              <p>• <span className="font-medium">Reason</span> for the refund request</p>
              <p>• Supporting photo (if reporting a damaged card)</p>
            </div>
            <p className="mt-3">Reach us at:</p>
            <div className="mt-2 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${BRAND.email}`} className="text-primary hover:underline">
                  {BRAND.email}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <a href={`tel:${BRAND.phone}`} className="text-primary hover:underline">
                  {BRAND.phone}
                </a>
              </p>
            </div>
          </Section>

          {/* Timeline */}
          <Section icon={Clock} title="4. Refund Processing Time">
            <p>
              Once your refund request is approved, the amount will be returned to your original
              payment source (UPI / bank account) within:
            </p>
            <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="font-semibold text-slate-800 text-base">5–7 working days</p>
              <p className="text-xs text-slate-500 mt-1">
                Actual credit time may vary depending on your bank or payment provider.
              </p>
            </div>
            <p className="mt-2">
              We will notify you via phone or email once the refund has been initiated.
            </p>
          </Section>

          {/* Amount */}
          <Section icon={IndianRupee} title="5. Refund Amount">
            <p>
              Approved refunds will be for the <span className="font-medium text-slate-700">full order amount</span> paid, with no deduction, unless otherwise communicated at the time of approval.
            </p>
            <p>
              In case of a partial order issue (e.g., one card damaged out of multiple), a proportional refund for that card slot may be issued at our discretion.
            </p>
          </Section>

          {/* Fraud */}
          <Section icon={Ban} title="6. Fraudulent Refund Requests">
            <p>
              Any refund request found to be based on false claims or fraudulent intent will be
              rejected immediately. We reserve the right to block future orders from accounts
              associated with fraudulent refund attempts.
            </p>
          </Section>

          {/* Contact */}
          <Section icon={HelpCircle} title="7. Questions?">
            <p>
              If you have any questions about our refund policy or need help with an order,
              our support team is available Monday to Saturday, 10 AM – 6 PM.
            </p>
            <div className="mt-2 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <a href={`mailto:${BRAND.email}`} className="text-primary hover:underline">
                  {BRAND.email}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <a href={`tel:${BRAND.phone}`} className="text-primary hover:underline">
                  {BRAND.phone}
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
                of existing e-Ration Cards as uploaded by the customer. For official ration card
                services, visit food.wb.gov.in — free of cost.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400 text-center pb-4">
            This Refund Policy is part of our{" "}
            <a href="/terms" className="underline hover:text-slate-600">Terms &amp; Conditions</a>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
