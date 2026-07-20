import { Navbar, Footer } from "@/components/layout";
import { useSeo } from "@/hooks/use-seo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const FAQS = [
  {
    q: "What is a PVC Ration Card?",
    a: "A PVC Ration Card is a durable, wallet-size printed version of your digital e-Ration card. Made from high-quality PVC material, it is waterproof, tear-resistant, and lasts for years unlike regular paper cards.",
  },
  {
    q: "How do I place an order?",
    a: "Click on 'Order PVC Card' from the home page, fill in your personal details, ration card number, delivery address, select the card category (APL/BPL/AAY), and complete the payment of ₹50 per card.",
  },
  {
    q: "How long does delivery take?",
    a: "Your PVC card will be printed and delivered within 5–7 working days from the date of order placement, depending on your location.",
  },
  {
    q: "How do I track my order?",
    a: "Use the 'Track Order' feature on our portal. Enter your order number (provided after placing an order) or your ration card number to see the current status.",
  },
  {
    q: "What is the cost of a PVC card?",
    a: "The printing and delivery fee is ₹50 per card. This covers the PVC card material, printing, and doorstep delivery charges.",
  },
  {
    q: "Can I order multiple cards?",
    a: "Yes, you can order many cards in a single order. The price is ₹50 per card regardless of quantity.",
  },
  {
    q: "Is the PVC card officially accepted?",
    a: "Yes, our PVC cards are printed from your official government e-Ration card data and are accepted at all government PDS (Public Distribution System) outlets and fair price shops.",
  },
  {
    q: "What are APL, BPL, and AAY categories?",
    a: "APL (Above Poverty Line), BPL (Below Poverty Line), and AAY (Antyodaya Anna Yojana) are government-defined ration card categories based on household income and economic status. Your category is already determined by the government and printed on your ration card.",
  },
  {
    q: "How can I become an operator / printing partner?",
    a: "Register as an operator by clicking 'Register As Operator' from the home page or footer. Fill in your shop and personal details. Once approved, you can receive card printing orders in your area.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept UPI (GPay, PhonePe, Paytm), Net Banking.",
  },
  {
    q: "My order shows 'delivered' but I haven't received it. What do I do?",
    a: "Please contact our support team at help@erationcards.in or call +91 96359 60507 with your order number. Our team will investigate and assist you within 24 hours.",
  },
  {
    q: "Can I get a refund if I cancel my order?",
    a: "Cancellations are accepted within 24 hours of placing the order if printing has not started. Contact our support team to initiate a cancellation. Once printing has started, cancellations may not be possible.",
  },
];

export default function FAQ() {
  useSeo({
    title: "FAQ — Frequently Asked Questions | PVC Ration Card Printing",
    description: "Answers to common questions about ordering PVC ration cards, pricing, delivery timelines, payment methods, and more. West Bengal e-Ration Card printing service.",
    canonical: "https://erationcards.in/faq",
  });
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-12">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-slate-600">Find answers to common questions about our PVC Ration Card service.</p>
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
