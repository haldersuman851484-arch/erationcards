import { Navbar, Footer } from "@/components/layout";
import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, ExternalLink, Shield, FileText, AlertCircle } from "lucide-react";

const GOVT_DOWNLOAD_URL = "https://wbpds.wb.gov.in/E_Card_Download.aspx";

export default function DownloadCard() {
  usePageTitle("Download e-Card");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <div className="bg-primary/5 border-b border-primary/10 py-10">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Download Your Ration Card</h1>
          <p className="text-slate-600">Download your official digital e-Ration card from the West Bengal government portal.</p>
        </div>
      </div>

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-2xl space-y-6">

          <Card className="border-primary/20 shadow-sm">
            <CardContent className="pt-8 pb-8 text-center space-y-5">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Official WB Ration Card Download</h2>
                <p className="text-slate-600 text-sm max-w-sm mx-auto">
                  You will be taken to the West Bengal Public Distribution System (WBPDS) government portal to download your e-Ration card.
                </p>
              </div>
              <a href={GOVT_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  data-testid="button-download-pdf"
                  className="bg-primary hover:bg-primary/90 h-12 px-8 text-base gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download e-Ration Card
                  <ExternalLink className="w-4 h-4 opacity-70" />
                </Button>
              </a>
              <p className="text-xs text-slate-400">
                Opens <span className="font-mono">wbpds.wb.gov.in</span> in a new tab
              </p>
            </CardContent>
          </Card>

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
                  <p className="font-medium mb-1">Want a durable PVC card?</p>
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
