import { Navbar, Footer, BRAND } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { useState } from "react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-12">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Contact Support</h1>
          <p className="text-slate-600">Need help? Our support team is ready to assist you with any queries.</p>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4">Get in Touch</h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                For order-related queries, use your order number. For technical issues, our support team is available Monday–Saturday.
              </p>
            </div>

            {[
              { icon: Phone, label: "Phone / WhatsApp", value: BRAND.phone, sub: BRAND.hours },
              { icon: Mail, label: "Email Support", value: BRAND.email, sub: "Response within 24 hours" },
              { icon: MapPin, label: "Office Address", value: BRAND.address, sub: BRAND.city },
              { icon: Clock, label: "Working Hours", value: "Monday – Saturday", sub: "9:00 AM to 6:00 PM IST" },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div key={label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{label}</p>
                  <p className="text-slate-700 text-sm">{value}</p>
                  <p className="text-slate-500 text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Send a Message</CardTitle>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">✓</span>
                  </div>
                  <p className="font-medium text-slate-900 mb-2">Message Sent!</p>
                  <p className="text-sm text-slate-500">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Name</label>
                    <Input data-testid="input-contact-name" placeholder="Full name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                    <Input data-testid="input-contact-email" type="email" placeholder="your@email.com" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Order Number (optional)</label>
                    <Input data-testid="input-contact-order" placeholder="e.g. PVCMH1A2B3C" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                    <Textarea data-testid="input-contact-message" placeholder="Describe your issue or query..." rows={4} required />
                  </div>
                  <Button type="submit" data-testid="button-contact-submit" className="w-full bg-primary hover:bg-primary/90">Send Message</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
