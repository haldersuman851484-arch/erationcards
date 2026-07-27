/**
 * Builds the address lines printed on the A6 shipping label.
 *
 * Shared by the full-page label (pages/admin/ShippingLabel.tsx) and the
 * post-creation print popup (pages/admin/CourierDashboard.tsx) so the two
 * renderings can never drift apart.
 *
 * Empty or whitespace-only parts drop out — no blank lines, stray commas,
 * or bare "PO:" prefixes.
 */
export function buildLabelAddressLines(o: {
  address?: string | null;
  postOffice?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
}): string[] {
  const t = (v: unknown) => String(v ?? "").trim();
  const street = t(o.address);
  const po = t(o.postOffice);
  const region = [
    [t(o.district), t(o.state)].filter(Boolean).join(", "),
    t(o.pincode),
  ]
    .filter(Boolean)
    .join(" - ");
  return [street, po ? `PO: ${po}` : "", region].filter(Boolean);
}
