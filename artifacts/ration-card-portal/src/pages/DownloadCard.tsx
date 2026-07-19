import { useState } from "react";
import { Navbar, Footer } from "@/components/layout";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Shield, AlertCircle } from "lucide-react";

export default function DownloadCard() {
  usePageTitle("Download e-Card");
  const [rationCardNumber, setRationCardNumber] = useState("");
  const [searched, setSearched] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (rationCardNumber.trim().length >= 5) setSearched(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-10">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Download Your Ration Card</h1>
          <p className="text-slate-600">Get your digital e-Ration card in PDF format. Enter your ration card number to proceed.</p>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-5 h-5 text-primary" /> Enter Your Ration Card Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Ration Card Number *</label>
                  <Input
                    data-testid="input-ration-card-number"
                    placeholder="e.g. RC-MH-2024-001234"
                    value={rationCardNumber}
                    onChange={(e) => { setRationCardNumber(e.target.value); setSearched(false); }}
                    className="h-11"
                  />
                </div>
                <Button type="submit" data-testid="button-search-card" className="w-full bg-primary hover:bg-primary/90 h-11" disabled={rationCardNumber.trim().length < 5}>
                  <Download className="w-4 h-4 mr-2" /> Search & Download
                </Button>
              </form>
            </CardContent>
          </Card>

          {searched && (
            <Card className="border-primary/20 bg-primary/5 shadow-sm" data-testid="download-result-card">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">e-Ration Card Ready</h3>
                    <p className="text-sm text-slate-600 mb-1">Card Number: <span className="font-mono font-medium text-primary">{rationCardNumber}</span></p>
                    <p className="text-xs text-slate-500 mb-4">Format: PDF (A4) — Digital, printable format recognized by PDS outlets.</p>
                    <Button className="bg-primary hover:bg-primary/90" data-testid="button-download-pdf">
                      <Download className="w-4 h-4 mr-2" /> Download PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
              <Shield className="w-8 h-8 text-primary mx-auto mb-3" />
              <h4 className="font-medium text-slate-900 text-sm mb-1">Officially Recognized</h4>
              <p className="text-xs text-slate-500">Accepted at all government PDS outlets and fair price shops.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
              <Download className="w-8 h-8 text-primary mx-auto mb-3" />
              <h4 className="font-medium text-slate-900 text-sm mb-1">Instant Download</h4>
              <p className="text-xs text-slate-500">Download your digital copy instantly in high-quality PDF format.</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
              <FileText className="w-8 h-8 text-primary mx-auto mb-3" />
              <h4 className="font-medium text-slate-900 text-sm mb-1">Print Ready</h4>
              <p className="text-xs text-slate-500">Printable on standard A4 paper at home or at any print shop.</p>
            </div>
          </div>

          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Important Note</p>
                  <p>The digital e-Ration Card is a computer-generated document. For a durable, wallet-size PVC card, please use our <a href="/order" className="underline font-medium">Order PVC Card</a> service.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
