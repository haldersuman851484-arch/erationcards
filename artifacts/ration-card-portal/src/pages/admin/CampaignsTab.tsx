import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePricing } from "@/hooks/use-pricing";
import { useContact } from "@/hooks/use-contact";
import type { PricingMatrix } from "@workspace/pricing";
import type { ContactDisplay } from "@workspace/contact";
import { Megaphone, Copy, Check, MessageCircle, Smartphone, Info } from "lucide-react";

/**
 * Ready-to-send campaign messages for WhatsApp broadcasts and SMS.
 *
 * The texts are built at render time from the SAME live settings the rest of
 * the site uses (usePricing / useContact), so a price or phone-number change
 * in the Settings tab updates every message automatically — nothing here is
 * hardcoded.
 *
 * Wording rules (must stay): we are a private printing service, never a
 * government website, and the government's own ration-card services are
 * always free. Every long message carries that disclaimer.
 */

type CampaignMessage = {
  id: string;
  title: string;
  channel: "whatsapp" | "sms";
  lang: "en" | "bn";
  text: string;
};

/** Campaign-tagged link for WhatsApp (message length is free there), so GA4 (when enabled) attributes visits. */
const WHATSAPP_LINK = "https://erationcards.in/order?utm_source=whatsapp&utm_medium=broadcast&utm_campaign=pvc_promo";
/** SMS is billed per part, so its link stays as short as possible — bare domain, no tracking tag. */
const SMS_LINK = "erationcards.in";

function buildCampaignMessages(pricing: PricingMatrix, contact: ContactDisplay): CampaignMessage[] {
  const single = pricing.ration.single.public;
  const multi = pricing.ration.multi.public;
  const phone = contact.phone;

  return [
    {
      id: "whatsapp-en",
      title: "WhatsApp message — English",
      channel: "whatsapp",
      lang: "en",
      text: `*PVC Ration Card Printing — West Bengal*

Get your existing WB ration card printed on a durable, waterproof PVC card (ATM-card size) — delivered to your home, anywhere in West Bengal.

✅ Single card: ₹${single}
✅ Family orders (2 or more cards): ₹${multi} per card
✅ ABHA & E-SHRAM PVC cards also available
✅ Home delivery across all 23 districts
✅ Track your order online anytime

Order in 2 minutes:
${WHATSAPP_LINK}

Call / WhatsApp: ${phone}

_Note: We are a private printing service, not a government website. Ration cards and all government food-supply services are always free from the WB Food & Supplies Department — we only print your existing card on durable PVC for convenience._`,
    },
    {
      id: "whatsapp-bn",
      title: "WhatsApp message — Bengali (বাংলা)",
      channel: "whatsapp",
      lang: "bn",
      text: `*পিভিসি রেশন কার্ড প্রিন্টিং — পশ্চিমবঙ্গ*

আপনার বর্তমান রেশন কার্ডটি টেকসই, জলরোধী পিভিসি কার্ডে (এটিএম কার্ডের মাপে) প্রিন্ট করিয়ে নিন — পশ্চিমবঙ্গের যে কোনও জেলায় বাড়িতে ডেলিভারি।

✅ একটি কার্ড: ₹${single}
✅ পরিবারের অর্ডার (২টি বা তার বেশি): প্রতি কার্ড ₹${multi}
✅ ABHA ও E-SHRAM পিভিসি কার্ডও পাওয়া যায়
✅ ২৩টি জেলাতেই বাড়িতে ডেলিভারি
✅ অনলাইনে অর্ডার ট্র্যাক করুন

মাত্র ২ মিনিটে অর্ডার করুন:
${WHATSAPP_LINK}

ফোন / হোয়াটসঅ্যাপ: ${phone}

_বিঃদ্রঃ আমরা একটি বেসরকারি প্রিন্টিং পরিষেবা, কোনও সরকারি ওয়েবসাইট নই। রেশন কার্ড এবং সরকারি খাদ্য পরিষেবা পশ্চিমবঙ্গ খাদ্য ও সরবরাহ দপ্তর থেকে সবসময় বিনামূল্যে পাওয়া যায় — আমরা শুধু আপনার বর্তমান কার্ডটি সুবিধার জন্য টেকসই পিভিসি-তে প্রিন্ট করি।_`,
    },
    {
      id: "sms-en",
      title: "Short SMS — English",
      channel: "sms",
      lang: "en",
      text: `Print your WB ration card on durable PVC. Home delivery. Single Rs.${single}, family Rs.${multi}/card. Private printing service. Order: ${SMS_LINK} Ph: ${phone}`,
    },
    {
      id: "sms-bn",
      title: "Short SMS — Bengali (বাংলা)",
      channel: "sms",
      lang: "bn",
      text: `রেশন কার্ড টেকসই পিভিসি কার্ডে, বাড়িতে ডেলিভারি। একটি ₹${single}, পরিবারে ₹${multi}/কার্ড। বেসরকারি পরিষেবা। ${SMS_LINK} ফোন: ${phone}`,
    },
  ];
}

/**
 * SMS length rules: plain ASCII text (GSM-7 encoding) fits 160 characters in
 * one SMS, or 153 per part when split. Anything containing non-ASCII
 * characters (like Bengali) is sent as Unicode SMS — 70 characters in one,
 * or 67 per part when split. Operators bill per part.
 */
function smsPartCount(text: string): { chars: number; parts: number } {
  const chars = text.length;
  const ascii = /^[\x00-\x7F]*$/.test(text);
  const single = ascii ? 160 : 70;
  const perPart = ascii ? 153 : 67;
  return { chars, parts: chars <= single ? 1 : Math.ceil(chars / perPart) };
}

/** Clipboard write with a legacy fallback for older phone browsers. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function CampaignsTab() {
  const pricing = usePricing();
  const contact = useContact();
  const messages = buildCampaignMessages(pricing, contact);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyFailedId, setCopyFailedId] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  async function handleCopy(m: CampaignMessage) {
    const ok = await copyText(m.text);
    if (!mounted.current) return; // tab switched away while the clipboard call was in flight
    setCopiedId(ok ? m.id : null);
    setCopyFailedId(ok ? null : m.id);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      setCopiedId(null);
      setCopyFailedId(null);
    }, 2500);
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Campaign Messages
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Ready-made promotion messages with your website link. Prices and the phone number are
            filled in automatically from the live site settings — if you change them in the Settings
            tab, these messages update by themselves.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {messages.map((m) => {
          const isCopied = copiedId === m.id;
          const isFailed = copyFailedId === m.id;
          return (
            <Card key={m.id} className="border-0 shadow-sm bg-white flex flex-col" data-testid={`campaign-message-${m.id}`}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-slate-800">{m.title}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {m.channel === "whatsapp" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 gap-1"><MessageCircle className="w-3 h-3" /> WhatsApp</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-700 border border-blue-200 gap-1"><Smartphone className="w-3 h-3" /> SMS</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-3 pt-0">
                <pre
                  lang={m.lang === "bn" ? "bn" : undefined}
                  className="flex-1 whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3"
                >
                  {m.text}
                </pre>
                {m.channel === "sms" &&
                  (() => {
                    const { chars, parts } = smsPartCount(m.text);
                    return (
                      <p className="text-xs text-slate-400" data-testid={`sms-parts-${m.id}`}>
                        {chars} characters —{" "}
                        {parts === 1
                          ? "fits in a single SMS."
                          : `delivered as one message but billed as ${parts} joined SMS parts.`}
                      </p>
                    );
                  })()}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={isCopied ? "default" : "outline"}
                    className={isCopied ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""}
                    onClick={() => void handleCopy(m)}
                    data-testid={`button-copy-${m.id}`}
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                    {isCopied ? "Copied!" : "Copy message"}
                  </Button>
                  {m.channel === "whatsapp" && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      asChild
                      data-testid={`button-whatsapp-${m.id}`}
                    >
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(m.text)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                        Open in WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
                {isFailed && (
                  <p className="text-xs text-red-500">
                    Could not copy automatically — press and hold the message text to select and copy it.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border border-primary/15 bg-primary/5 shadow-none">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="text-sm text-slate-600 space-y-1.5">
              <p className="font-medium text-slate-800">How to send to many people at once</p>
              <p>
                In WhatsApp: tap <span className="font-medium">⋮ → New broadcast</span>, pick up to 256
                contacts, then paste the message (or use "Open in WhatsApp" and forward it). Only people
                who have saved your number will receive a broadcast.
              </p>
              <p>
                The WhatsApp links carry a small campaign tag, so once analytics is switched on you can
                see how many visitors a campaign brought. The SMS versions use the bare website address
                instead — SMS is billed per part, so every extra character costs money.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
