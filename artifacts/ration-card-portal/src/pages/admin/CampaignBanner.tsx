import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePricing } from "@/hooks/use-pricing";
import { useContact } from "@/hooks/use-contact";
import { Download, Image as ImageIcon, Share2 } from "lucide-react";

/**
 * Campaign banner image, drawn in the browser on a hidden canvas.
 *
 * Why not a pre-made image file? The banner shows prices and the phone
 * number, and baked-in numbers go stale the moment they are changed in the
 * Settings tab (the same reason the share image carries no prices). Drawing
 * it at render time from usePricing/useContact keeps the downloaded PNG
 * permanently in sync with the live site — nothing is hardcoded.
 */

const BANNER_W = 1080;
const BANNER_H = 1080;
const FALLBACK_TEAL = "hsl(174 65% 28%)";
const LATIN_FONT = "system-ui, 'Segoe UI', Roboto, sans-serif";
const BANGLA_FONT = "'Noto Sans Bengali', 'Nirmala UI', system-ui, sans-serif";

// Same campaign tagging as the WhatsApp text messages, so all WhatsApp
// traffic groups together in analytics.
const SHARE_LINK =
  "https://erationcards.in/order?utm_source=whatsapp&utm_medium=broadcast&utm_campaign=pvc_promo";

/** Brand primary color straight from the live CSS theme, with a safe fallback. */
function primaryColor(): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  if (!raw) return FALLBACK_TEAL;
  return raw.startsWith("hsl") || raw.startsWith("#") || raw.startsWith("rgb") ? raw : `hsl(${raw})`;
}

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // banner still renders without the mark
    img.src = `${import.meta.env.BASE_URL}favicon-192.png`;
  });
}

/** Decode the rendered banner data URL into a shareable PNG file. */
function dataUrlToFile(url: string): File {
  const base64 = url.split(",")[1] ?? "";
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new File([arr], "erationcards-whatsapp-banner.png", { type: "image/png" });
}

/**
 * Copy text to the clipboard and report honestly whether it worked.
 * Never claim success on a silent failure — the UI wording depends on it.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

async function renderBanner(single: number, multi: number, phone: string): Promise<string> {
  await document.fonts.ready.catch(() => undefined);
  const logo = await loadLogo();

  const canvas = document.createElement("canvas");
  canvas.width = BANNER_W;
  canvas.height = BANNER_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Brand background: primary teal with a soft depth gradient.
  ctx.fillStyle = primaryColor();
  ctx.fillRect(0, 0, BANNER_W, BANNER_H);
  const shade = ctx.createLinearGradient(0, 0, 0, BANNER_H);
  shade.addColorStop(0, "rgba(255,255,255,0.10)");
  shade.addColorStop(0.45, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.30)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, BANNER_W, BANNER_H);

  ctx.textAlign = "center";
  const cx = BANNER_W / 2;

  // Logo mark on a white rounded tile so it reads on the teal background.
  const tile = 210;
  const tileY = 78;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  roundedPath(ctx, cx - tile / 2, tileY, tile, tile, 40);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.restore();
  if (logo) {
    const mark = 150;
    ctx.drawImage(logo, cx - mark / 2, tileY + (tile - mark) / 2, mark, mark);
  }

  // Site name + headlines.
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 58px ${LATIN_FONT}`;
  ctx.fillText("erationcards.in", cx, 390);

  ctx.font = `bold 62px ${LATIN_FONT}`;
  ctx.fillText("PVC Ration Card Printing", cx, 490);
  ctx.font = `44px ${BANGLA_FONT}`;
  ctx.fillText("রেশন কার্ড এবার টেকসই পিভিসি কার্ডে", cx, 560);

  // Live price chips: white pills, brand-colored text.
  const chipTexts = [`Single card ₹${single}`, `2+ cards ₹${multi} each`];
  const chipFont = `bold 42px ${LATIN_FONT}`;
  ctx.font = chipFont;
  const chipH = 92;
  const chipPad = 56;
  const chipGap = 28;
  const widths = chipTexts.map((t) => ctx.measureText(t).width + chipPad * 2);
  const totalW = widths[0] + widths[1] + chipGap;
  let chipX = cx - totalW / 2;
  const chipY = 630;
  for (let i = 0; i < chipTexts.length; i++) {
    roundedPath(ctx, chipX, chipY, widths[i], chipH, chipH / 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = primaryColor();
    ctx.font = chipFont;
    ctx.textBaseline = "middle";
    ctx.fillText(chipTexts[i], chipX + widths[i] / 2, chipY + chipH / 2 + 2);
    ctx.textBaseline = "alphabetic";
    chipX += widths[i] + chipGap;
  }

  // Delivery lines, English + Bengali.
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `38px ${LATIN_FONT}`;
  ctx.fillText("Home delivery across West Bengal", cx, 810);
  ctx.font = `38px ${BANGLA_FONT}`;
  ctx.fillText("সারা পশ্চিমবঙ্গে বাড়িতে ডেলিভারি", cx, 868);

  // Contact line.
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 50px ${LATIN_FONT}`;
  ctx.fillText(`Call / WhatsApp: ${phone}`, cx, 950);

  // Honesty small print — required on every public-facing campaign asset.
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `26px ${LATIN_FONT}`;
  ctx.fillText("Private printing service — not a government website.", cx, 1010);
  ctx.font = `26px ${BANGLA_FONT}`;
  ctx.fillText("বেসরকারি পরিষেবা — সরকারি রেশন কার্ড পরিষেবা সবসময় বিনামূল্যে।", cx, 1050);

  return canvas.toDataURL("image/png");
}

export default function CampaignBanner() {
  const pricing = usePricing();
  const contact = useContact();
  const single = pricing.ration.single.public;
  const multi = pricing.ration.multi.public;
  const phone = contact.phone;

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  // Set when native sharing was unavailable: records whether the caption at
  // least reached the clipboard, so the guidance below stays truthful.
  const [fallback, setFallback] = useState<{ copied: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void renderBanner(single, multi, phone).then((url) => {
      if (!cancelled && url) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [single, multi, phone]);

  // Short bilingual caption sent along with the picture. Built from the same
  // live settings as the banner, so the two can never disagree.
  const caption = [
    "erationcards.in — PVC Ration Card Printing",
    `Single card ₹${single} | 2+ cards ₹${multi} each`,
    "Home delivery across West Bengal",
    `Call / WhatsApp: ${phone}`,
    `Order: ${SHARE_LINK}`,
    "",
    "রেশন কার্ড এবার টেকসই পিভিসি কার্ডে। সারা পশ্চিমবঙ্গে বাড়িতে ডেলিভারি।",
    "",
    "Note: We are a private printing service — not a government website. বেসরকারি পরিষেবা — সরকারি রেশন কার্ড পরিষেবা সবসময় বিনামূল্যে।",
  ].join("\n");

  async function handleShare() {
    if (!dataUrl) return;
    const payload = { files: [dataUrlToFile(dataUrl)], text: caption };
    if (
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare(payload)
    ) {
      try {
        await navigator.share(payload);
        setFallback(null);
        return;
      } catch (err) {
        if ((err as DOMException | undefined)?.name === "AbortError") return; // sheet closed by hand — not an error
        // Sharing blocked (some desktop browsers, embedded previews) — fall
        // through to the manual path below.
      }
    }
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "erationcards-whatsapp-banner.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    const copied = await copyToClipboard(caption);
    setFallback({ copied });
  }

  return (
    <Card className="border-0 shadow-sm bg-white" data-testid="card-campaign-banner">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Banner image — attach with your WhatsApp message
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        {dataUrl ? (
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <img
              src={dataUrl}
              alt="Campaign banner: PVC ration card printing with current prices and phone number"
              className="w-full max-w-[300px] rounded-lg border border-slate-200 shadow-sm"
              data-testid="img-campaign-banner"
            />
            <div className="space-y-2.5 text-sm text-slate-600 sm:pt-1">
              <p>
                The banner is built from the live site settings — the website logo, today's prices and
                the current phone number are filled in automatically, just like the messages.
              </p>
              <p>
                On a phone, "Share on WhatsApp" sends the picture and a short ready-made message
                together — pick your broadcast list and send. You can also download the picture and
                attach it yourself. If you change prices later, come back for a fresh copy.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={() => void handleShare()}
                  data-testid="button-share-banner"
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share on WhatsApp (picture + message)
                </Button>
                <Button size="sm" variant="outline" asChild data-testid="link-download-banner">
                  <a href={dataUrl} download="erationcards-whatsapp-banner.png">
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download banner
                  </a>
                </Button>
              </div>
              {fallback && (
                <p className="text-xs text-slate-500" data-testid="text-share-note">
                  {fallback.copied
                    ? "One-tap sharing is not available in this browser, so the picture was downloaded and the message copied instead — open WhatsApp and attach both."
                    : "One-tap sharing is not available in this browser. The picture was downloaded; copying the message did not work, so copy it from the box below."}
                </p>
              )}
              {fallback && !fallback.copied && (
                <pre
                  className="text-xs whitespace-pre-wrap rounded-md border border-slate-200 bg-slate-50 p-2 text-slate-700 select-all"
                  data-testid="text-share-caption"
                >
                  {caption}
                </pre>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Preparing the banner…</p>
        )}
      </CardContent>
    </Card>
  );
}
