import { Navbar, Footer } from "@/components/layout";
import { useSeo } from "@/hooks/use-seo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PRICING } from "@workspace/pricing";

const FAQS = [
  {
    q: "What is a PVC Ration Card?",
    a: "A PVC Ration Card is a durable, wallet-size printed version of your digital e-Ration card. Made from high-quality PVC (polyvinyl chloride) material, it is waterproof, tear-resistant, and lasts for years unlike regular paper cards. The standard size is 85.6mm × 54mm — exactly the same as a credit or debit card.",
  },
  {
    q: "Is it legal to print a government ration card on PVC?",
    a: "Yes. Printing your existing, officially issued e-Ration Card on a PVC card for personal convenience is permitted. We do not modify, edit, or tamper with any government-issued content — we only reproduce your existing approved card onto a durable PVC format. Our service is a private printing service, not a government body.",
  },
  {
    q: "What is the size of the PVC ration card?",
    a: "The PVC card is printed in the standard CR80 credit card size: 85.6mm × 54mm (3.375\" × 2.125\") with a thickness of approximately 760 microns. It fits perfectly in any standard wallet slot alongside your Aadhaar, PAN card, or driving licence.",
  },
  {
    q: "Which ration card types (AAY, PHH, SPHH, RKSY) do you support?",
    a: "We support PVC printing for all West Bengal ration card categories: AAY (Antyodaya Anna Yojana), PHH (Priority Household), SPHH (Special Priority Household), RKSY-I (Rajya Khadya Suraksha Yojana Category I), and RKSY-II (Rajya Khadya Suraksha Yojana Category II). Your card category is already determined by the government — simply upload your e-Ration Card PDF and we'll print whichever type you have.",
  },
  {
    q: "Which districts in West Bengal do you deliver to?",
    a: "We deliver to all 23 districts of West Bengal: Kolkata, Howrah, North 24 Parganas, South 24 Parganas, Murshidabad, Purba Bardhaman, Paschim Bardhaman, Nadia, Hooghly, Paschim Medinipur, Purba Medinipur, Bankura, Purulia, Birbhum, Malda, Uttar Dinajpur, Dakshin Dinajpur, Jalpaiguri, Darjeeling, Cooch Behar, Alipurduar, Jhargram, and Kalimpong. Delivery is via Speed Post.",
  },
  {
    q: "How is this different from the government ration card service?",
    a: "The Government of West Bengal issues free digital e-Ration Cards (PDF format) through food.wb.gov.in. Our service is separate — we take your already-approved e-Ration Card and print it onto a durable, wallet-size PVC card for a small printing fee. We do not issue, create, or modify any government documents. Official services (new applications, corrections, updates) are free at food.wb.gov.in.",
  },
  {
    q: "Can I order PVC cards for all family members?",
    a: `Yes. You can order a PVC card for every member listed on your ration card. Ration card prints cost ₹${PRICING.ration.single.public} for one card, or ₹${PRICING.ration.multi.public} per card when you order 2 or more together. You'll upload the PDF for each family member during the order process.`,
  },
  {
    q: "How do I place an order?",
    a: "Click on 'Order PVC Card' from the home page, fill in your personal details, ration card number, and delivery address. Select your card category (AAY / PHH / SPHH / RKSY-I / RKSY-II — or ABHA / E-SHRAM / GENERAL for other PVC cards), complete the UPI payment, and upload your e-Ration Card PDF. We'll take care of printing and delivery.",
  },
  {
    q: "How long does delivery take?",
    a: "Your PVC card will be printed and dispatched within 24–48 hours of payment and PDF confirmation. Delivery via Speed Post typically takes 3–5 working days within West Bengal and 5–7 working days for other states.",
  },
  {
    q: "How do I track my order?",
    a: "Use the 'Track Order' feature on our portal. Enter your order number (provided after placing an order) or your ration card number to see the current status: Pending → Confirmed → Printed → Dispatched → Delivered.",
  },
  {
    q: "What is the cost of a PVC card?",
    a: `A PVC ration card costs ₹${PRICING.ration.single.public} for a single card, or ₹${PRICING.ration.multi.public} per card when you order 2 or more (printing and delivery included). ABHA, E-SHRAM and GENERAL PVC cards cost ₹${PRICING.special.single.public} for a single card, or ₹${PRICING.special.multi.public} per card for 2 or more.`,
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept UPI payments via Google Pay, PhonePe, Paytm, and any UPI-enabled app. After placing your order, you'll receive our UPI ID and a QR code to scan for payment.",
  },
  {
    q: "How can I become an operator / printing partner?",
    a: "Register as an operator by clicking 'Register As Operator' from the home page or footer. Fill in your shop and personal details. Once approved, you can receive card printing orders in your area and earn per-card commissions.",
  },
  {
    q: "My order shows 'delivered' but I haven't received it. What do I do?",
    a: "Please contact our support team at help@erationcards.in or call +91 96359 60507 with your order number. Our team will investigate and assist you within 24 hours.",
  },
  {
    q: "Can I get a refund if I cancel my order?",
    a: "Cancellations are accepted within 24 hours of placing the order if printing has not started. Contact our support team to initiate a cancellation. Once printing has started, cancellations may not be possible. See our Refund Policy for details.",
  },
];

export default function FAQ() {
  useSeo({
    title: "FAQ — PVC Ration Card Printing | AAY PHH SPHH RKSY West Bengal",
    description: "Answers to common questions about PVC ration card printing: legality, card size (85.6mm×54mm), card types (AAY, PHH, SPHH, RKSY-I, RKSY-II, ABHA, E-SHRAM, GENERAL), district delivery, pricing from ₹50, and more.",
    canonical: "https://erationcards.in/faq",
  });
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-12">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-slate-600">
            Everything you need to know about ordering a PVC ration card in West Bengal — legality, card types (AAY, PHH, SPHH, RKSY-I, RKSY-II), delivery districts, and pricing.
          </p>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, idx) => (
              <AccordionItem key={idx} value={`faq-${idx}`} className="border border-slate-200 rounded-lg px-2 shadow-sm bg-white">
                <AccordionTrigger className="text-left font-medium text-slate-900 py-4 hover:no-underline hover:text-primary">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-600 text-sm leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 bg-primary/5 rounded-2xl p-8 text-center border border-primary/20">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Still have questions?</h3>
            <p className="text-slate-600 text-sm mb-5">Our support team is happy to help you with any other queries.</p>
            <Link href="/contact">
              <Button className="bg-primary hover:bg-primary/90 px-8">Contact Support</Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
