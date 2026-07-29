import { BRAND } from "@/components/layout";
import {
  buildInvoiceModel,
  fmtMoney,
  formatInvoiceDate,
  payNotes,
  type InvoiceOrder,
  type PayKind,
} from "./invoice";
import type { PricingMatrix } from "@workspace/pricing";
import { DEFAULT_CONTACT } from "@workspace/contact";

/**
 * Builds the customer invoice as a real PDF file and saves it as
 * `Invoice-<orderNumber>.pdf` — no print dialog involved, which is the whole
 * point for phone users. jsPDF is imported lazily so the library only loads
 * when someone actually taps Download.
 *
 * Known limitation: jsPDF's built-in Helvetica has no ₹ glyph (WinAnsi
 * encoding), so amounts are written as "Rs." — same trade-off the old
 * shipping-label PDF made. Names in non-Latin scripts fall back to the
 * browser print path (kept on the invoice page) for correct rendering.
 */

const SITE = "erationcards.in";

type RGB = readonly [number, number, number];

const SLATE_900: RGB = [15, 23, 42];
const SLATE_600: RGB = [71, 85, 105];
const SLATE_500: RGB = [100, 116, 139];
const SLATE_400: RGB = [148, 163, 184];
const SLATE_200: RGB = [226, 232, 240];
const SLATE_100: RGB = [241, 245, 249];

/** bg / text / border per payment kind — mirrors the on-screen pills. */
const PILL_COLORS: Record<PayKind, { bg: RGB; fg: RGB; br: RGB }> = {
  paid: { bg: [209, 250, 229], fg: [4, 120, 87], br: [110, 231, 183] },
  pending: { bg: [254, 243, 199], fg: [180, 83, 9], br: [252, 211, 77] },
  failed: { bg: [255, 228, 230], fg: [190, 18, 60], br: [253, 164, 175] },
  refunded: { bg: [224, 242, 254], fg: [3, 105, 161], br: [125, 211, 252] },
  unknown: { bg: [241, 245, 249], fg: [71, 85, 105], br: [203, 213, 225] },
};

function capitalize(s: string | undefined): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";
}

export async function downloadInvoicePdf(
  order: InvoiceOrder,
  pricing?: PricingMatrix,
  // Live support contact (admin-editable in Settings); defaults keep old callers working.
  contact: { email: string; phone: string } = DEFAULT_CONTACT,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const m = buildInvoiceModel(order, pricing);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48; // page margin
  const R = W - M; // right content edge
  const FOOTER_TOP = H - 96; // content must stay above this
  let y = M;

  const setTxt = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const setFill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const setDraw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const breakIfNeeded = (need: number) => {
    if (y + need > FOOTER_TOP) {
      doc.addPage();
      y = M;
    }
  };
  /** Small grey uppercase field label, like the sheet's. */
  const label = (t: string, x: number, yy: number, right = false) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(SLATE_400);
    doc.text(t.toUpperCase(), x, yy, { baseline: "top", ...(right ? { align: "right" as const } : {}) });
  };

  /* ── Header ─────────────────────────────────────────────────────────── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setTxt(SLATE_900);
  doc.text(BRAND.name, M, y, { baseline: "top" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTxt(SLATE_500);
  doc.text(SITE, M, y + 20, { baseline: "top" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  setTxt(SLATE_900);
  doc.text("INVOICE", R, y, { align: "right", baseline: "top" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  setTxt(SLATE_500);
  doc.text(`#${order.orderNumber}`, R, y + 24, { align: "right", baseline: "top" });

  // Payment status pill
  const pill = PILL_COLORS[m.payKind];
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const pillW = doc.getTextWidth(m.payLabel) + 16;
  const pillX = R - pillW;
  const pillY = y + 40;
  const pillH = 15;
  setFill(pill.bg);
  setDraw(pill.br);
  doc.setLineWidth(0.75);
  doc.roundedRect(pillX, pillY, pillW, pillH, 7.5, 7.5, "FD");
  setTxt(pill.fg);
  doc.text(m.payLabel, pillX + pillW / 2, pillY + pillH / 2 + 0.5, { align: "center", baseline: "middle" });

  y += 68;
  setDraw(SLATE_200);
  doc.setLineWidth(1);
  doc.line(M, y, R, y);
  y += 16;

  /* ── Customer (left) + order meta (right) ───────────────────────────── */
  const blockTop = y;
  label("Customer", M, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setTxt(SLATE_900);
  doc.text(order.customerName, M, y + 11, { baseline: "top" });
  let ly = y + 26;
  if (m.phone) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setTxt(SLATE_600);
    doc.text(m.phone, M, ly, { baseline: "top" });
    ly += 14;
  }
  ly += 8;
  label("Delivery Address", M, ly);
  ly += 11;
  const addrParts: string[] = [];
  if (m.deliveryName !== order.customerName) addrParts.push(m.deliveryName);
  if (order.address) addrParts.push(order.address);
  if (m.postOffice) addrParts.push(`PO: ${m.postOffice}`);
  const cityLine = [order.district, order.state].filter(Boolean).join(", ")
    + (order.pincode ? ` – ${order.pincode}` : "");
  if (cityLine.trim()) addrParts.push(cityLine);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setTxt(SLATE_600);
  const addrLines: string[] = doc.splitTextToSize(addrParts.join("\n"), 260);
  doc.text(addrLines, M, ly, { baseline: "top" });
  const leftEnd = ly + addrLines.length * 12;

  let ry = blockTop;
  const meta: Array<[string, string]> = [
    ["Invoice / Order Date", formatInvoiceDate(order.createdAt)],
    ["Payment Method", m.paymentMethod],
    ["Order Status", capitalize(order.status)],
  ];
  for (const [k, v] of meta) {
    label(k, R, ry, true);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setTxt(SLATE_900);
    doc.text(v, R, ry + 11, { align: "right", baseline: "top" });
    ry += 34;
  }

  y = Math.max(leftEnd, ry) + 14;
  setDraw(SLATE_200);
  doc.line(M, y, R, y);
  y += 16;

  /* ── Items table ────────────────────────────────────────────────────── */
  const COL_NAME = M + 22;
  const COL_TYPE = R - 160;
  const nameMaxW = COL_TYPE - COL_NAME - 12;
  const drawTableHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    setTxt(SLATE_400);
    doc.text("#", M, y, { baseline: "top" });
    doc.text("PVC RATION CARD", COL_NAME, y, { baseline: "top" });
    doc.text("TYPE", COL_TYPE, y, { baseline: "top" });
    doc.text("PRICE (RS.)", R, y, { align: "right", baseline: "top" });
    y += 16;
  };
  // If a long address pushed the sections down, start the table on a fresh
  // page so the header never sits alone above the footer.
  breakIfNeeded(80);
  drawTableHeader();

  m.cards.forEach((card, i) => {
    // Wrap long names in full (soft cap at 4 lines) — an invoice must never
    // silently drop customer-identifying data.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    const nameLines: string[] = doc.splitTextToSize(card.customerName, nameMaxW).slice(0, 4);
    const rowH = Math.max(30, nameLines.length * 11 + 12 + 10);
    if (y + rowH > FOOTER_TOP) {
      doc.addPage();
      y = M;
      drawTableHeader(); // repeat the column header on every page
    }
    if (i > 0) {
      setDraw(SLATE_100);
      doc.setLineWidth(0.75);
      doc.line(M, y - 5, R, y - 5);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setTxt(SLATE_500);
    doc.text(String(i + 1), M, y, { baseline: "top" });
    doc.setFont("helvetica", "bold");
    setTxt(SLATE_900);
    doc.text(nameLines, COL_NAME, y, { baseline: "top" });
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    setTxt(SLATE_500);
    doc.text(card.rationCardNumber, COL_NAME, y + nameLines.length * 11 + 2, { baseline: "top" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    setTxt(SLATE_600);
    doc.text(card.cardType, COL_TYPE, y, { baseline: "top" });
    setTxt(SLATE_900);
    doc.text(`Rs. ${fmtMoney(m.rowPrice(i))}`, R, y, { align: "right", baseline: "top" });
    y += rowH;
  });

  /* ── Total ──────────────────────────────────────────────────────────── */
  breakIfNeeded(60);
  setDraw(SLATE_200);
  doc.setLineWidth(1.25);
  doc.line(M, y, R, y);
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTxt(SLATE_900);
  doc.text(`Total ${m.isPaid ? "Paid" : "Amount"}`, R - 110, y + 2, { align: "right", baseline: "top" });
  doc.setFontSize(13);
  doc.text(`Rs. ${fmtMoney(order.amount)}`, R, y, { align: "right", baseline: "top" });
  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTxt(SLATE_400);
  if (m.quantity > 1 && m.uniformUnit !== null) {
    doc.text(`${m.quantity} cards × Rs. ${fmtMoney(m.uniformUnit)} per card`, R, y, { align: "right", baseline: "top" });
    y += 12;
  }
  doc.text("Prices are inclusive of GST & postage.", M, y, { baseline: "top" });
  y += 22;

  /* ── Payment note ───────────────────────────────────────────────────── */
  const note = payNotes(contact.email)[m.payKind];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const noteLines: string[] = doc.splitTextToSize(note, R - M - 24);
  const noteH = noteLines.length * 12 + 16;
  breakIfNeeded(noteH + 8);
  setFill(pill.bg);
  setDraw(pill.br);
  doc.setLineWidth(0.75);
  doc.roundedRect(M, y, R - M, noteH, 6, 6, "FD");
  setTxt(pill.fg);
  doc.text(noteLines, M + 12, y + 9, { baseline: "top" });

  /* ── Footer (bottom of the last page) ───────────────────────────────── */
  const fy = H - 84;
  setDraw(SLATE_200);
  doc.setLineWidth(1);
  doc.line(M, fy, R, fy);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTxt(SLATE_500);
  doc.text(`${contact.email} | ${contact.phone} | ${SITE}`, W / 2, fy + 12, { align: "center", baseline: "top" });
  doc.setFont("helvetica", "bold");
  setTxt(SLATE_600);
  doc.text("This is a computer-generated invoice and does not require a signature.", W / 2, fy + 26, { align: "center", baseline: "top" });
  doc.setFont("helvetica", "italic");
  setTxt(SLATE_400);
  doc.text(`Notice: ${SITE} is not a government portal. It is a private PVC card printing service.`, W / 2, fy + 40, { align: "center", baseline: "top" });

  doc.save(`Invoice-${order.orderNumber}.pdf`);
}
