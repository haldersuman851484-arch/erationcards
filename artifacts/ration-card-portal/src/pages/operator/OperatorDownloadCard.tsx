import { useEffect } from "react";
import { useLocation } from "wouter";
import { OperatorLayout } from "@/components/OperatorLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGetCurrentOperator,
  getGetCurrentOperatorQueryKey,
  useLogoutOperator,
} from "@workspace/api-client-react";
import { Download, ExternalLink, Shield, FileText, AlertCircle, Smartphone, Globe } from "lucide-react";

const GOVT_DOWNLOAD_URL = "https://wbpds.wb.gov.in/E_Card_Download.aspx";

function getAuthHeader() {
  const token = localStorage.getItem("operatorToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function OperatorDownloadCard() {
  const [, setLocation] = useLocation();

  const { data: operator, error: opError } = useGetCurrentOperator({
    query: { queryKey: getGetCurrentOperatorQueryKey() },
    request: { headers: getAuthHeader() },
  } as any);

  const logoutOperator = useLogoutOperator();

  useEffect(() => { if (opError) setLocation("/operator/login"); }, [opError, setLocation]);

  function handleLogout() {
    logoutOperator.mutate(undefined, {
      onSuccess: () => { localStorage.removeItem("operatorToken"); setLocation("/operator/login"); },
    });
  }

  return (
    <OperatorLayout
      operatorName={operator?.name}
      shopName={operator?.shopName}
      district={operator?.district}
      onLogout={handleLogout}
    >
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Download e-Card</h1>
          <p className="text-slate-500 text-sm mt-0.5">Help customers download their official digital ration card from the WB government portal.</p>
        </div>

        <Card className="border-0 shadow-sm bg-white mb-5">
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <Download className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">WB Ration Card e-Download</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed">
                Opens the West Bengal Public Distribution System (WBPDS) government portal where customers can download their official e-Ration card.
              </p>
            </div>
            <a href={GOVT_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <Button className="bg-primary hover:bg-primary/90 h-12 px-8 gap-2 text-base">
                <Download className="w-5 h-5" />
                Open Download Portal
                <ExternalLink className="w-4 h-4 opacity-70" />
              </Button>
            </a>
            <p className="text-xs text-slate-400 font-mono">wbpds.wb.gov.in</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { icon: Shield, title: "Officially Recognized", desc: "Accepted at all government PDS outlets and fair price shops." },
            { icon: Download, title: "Instant Download", desc: "Download digital copy instantly in high-quality PDF format." },
            { icon: FileText, title: "Print Ready", desc: "Printable on A4 paper at home or at any print shop." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-4 border-0 shadow-sm text-center">
              <Icon className="w-7 h-7 text-primary mx-auto mb-2" />
              <h4 className="font-semibold text-slate-900 text-xs mb-1">{title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <Card className="border-0 shadow-sm bg-amber-50 border border-amber-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-semibold mb-1">Operator Tip</p>
                <p className="text-xs leading-relaxed">The digital e-Ration Card is a government PDF. For a durable, wallet-size PVC printed version, use <button className="underline font-medium cursor-pointer" onClick={() => setLocation("/operator/order")}>Order PVC Card</button> — your shop can earn from printing orders.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 bg-white rounded-xl p-4 shadow-sm border-0">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" /> How to guide customers
          </h3>
          <ol className="space-y-2">
            {[
              "Open the download portal link above on a desktop or smartphone browser",
              "Enter the customer's ration card number and registered mobile number",
              "Complete OTP verification",
              "Download and save the PDF — it can be printed directly",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </OperatorLayout>
  );
}
