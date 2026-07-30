// Maps server-side Zod validation issues (the `details` array in a 400
// response from POST /api/orders) onto react-hook-form fields, so the
// offending input gets an inline error + red highlight and the page scrolls
// to the first invalid field instead of relying on a toast alone.
import type { FieldValues, Path, UseFormReturn } from "react-hook-form";

type ServerIssue = { path?: Array<string | number>; code?: string; message?: string };

// Customer-facing labels — mirrors the server's ORDER_FIELD_LABELS.
const FIELD_LABELS: Record<string, string> = {
  customerName: "Name",
  customerPhone: "Phone number",
  customerEmail: "Email",
  rationCardNumber: "Ration card number",
  deliveryName: "Delivery name",
  address: "Address",
  postOffice: "Post office",
  state: "State",
  district: "District",
  pincode: "PIN code",
  cardType: "Card type",
};

// Field-specific overrides where the generic Zod wording would be unhelpful —
// mirrors the server's ORDER_FIELD_MESSAGES.
const FIELD_MESSAGES: Record<string, string> = {
  customerPhone: "Phone number must be exactly 10 digits",
  pincode: "PIN code must be exactly 6 digits",
};

// Labels for the fields inside a family-card entry.
const FAMILY_FIELD_LABELS: Record<string, string> = {
  customerName: "Card holder name",
  rationCardNumber: "Ration card number",
  cardType: "Card type",
};

function messageForIssue(field: string, issue: ServerIssue): string {
  const label = FIELD_LABELS[field] ?? field;
  const override = FIELD_MESSAGES[field];
  if (override && issue.code !== "invalid_type") return override;
  switch (issue.code) {
    case "invalid_type":
    case "too_small":
      return `${label} is required`;
    case "too_big":
      return `${label} is too long`;
    default:
      return issue.message || `${label} is invalid`;
  }
}

/**
 * Applies server validation issues as inline errors on the matching form
 * fields. Returns the name of the first field that received an error, or
 * null when no issue mapped to a form field (caller should keep its toast).
 */
export function applyServerFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  details: unknown,
): string | null {
  if (!Array.isArray(details)) return null;
  const formFields = Object.keys(form.getValues());
  let firstField: string | null = null;

  for (const issue of details as ServerIssue[]) {
    const field = String((issue as ServerIssue)?.path?.[0] ?? "");
    if (!field || !formFields.includes(field)) continue;
    form.setError(field as Path<T>, {
      type: "server",
      message: messageForIssue(field, issue),
    });
    if (!firstField) firstField = field;
  }
  return firstField;
}

export type FamilyCardIssue = { index: number; field: string; message: string };

/**
 * Extracts validation issues that point into the familyCards array. Handles
 * both shapes the server produces:
 *  - CreateOrderBody ZodError issues: path ["familyCards", 1, "customerName"]
 *  - FamilyCardsSchema.safeParse issues ("Invalid familyCards" response):
 *    path [1, "customerName"] (relative to the array itself)
 */
export function extractFamilyCardIssues(details: unknown): FamilyCardIssue[] {
  if (!Array.isArray(details)) return [];
  const out: FamilyCardIssue[] = [];
  for (const issue of details as ServerIssue[]) {
    const path = issue?.path ?? [];
    let index: number | undefined;
    let field: string | undefined;
    if (path[0] === "familyCards" && typeof path[1] === "number") {
      index = path[1];
      field = typeof path[2] === "string" ? path[2] : undefined;
    } else if (typeof path[0] === "number" && typeof path[1] === "string") {
      index = path[0];
      field = path[1];
    }
    if (index === undefined || !field) continue;
    const label = FAMILY_FIELD_LABELS[field] ?? field;
    let message: string;
    switch (issue.code) {
      case "invalid_type":
        message = `${label} is required`;
        break;
      case "too_small":
        message = `${label} is missing or too short`;
        break;
      case "too_big":
        message = `${label} is too long`;
        break;
      default:
        message = issue.message || `${label} is invalid`;
    }
    out.push({ index, field, message });
  }
  return out;
}

/**
 * Scrolls to a family-card row in the list. Rows must carry a
 * `data-family-card-row={index}` attribute. Deferred like scrollToField so it
 * works right after a wizard step change.
 */
export function scrollToFamilyCard(index: number): void {
  setTimeout(() => {
    document
      .querySelector<HTMLElement>(`[data-family-card-row="${index}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 80);
}

/**
 * Scrolls to (and focuses) a form field. Deferred so it works right after a
 * wizard step change — the field may not be in the DOM until the next render.
 */
export function scrollToField<T extends FieldValues>(
  form: UseFormReturn<T>,
  field: string,
): void {
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>(`[name="${field}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    try {
      form.setFocus(field as Path<T>, { shouldSelect: false });
    } catch {
      /* non-focusable control (e.g. Select) — the inline error is visible */
    }
  }, 80);
}
