import { useGetContactConfig, getGetContactConfigQueryKey } from "@workspace/api-client-react";
import {
  DEFAULT_CONTACT,
  TOKEN_CONTACT,
  phoneDigitsOf,
  type ContactDisplay,
  type ContactInfo,
} from "@workspace/contact";

/**
 * Live support contact details (phone, email, address, city, hours), fetched
 * from the API (admin-editable in the dashboard Settings tab). Falls back to
 * the built-in launch defaults while loading or if the request fails, so the
 * footer and Contact page always render complete details.
 *
 * During build-time prerendering (window.__PRERENDER_TOKENS__, declared in
 * use-pricing.ts) every field is a %%CONTACT_*%% token; the API server
 * substitutes the live values into the captured HTML on every request.
 * `phoneDigits` exists as its own token so wa.me links never need a string
 * transform that would mangle a token.
 */
export function useContact(): ContactDisplay {
  const { data } = useGetContactConfig({
    query: {
      queryKey: getGetContactConfigQueryKey(),
      staleTime: 60_000,
    },
  } as any);
  if (typeof window !== "undefined" && window.__PRERENDER_TOKENS__) {
    return TOKEN_CONTACT;
  }
  const contact = (data?.contact as ContactInfo | undefined) ?? DEFAULT_CONTACT;
  return { ...contact, phoneDigits: phoneDigitsOf(contact.phone) };
}
