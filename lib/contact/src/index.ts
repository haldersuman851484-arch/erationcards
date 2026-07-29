/**
 * @workspace/contact — single source of truth for the site's support/contact
 * details (phone, email, office address, city, business hours).
 *
 * Used by BOTH sides of the stack:
 *   - artifacts/api-server → resolves the live admin-edited values from the
 *     settings table (key "contact_info") and substitutes %%CONTACT_*%%
 *     tokens into prerendered HTML + llms.txt on every request
 *   - ration-card-portal   → useContact() hook renders the live values in the
 *     footer, Contact page, FAQ, policy pages, WhatsApp/tel/mailto links
 *
 * Zero dependencies and browser-safe by design (imported by Vite client
 * code) — never import server-only modules here.
 */

export interface ContactInfo {
  /** Display format, e.g. "+91 96359 60507" — also used for WhatsApp. */
  phone: string;
  email: string;
  /** Full single-line office address. */
  address: string;
  /** City / region shown under the address, e.g. "Kolkata, West Bengal". */
  city: string;
  /** Business hours, e.g. "Monday – Saturday, 9:00 AM – 6:00 PM IST". */
  hours: string;
}

/** ContactInfo plus values derived from the phone for links. */
export interface ContactDisplay extends ContactInfo {
  /** Digits only (country code included), for wa.me links. */
  phoneDigits: string;
}

/**
 * Launch-default contact details. These are ONLY the fallback: the live
 * values are admin-editable (Settings tab, OTP-protected) and stored in the
 * API server's `settings` table under the key "contact_info".
 */
export const DEFAULT_CONTACT: ContactInfo = {
  phone: "+91 96359 60507",
  email: "help@erationcards.in",
  address: "26 Krishna Nibas, Kolkata, South 24 Parganas – 700001",
  city: "Kolkata, West Bengal",
  hours: "Monday – Saturday, 9:00 AM – 6:00 PM IST",
};

export const CONTACT_FIELDS = ["phone", "email", "address", "city", "hours"] as const;
export type ContactField = (typeof CONTACT_FIELDS)[number];

export const CONTACT_FIELD_LABELS: Record<ContactField, string> = {
  phone: "Phone / WhatsApp number",
  email: "Support email",
  address: "Office address",
  city: "City / region",
  hours: "Business hours",
};

/** Character limits per field (shared by the admin form and the server). */
export const CONTACT_FIELD_LIMITS: Record<ContactField, { min: number; max: number }> = {
  phone: { min: 8, max: 20 },
  email: { min: 6, max: 254 },
  address: { min: 5, max: 200 },
  city: { min: 2, max: 100 },
  hours: { min: 3, max: 120 },
};

/**
 * Characters banned in every contact field. The saved values are substituted
 * raw into prerendered HTML text, attributes AND JSON-LD strings — excluding
 * < > " & \ % and control characters keeps a value safe in all three contexts
 * without any escaping (and % can never fabricate a %%TOKEN%%).
 */
const UNSAFE_CHARS = /[<>"&\\%\u0000-\u001f\u007f]/;

const PHONE_SHAPE = /^\+?[0-9][0-9 ()-]*$/;
const EMAIL_SHAPE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/**
 * Plain-language validation error for one trimmed field value, or null when
 * the value is fine. The server rejects a save on the first error; the admin
 * form shows the same message inline.
 */
export function contactFieldError(field: ContactField, value: string): string | null {
  const label = CONTACT_FIELD_LABELS[field];
  const { min, max } = CONTACT_FIELD_LIMITS[field];
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    return `Enter the ${label.toLowerCase()}.`;
  }
  if (value.length < min || value.length > max) {
    return `The ${label.toLowerCase()} must be ${min}–${max} characters.`;
  }
  if (UNSAFE_CHARS.test(value)) {
    return `The ${label.toLowerCase()} cannot contain the characters < > " & \\ or %.`;
  }
  if (field === "phone") {
    const digits = value.replace(/\D/g, "");
    if (!PHONE_SHAPE.test(value) || digits.length < 8 || digits.length > 15) {
      return "Enter a valid phone number like +91 98765 43210.";
    }
  }
  if (field === "email" && !EMAIL_SHAPE.test(value)) {
    return "Enter a valid email address like help@example.com.";
  }
  return null;
}

/** First validation error across all fields, or null when all are valid. */
export function contactInfoError(value: ContactInfo): string | null {
  for (const field of CONTACT_FIELDS) {
    const err = contactFieldError(field, value[field]);
    if (err) return `${CONTACT_FIELD_LABELS[field]}: ${err}`;
  }
  return null;
}

/**
 * Runtime guard for contact details loaded from JSON (settings table / API).
 * Accepts only a complete object whose every field passes validation.
 */
export function isValidContactInfo(value: unknown): value is ContactInfo {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  for (const field of CONTACT_FIELDS) {
    const s = v[field];
    if (typeof s !== "string" || contactFieldError(field, s) !== null) return false;
  }
  return true;
}

/**
 * Token keys for prerendered snapshots / llms.txt / index.html head.
 * PHONE_DIGITS and PHONE_E164 are derived from the phone so wa.me links and
 * JSON-LD `telephone` stay correct without extra admin fields.
 */
export type ContactTokenKey =
  | "PHONE"
  | "PHONE_DIGITS"
  | "PHONE_E164"
  | "EMAIL"
  | "ADDRESS"
  | "CITY"
  | "HOURS";

/** Digits-only form of a display phone number (for wa.me links). */
export function phoneDigitsOf(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Value for each contact token. */
export function contactTokenValues(contact: ContactInfo): Record<ContactTokenKey, string> {
  const digits = phoneDigitsOf(contact.phone);
  return {
    PHONE: contact.phone,
    PHONE_DIGITS: digits,
    PHONE_E164: `+${digits}`,
    EMAIL: contact.email,
    ADDRESS: contact.address,
    CITY: contact.city,
    HOURS: contact.hours,
  };
}

/**
 * Replaces every %%CONTACT_<KEY>%% placeholder in the given HTML/text with
 * the corresponding live value. Unknown placeholders are left untouched
 * (and can be asserted against in tests).
 */
export function applyContactTokens(html: string, contact: ContactInfo = DEFAULT_CONTACT): string {
  const values = contactTokenValues(contact);
  return html.replace(/%%CONTACT_([A-Z0-9_]+)%%/g, (match, key: string) => {
    const v = values[key as ContactTokenKey];
    return v === undefined ? match : v;
  });
}

/**
 * Prerender-only contact object whose values are %%CONTACT_*%% tokens.
 * The build-time prerenderer (ration-card-portal/scripts/prerender.mjs)
 * renders the public pages with these so the captured HTML contains tokens;
 * the API server then substitutes the LIVE admin-edited details via
 * applyContactTokens on every request — snapshots can never show stale
 * contact info. Never use these values for string transformations.
 */
export const TOKEN_CONTACT: ContactDisplay = {
  phone: "%%CONTACT_PHONE%%",
  email: "%%CONTACT_EMAIL%%",
  address: "%%CONTACT_ADDRESS%%",
  city: "%%CONTACT_CITY%%",
  hours: "%%CONTACT_HOURS%%",
  phoneDigits: "%%CONTACT_PHONE_DIGITS%%",
};
