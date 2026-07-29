import { staffFetch } from "@/lib/staffSession";
import { useEffect, useRef } from "react";
import { buildLabelAddressLines } from "@/lib/labelAddress";
import JsBarcode from "jsbarcode";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem("adminToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Waybill barcode — same JsBarcode options as the printed A6 label. */
function WaybillBarcode({ awb }: { awb: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !awb) return;
    try {
      JsBarcode(el, awb, {
        format: "CODE128",
        displayValue: true,
        text: awb,
        fontSize: 14,
        width: 2,
        height: 56,
        margin: 0,
        textMargin: 2,
      });
      // Replace fixed px dimensions with a viewBox so CSS mm sizing scales it
      const w = parseFloat(el.getAttribute("width") || "0");
      const h = parseFloat(el.getAttribute("height") || "0");
      if (w > 0 && h > 0) {
        el.setAttribute("viewBox", `0 0 ${w} ${h}`);
        el.setAttribute("preserveAspectRatio", "xMidYMid meet");
        el.removeAttribute("width");
        el.removeAttribute("height");
      }
    } catch {
      // invalid/empty waybill — label renders without a barcode
    }
  }, [awb]);

  return <svg ref={ref} style={{ width: "40mm", height: "19mm", display: "block" }} />;
}

/**
 * Full-page shipping label view (reference-portal style): the white A6-width
 * label card near the top of an otherwise empty light-grey page. Design is
 * identical to the printed label — PREPAID box, customer info, boxed Order #
 * (never PRN) + DL, waybill barcode, help@printpvccard.in footer.
 * Order data comes from the same admin-authenticated endpoint the courier
 * dashboard uses, so logged-out visitors see no customer details.
 */
export default function ShippingLabel() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  // Same gate as the courier dashboard: without the admin token we show the
  // login prompt and never request the order at all.
  const hasToken = Boolean(localStorage.getItem("adminToken"));

  const { data, isLoading, error } = useQuery<{ orders: any[] }>({
    queryKey: ["shipping-label-order", orderNumber],
    queryFn: async () => {
      const params = new URLSearchParams({ quickSearch: String(orderNumber), limit: "5" });
      const r = await staffFetch(`/api/orders?${params}`, { headers: getAuthHeader() });
      if (r.status === 401 || r.status === 403) throw new Error("unauthorized");
      if (!r.ok) throw new Error("failed");
      return r.json();
    },
    enabled: Boolean(orderNumber) && hasToken,
    retry: false,
  });

  const order = data?.orders?.find(
    (o) => String(o.orderNumber) === String(orderNumber),
  );

  const message = (() => {
    if (!hasToken) return "login";
    if (isLoading) return "Loading shipping label…";
    if (error instanceof Error && error.message === "unauthorized") return "login";
    if (error) return "Could not load this order. Please try again.";
    if (!order) return "Order not found.";
    if (!order.trackingNumber) return "No Delhivery shipment exists for this order yet.";
    return null;
  })();

  const awb = order?.trackingNumber ? String(order.trackingNumber) : "";
  const name = order ? String(order.deliveryName || order.customerName || "").toUpperCase() : "";
  // Full delivery address, one entry per printed line (shared with the
  // print popup in CourierDashboard.tsx via buildLabelAddressLines)
  const addressLines = order ? buildLabelAddressLines(order) : [];
  const rawPhone = order ? String(order.customerPhone || "") : "";
  const phone = rawPhone ? (rawPhone.startsWith("+") ? rawPhone : `+91${rawPhone}`) : "";
  const invoiceDate = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div
      data-testid="page-shipping-label"
      style={{
        minHeight: "100vh",
        background: "#f0f0f0",
        paddingTop: 28,
        paddingBottom: 48,
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000",
      }}
    >
      {message ? (
        <div style={{ textAlign: "center", paddingTop: 64, fontSize: 15, color: "#333" }}>
          {message === "login" ? (
            <>
              Please log in to view shipping labels.{" "}
              <Link href="/admin/login" style={{ color: "#16257d", textDecoration: "underline" }}>
                Go to login
              </Link>
            </>
          ) : (
            message
          )}
        </div>
      ) : (
        <div
          data-testid="card-shipping-label"
          style={{
            width: "105mm",
            margin: "0 auto",
            background: "#fff",
            boxShadow: "0 0 5px rgba(0,0,0,0.15)",
            padding: "4mm 6mm 5mm",
          }}
        >
          {/* PREPAID — top right */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span
              style={{
                border: "0.5mm solid #555",
                padding: "0.6mm 2.4mm",
                fontSize: "5mm",
                fontWeight: 700,
                letterSpacing: "0.2mm",
              }}
            >
              PREPAID
            </span>
          </div>

          <p style={{ fontSize: "3.6mm", marginTop: "3.5mm" }}>Customer Info</p>
          <p
            data-testid="text-label-name"
            style={{ fontSize: "4.8mm", fontWeight: 700, textTransform: "uppercase", marginTop: "0.8mm" }}
          >
            {name}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: "4mm",
              marginTop: "2mm",
            }}
          >
            <div style={{ minWidth: 0 }}>
              {addressLines.map((line, i) => (
                <p
                  key={i}
                  data-testid={`text-label-address-${i}`}
                  style={{ fontSize: "3.9mm", marginTop: "1.4mm" }}
                >
                  {line}
                </p>
              ))}
              <p style={{ fontSize: "3.9mm", marginTop: "1.4mm" }}>{phone}</p>
              <div style={{ display: "flex", gap: "2mm", marginTop: "3mm" }}>
                <span
                  data-testid="text-label-order-num"
                  style={{
                    border: "0.4mm solid #444",
                    padding: "1.2mm 2.2mm",
                    fontSize: "4mm",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Order #{String(order?.orderNumber ?? "")}
                </span>
                <span
                  style={{
                    border: "0.4mm solid #444",
                    padding: "1.2mm 2mm",
                    fontSize: "4mm",
                    fontWeight: 600,
                  }}
                >
                  DL
                </span>
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              <WaybillBarcode awb={awb} />
            </div>
          </div>

          <div style={{ marginTop: "7mm", textAlign: "center" }}>
            <p style={{ fontSize: "2.9mm" }}>
              Invoice Date: {invoiceDate} | Email: help@printpvccard.in | www.printpvccard.in
            </p>
            <p style={{ fontSize: "2.9mm", fontWeight: 700, marginTop: "1mm" }}>
              THIS IS AN AUTO-GENERATED LABEL AND DOES NOT NEED SIGNATURE
            </p>
            <p style={{ fontSize: "2.4mm", fontStyle: "italic", marginTop: "1mm" }}>
              Notice: www.printpvccard.in is not a government portal. It is a PVC card printing portal
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
