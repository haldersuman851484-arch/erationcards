import { useEffect } from "react";
import { Link, useParams } from "wouter";
import { Navbar, Footer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useSeo } from "@/hooks/use-seo";
import { MapPin, CreditCard, Truck, CheckCircle, Clock, Shield } from "lucide-react";

const SITE_URL = "https://erationcards.in";

interface DistrictInfo {
  slug: string;
  name: string;
  bengali: string;
  pinRange: string;
  landmark: string;
  deliveryNote: string;
}

export const DISTRICTS: Record<string, DistrictInfo> = {
  kolkata: {
    slug: "kolkata",
    name: "Kolkata",
    bengali: "কলকাতা",
    pinRange: "700001–700156",
    landmark: "the capital of West Bengal",
    deliveryNote: "Express Speed Post delivery within 2–4 working days across all pin codes.",
  },
  howrah: {
    slug: "howrah",
    name: "Howrah",
    bengali: "হাওড়া",
    pinRange: "711101–711316",
    landmark: "home of Howrah Bridge",
    deliveryNote: "Speed Post delivery in 3–5 working days to Howrah, Uluberia, Bagnan, and all blocks.",
  },
  "north-24-parganas": {
    slug: "north-24-parganas",
    name: "North 24 Parganas",
    bengali: "উত্তর ২৪ পরগনা",
    pinRange: "700101–743700",
    landmark: "the most populous district of West Bengal",
    deliveryNote: "Speed Post delivery in 3–5 working days to Barasat, Basirhat, Bongaon, and all subdivisions.",
  },
  "south-24-parganas": {
    slug: "south-24-parganas",
    name: "South 24 Parganas",
    bengali: "দক্ষিণ ২৪ পরগনা",
    pinRange: "743330–743613",
    landmark: "the district that borders the Sundarbans",
    deliveryNote: "Speed Post delivery in 3–5 working days to Diamond Harbour, Kakdwip, Joynagar, and all blocks.",
  },
  murshidabad: {
    slug: "murshidabad",
    name: "Murshidabad",
    bengali: "মুর্শিদাবাদ",
    pinRange: "742101–742409",
    landmark: "the historic silk-weaving district of West Bengal",
    deliveryNote: "Speed Post delivery in 3–5 working days to Berhampore, Jiaganj, Lalbag, Domkal, and all blocks.",
  },
  "purba-bardhaman": {
    slug: "purba-bardhaman",
    name: "Purba Bardhaman",
    bengali: "পূর্ব বর্ধমান",
    pinRange: "713101–713429",
    landmark: "the industrial and agricultural hub of central West Bengal",
    deliveryNote: "Speed Post delivery in 3–5 working days to Bardhaman, Katwa, Kalna, and all blocks.",
  },
  "paschim-bardhaman": {
    slug: "paschim-bardhaman",
    name: "Paschim Bardhaman",
    bengali: "পশ্চিম বর্ধমান",
    pinRange: "713301–713369",
    landmark: "the coal and mining belt of West Bengal",
    deliveryNote: "Speed Post delivery in 3–5 working days to Asansol, Durgapur, Kulti, and all blocks.",
  },
  nadia: {
    slug: "nadia",
    name: "Nadia",
    bengali: "নদীয়া",
    pinRange: "741101–741317",
    landmark: "the birthplace of Sri Chaitanya Mahaprabhu",
    deliveryNote: "Speed Post delivery in 3–5 working days to Krishnanagar, Ranaghat, Nabadwip, and all blocks.",
  },
  hooghly: {
    slug: "hooghly",
    name: "Hooghly",
    bengali: "হুগলী",
    pinRange: "712101–712617",
    landmark: "the historic colonial port district of West Bengal",
    deliveryNote: "Speed Post delivery in 3–5 working days to Chinsurah, Chandannagar, Serampore, and all blocks.",
  },
  "paschim-medinipur": {
    slug: "paschim-medinipur",
    name: "Paschim Medinipur",
    bengali: "পশ্চিম মেদিনীপুর",
    pinRange: "721101–721649",
    landmark: "the largest district by area in West Bengal",
    deliveryNote: "Speed Post delivery in 3–5 working days to Midnapore, Kharagpur, Ghatal, and all blocks.",
  },
  "purba-medinipur": {
    slug: "purba-medinipur",
    name: "Purba Medinipur",
    bengali: "পূর্ব মেদিনীপুর",
    pinRange: "721401–721660",
    landmark: "the coastal district on the Bay of Bengal",
    deliveryNote: "Speed Post delivery in 3–5 working days to Tamluk, Haldia, Contai, and all blocks.",
  },
  bankura: {
    slug: "bankura",
    name: "Bankura",
    bengali: "বাঁকুড়া",
    pinRange: "722101–722208",
    landmark: "the red-soil terracotta craft district of West Bengal",
    deliveryNote: "Speed Post delivery in 3–5 working days to Bankura town, Bishnupur, Sonamukhi, and all blocks.",
  },
  purulia: {
    slug: "purulia",
    name: "Purulia",
    bengali: "পুরুলিয়া",
    pinRange: "723101–723215",
    landmark: "the district bordering Jharkhand in western West Bengal",
    deliveryNote: "Speed Post delivery in 4–6 working days to Purulia town, Raghunathpur, Jhalda, and all blocks.",
  },
  birbhum: {
    slug: "birbhum",
    name: "Birbhum",
    bengali: "বীরভূম",
    pinRange: "731101–731303",
    landmark: "the district of Tagore's Shantiniketan",
    deliveryNote: "Speed Post delivery in 3–5 working days to Suri, Bolpur, Rampurhat, and all blocks.",
  },
  malda: {
    slug: "malda",
    name: "Malda",
    bengali: "মালদহ",
    pinRange: "732101–732216",
    landmark: "the mango-growing district of northern West Bengal",
    deliveryNote: "Speed Post delivery in 4–6 working days to English Bazar, Old Malda, Gazole, and all blocks.",
  },
  "uttar-dinajpur": {
    slug: "uttar-dinajpur",
    name: "Uttar Dinajpur",
    bengali: "উত্তর দিনাজপুর",
    pinRange: "733101–733209",
    landmark: "the northernmost agricultural district of West Bengal",
    deliveryNote: "Speed Post delivery in 4–6 working days to Raiganj, Islampur, Kaliyaganj, and all blocks.",
  },
  "dakshin-dinajpur": {
    slug: "dakshin-dinajpur",
    name: "Dakshin Dinajpur",
    bengali: "দক্ষিণ দিনাজপুর",
    pinRange: "733121–733157",
    landmark: "the district bordering Bangladesh in northern West Bengal",
    deliveryNote: "Speed Post delivery in 4–6 working days to Balurghat, Gangarampur, Tapan, and all blocks.",
  },
  jalpaiguri: {
    slug: "jalpaiguri",
    name: "Jalpaiguri",
    bengali: "জলপাইগুড়ি",
    pinRange: "735101–735234",
    landmark: "the gateway to the Dooars tea gardens",
    deliveryNote: "Speed Post delivery in 4–6 working days to Jalpaiguri town, Alipurduar, Dhupguri, and all blocks.",
  },
  darjeeling: {
    slug: "darjeeling",
    name: "Darjeeling",
    bengali: "দার্জিলিং",
    pinRange: "734001–734226",
    landmark: "the Queen of the Hills and tea capital of India",
    deliveryNote: "Speed Post delivery in 5–7 working days to Darjeeling town, Kurseong, Siliguri, and all blocks.",
  },
  "cooch-behar": {
    slug: "cooch-behar",
    name: "Cooch Behar",
    bengali: "কোচবিহার",
    pinRange: "736101–736179",
    landmark: "the royal heritage district of northern West Bengal",
    deliveryNote: "Speed Post delivery in 4–6 working days to Cooch Behar town, Dinhata, Mathabhanga, and all blocks.",
  },
  alipurduar: {
    slug: "alipurduar",
    name: "Alipurduar",
    bengali: "আলিপুরদুয়ার",
    pinRange: "736121–736206",
    landmark: "the district bordering Bhutan and the Buxa Tiger Reserve",
    deliveryNote: "Speed Post delivery in 4–6 working days to Alipurduar town, Falakata, Kumargram, and all blocks.",
  },
  jhargram: {
    slug: "jhargram",
    name: "Jhargram",
    bengali: "ঝাড়গ্রাম",
    pinRange: "721507–721514",
    landmark: "the forest district on the Jharkhand border",
    deliveryNote: "Speed Post delivery in 4–6 working days to Jhargram town, Binpur, Silda, and all blocks.",
  },
  kalimpong: {
    slug: "kalimpong",
    name: "Kalimpong",
    bengali: "কালিম্পং",
    pinRange: "734301–734316",
    landmark: "the hill district known for its flower markets",
    deliveryNote: "Speed Post delivery in 5–7 working days to Kalimpong town, Gorubathan, Algarah, and all blocks.",
  },
};

function injectJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export default function DistrictPage() {
  const params = useParams<{ district: string }>();
  const district = params.district ?? "";
  const info = DISTRICTS[district];

  const title = info
    ? `PVC Ration Card ${info.name} | Order Online ₹50 Only`
    : "PVC Ration Card West Bengal | Order Online";
  const description = info
    ? `Order a durable PVC printed ration card in ${info.name} (${info.bengali}), ${info.landmark}. Wallet-size, waterproof, doorstep delivery in 3–7 days. ₹50 only. AAY, PHH, SPHH, RKSY supported.`
    : "Order a PVC printed ration card online for West Bengal. Delivered to your doorstep. ₹50 only.";
  const canonical = info ? `${SITE_URL}/pvc-ration-card/${district}` : undefined;

  useSeo({ title, description, canonical });

  useEffect(() => {
    if (!info) return;

    injectJsonLd("district-faq-ld", {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `How do I order a PVC ration card in ${info.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Visit erationcards.in, click "Order PVC Card", fill in your details and ${info.name} delivery address, pay \u20b950 via UPI, and upload your e-Ration Card PDF. Your card will be dispatched by Speed Post within 24\u201348 hours of confirmation.`,
          },
        },
        {
          "@type": "Question",
          name: `How long does PVC ration card delivery take in ${info.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: info.deliveryNote,
          },
        },
        {
          "@type": "Question",
          name: `What is the price of a PVC ration card in ${info.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `The price is ₹50 per card delivered to any address in ${info.name} (pin codes ${info.pinRange}). Delivery charges are included.`,
          },
        },
        {
          "@type": "Question",
          name: `Which ration card types are supported for ${info.name} residents?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `We support all West Bengal ration card categories for ${info.name} residents: AAY (Antyodaya Anna Yojana), PHH (Priority Household), SPHH (Special Priority Household), RKSY-I and RKSY-II. Upload your existing government-issued e-Ration Card PDF and we print it on durable PVC.`,
          },
        },
        {
          "@type": "Question",
          name: `Is this service available across all areas of ${info.name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Yes. We deliver to all blocks, municipalities, and rural areas within ${info.name} district (pin codes ${info.pinRange}) via India Post Speed Post. No extra charges for remote areas.`,
          },
        },
      ],
    });

    injectJsonLd("district-breadcrumb-ld", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: `PVC Ration Card ${info.name}`,
          item: `${SITE_URL}/pvc-ration-card/${info.slug}`,
        },
      ],
    });

    return () => {
      removeJsonLd("district-faq-ld");
      removeJsonLd("district-breadcrumb-ld");
    };
  }, [info]);

  if (!info) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">District not found</h1>
          <p className="text-slate-600 mb-8">
            We couldn't find a page for this district. Please check the URL or browse all districts below.
          </p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const faqs = [
    {
      q: `How do I order a PVC ration card in ${info.name}?`,
      a: `Visit erationcards.in, click "Order PVC Card", fill in your details and ${info.name} delivery address, pay ₹50 via UPI, and upload your e-Ration Card PDF. Your card will be dispatched by Speed Post within 24–48 hours of confirmation.`,
    },
    {
      q: `How long does delivery take in ${info.name}?`,
      a: info.deliveryNote,
    },
    {
      q: `What is the price for ${info.name}?`,
      a: `₹50 per card delivered to any address in ${info.name} (pin codes ${info.pinRange}). Delivery included.`,
    },
    {
      q: `Which ration card types are supported for ${info.name} residents?`,
      a: `All West Bengal categories: AAY, PHH, SPHH, RKSY-I, and RKSY-II. Simply upload your existing government-issued e-Ration Card PDF.`,
    },
    {
      q: `Is this service available across all areas of ${info.name}?`,
      a: `Yes. We deliver to all blocks, municipalities, and rural areas in ${info.name} district (pin codes ${info.pinRange}) via India Post Speed Post. No extra charges for remote areas.`,
    },
  ];

  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-sm mb-6">
              <MapPin className="w-4 h-4 text-blue-300" />
              <span>Serving all 23 districts of West Bengal</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">
              PVC Ration Card {info.name}
              <span className="block text-blue-300 text-2xl md:text-3xl mt-1">{info.bengali}</span>
            </h1>
            <p className="text-slate-300 text-lg mb-8 max-w-xl mx-auto">
              Order a durable, wallet-size PVC printed ration card delivered to your doorstep in {info.name},{" "}
              {info.landmark}. ₹50 only — all card types supported.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/order">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-400 text-white font-semibold w-full sm:w-auto">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Order Now — ₹50
                </Button>
              </Link>
              <Link href="/track">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
                >
                  Track Your Order
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-14 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
              How to get your PVC Ration Card in {info.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  icon: <CreditCard className="w-6 h-6 text-blue-500" />,
                  step: "1",
                  title: "Place Order",
                  desc: `Fill in your details and your ${info.name} delivery address (pin code ${info.pinRange}).`,
                },
                {
                  icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
                  step: "2",
                  title: "Pay ₹50 via UPI",
                  desc: "Scan the QR code or use our UPI ID. Upload your payment screenshot.",
                },
                {
                  icon: <Truck className="w-6 h-6 text-orange-500" />,
                  step: "3",
                  title: "Doorstep Delivery",
                  desc: info.deliveryNote,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center text-center bg-slate-50 rounded-xl p-6 border border-slate-100"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow flex items-center justify-center mb-3">
                    {item.icon}
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Step {item.step}</p>
                  <h3 className="font-bold text-slate-800 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-14 px-4 bg-slate-50">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-10">
              Why {info.name} customers choose us
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: <Shield className="w-5 h-5 text-blue-500" />,
                  title: "Genuine PVC Quality",
                  desc: "85.6mm × 54mm CR80 standard — same size as your Aadhaar or debit card. Waterproof and tear-resistant.",
                },
                {
                  icon: <Clock className="w-5 h-5 text-orange-500" />,
                  title: "Fast Turnaround",
                  desc: "Printed and dispatched within 24–48 hours of payment and PDF confirmation.",
                },
                {
                  icon: <Truck className="w-5 h-5 text-emerald-500" />,
                  title: `Delivery Across ${info.name}`,
                  desc: `We deliver to every block and municipality in ${info.name} via India Post Speed Post.`,
                },
                {
                  icon: <CheckCircle className="w-5 h-5 text-violet-500" />,
                  title: "All Card Types",
                  desc: "AAY, PHH, SPHH, RKSY-I, RKSY-II — we print whichever type your family has.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex gap-4 bg-white rounded-xl p-5 border border-slate-100 shadow-sm"
                >
                  <div className="mt-0.5 shrink-0">{item.icon}</div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">{item.title}</p>
                    <p className="text-slate-600 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* District-specific FAQ */}
        <section className="py-14 px-4 bg-white">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
              PVC Ration Card {info.name} — Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group border border-slate-200 rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 list-none">
                    {faq.q}
                    <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform shrink-0">▼</span>
                  </summary>
                  <div className="px-5 py-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center">
          <div className="max-w-xl mx-auto">
            <h2 className="text-2xl font-bold mb-3">
              Order your PVC Ration Card in {info.name} today
            </h2>
            <p className="text-blue-100 mb-8 text-sm">
              Fast, secure, and delivered to your door. ₹50 per card, all quantities.
            </p>
            <Link href="/order">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">
                <CreditCard className="w-4 h-4 mr-2" />
                Order Now — ₹50
              </Button>
            </Link>
          </div>
        </section>

        {/* All districts nav */}
        <section className="py-12 px-4 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-slate-700 text-center mb-6">
              PVC Ration Card delivery across all 23 West Bengal districts
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {Object.values(DISTRICTS).map((d) => (
                <Link key={d.slug} href={`/pvc-ration-card/${d.slug}`}>
                  <span
                    className={`inline-block px-3 py-1.5 rounded-full text-sm border transition-colors cursor-pointer ${
                      d.slug === district
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    {d.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
