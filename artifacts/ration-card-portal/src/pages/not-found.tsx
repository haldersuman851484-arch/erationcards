import { useEffect } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  // Tell search engines not to index unknown URLs (they serve the SPA shell
  // with a 200 status, so without this they'd look like duplicate pages).
  useEffect(() => {
    document.title = "Page Not Found | PVC Card Portal";
    let el = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = el?.getAttribute("content") ?? null;
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "robots");
      document.head.appendChild(el);
    }
    el.setAttribute("content", "noindex, nofollow");
    return () => {
      const meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (meta && previous) meta.setAttribute("content", previous);
      else if (meta && !previous) meta.remove();
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">Page Not Found</h1>
          </div>
          <p className="text-sm text-gray-600">
            The page you are looking for doesn't exist or may have moved. It's
            also possible the address was typed incorrectly.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href="/">
              <Button className="w-full sm:w-auto" data-testid="button-notfound-home">
                Go to Homepage
              </Button>
            </Link>
            <Link href="/order">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-notfound-order">
                Order a PVC Card
              </Button>
            </Link>
            <Link href="/track">
              <Button variant="outline" className="w-full sm:w-auto" data-testid="button-notfound-track">
                Track Order
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
