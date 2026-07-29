/**
 * Staff session-expiry handling.
 *
 * When the owner rotates the employee password, the server starts rejecting
 * existing processing tokens with 401 on every staff endpoint. Any 401 that
 * happens while a staff token is stored and a staff page is open means the
 * session is no longer valid: clear the token and send the person to the
 * staff login page with a friendly "session expired" note.
 *
 * Wired into the QueryClient's query & mutation caches in App.tsx so it
 * covers every API call the admin/processing panels make.
 */

const STAFF_TOKEN_KEY = "adminToken";
export const SESSION_EXPIRED_PARAM = "expired";

/** Pages that operate with the staff (admin/processing) token. */
function isStaffPage(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/processing");
}

/** The login request itself must keep its normal wrong-password error. */
function isLoginRequest(url: string): boolean {
  return url.includes("/admin/login");
}

/**
 * Call with any failed query/mutation error. If it is a 401 from a staff
 * endpoint while a staff session is active, clears the saved token and
 * redirects to the staff login page with the session-expired notice.
 */
export function handleStaffAuthError(error: unknown): void {
  if (typeof window === "undefined") return;

  const status = (error as { status?: unknown } | null)?.status;
  if (status !== 401) return;

  const url = (error as { url?: unknown } | null)?.url;
  if (typeof url === "string" && isLoginRequest(url)) return;

  if (!localStorage.getItem(STAFF_TOKEN_KEY)) return;
  if (!isStaffPage(window.location.pathname)) return;

  localStorage.removeItem(STAFF_TOKEN_KEY);
  // Full navigation (not wouter) so all in-flight queries/panel state reset.
  window.location.replace(`/admin/login?${SESSION_EXPIRED_PARAM}=1`);
}

/**
 * Drop-in replacement for `fetch` on staff pages that call the API directly
 * (outside the generated React Query client). On a 401 it triggers the same
 * session-expired logout/redirect as the global query handler, then still
 * returns the response so existing `r.ok` checks keep working.
 */
export async function staffFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    handleStaffAuthError({ status: response.status, url });
  }
  return response;
}
