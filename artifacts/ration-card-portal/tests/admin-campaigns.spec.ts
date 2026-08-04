import { test, expect } from "@playwright/test";

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

// Distinctive values that cannot collide with the built-in fallback defaults,
// proving the campaign texts are built from live settings, not hardcoded.
const MOCK_PRICING = {
  ration: { single: { public: 83, operator: 71 }, multi: { public: 61, operator: 47 } },
  special: { single: { public: 113, operator: 97 }, multi: { public: 89, operator: 79 } },
};
const MOCK_CONTACT = {
  phone: "+91 91234 00000",
  email: "help@test.example",
  address: "12 Test Lane",
  city: "Kolkata",
  hours: "9am - 9pm",
};

// SMS billing rules, mirrored from CampaignsTab.smsPartCount:
// ASCII (GSM-7) → 160 single / 153 per part; Unicode (Bengali) → 70 / 67.
function expectedParts(text: string): number {
  const ascii = /^[\x00-\x7F]*$/.test(text);
  const single = ascii ? 160 : 70;
  const perPart = ascii ? 153 : 67;
  return text.length <= single ? 1 : Math.ceil(text.length / perPart);
}

async function setupMocks(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    localStorage.setItem("adminToken", "test-admin-token");
  });

  await page.route("**/api/**", async (route, request) => {
    const { pathname } = new URL(request.url());
    if (pathname === "/api/admin/me") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ADMIN),
      });
    } else if (pathname === "/api/pricing/config") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ pricing: MOCK_PRICING }),
      });
    } else if (pathname === "/api/contact/config") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ contact: MOCK_CONTACT }),
      });
    } else {
      // Any other admin API call gets a benign empty payload. Never let calls
      // fall through to the real dev API: a 401 from it triggers the global
      // session-expired redirect and tears down the dashboard mid-test.
      await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
  });
}

async function openCampaignsTab(page: import("@playwright/test").Page) {
  await page.goto("/admin/dashboard");
  await page.getByTestId("tab-campaigns").click();
  await expect(page.getByTestId("campaign-message-whatsapp-en")).toBeVisible({ timeout: 10000 });
}

const CARD_IDS = [
  "whatsapp-en",
  "whatsapp-bn",
  "whatsapp-operator-en",
  "whatsapp-operator-bn",
  "sms-en",
  "sms-bn",
] as const;

test.describe("Admin campaign messages", () => {
  test("messages are built from live settings, keep honest wording, and links/hints are correct", async ({ page }) => {
    await setupMocks(page);
    await openCampaignsTab(page);

    for (const id of CARD_IDS) {
      await expect(page.getByTestId(`campaign-message-${id}`)).toBeVisible();
    }

    // English WhatsApp message: live prices, campaign-tagged link, phone, disclaimer.
    const waEn = await page
      .getByTestId("campaign-message-whatsapp-en")
      .locator("pre")
      .innerText();
    expect(waEn).toContain("Single card: ₹83");
    expect(waEn).toContain("₹61 per card");
    expect(waEn).toContain("erationcards.in/order?utm_source=whatsapp");
    expect(waEn).toContain(MOCK_CONTACT.phone);
    expect(waEn).toContain("Note: We are a private printing service");

    // Bengali WhatsApp message: Bengali script, live prices, honesty line.
    const waBn = await page
      .getByTestId("campaign-message-whatsapp-bn")
      .locator("pre")
      .innerText();
    expect(waBn).toContain("পিভিসি");
    expect(waBn).toContain("₹83");
    expect(waBn).toContain("₹61");
    expect(waBn).toContain("বেসরকারি");

    // Operator messages: all four operator-audience rates from live settings,
    // the tagged operator-registration link, section heading, and honesty note.
    await expect(page.getByText("For shop & CSC operators")).toBeVisible();
    const opEn = await page
      .getByTestId("campaign-message-whatsapp-operator-en")
      .locator("pre")
      .innerText();
    expect(opEn).toContain("single: ₹71, 2 or more: ₹47 per card");
    expect(opEn).toContain("single: ₹97, 2 or more: ₹79 per card");
    expect(opEn).toContain("erationcards.in/operator/register?utm_source=whatsapp");
    expect(opEn).toContain("utm_campaign=operator_promo");
    expect(opEn).toContain("Note: We are a private printing service");
    const opBn = await page
      .getByTestId("campaign-message-whatsapp-operator-bn")
      .locator("pre")
      .innerText();
    expect(opBn).toContain("₹71");
    expect(opBn).toContain("₹47");
    expect(opBn).toContain("₹97");
    expect(opBn).toContain("₹79");
    expect(opBn).toContain("operator/register");
    expect(opBn).toContain("বেসরকারি");

    // SMS messages: live prices via Rs./₹ and the short un-tagged domain.
    const smsEn = await page.getByTestId("campaign-message-sms-en").locator("pre").innerText();
    expect(smsEn).toContain("Rs.83");
    expect(smsEn).toContain("Rs.61");
    expect(smsEn).toContain("erationcards.in");
    const smsBn = await page.getByTestId("campaign-message-sms-bn").locator("pre").innerText();
    expect(smsBn).toContain("₹83");
    expect(smsBn).toContain("erationcards.in");

    // wa.me buttons encode the exact message text (Bengali included).
    for (const id of ["whatsapp-en", "whatsapp-bn", "whatsapp-operator-en", "whatsapp-operator-bn"] as const) {
      const text = await page.getByTestId(`campaign-message-${id}`).locator("pre").innerText();
      const href = await page.getByTestId(`button-whatsapp-${id}`).getAttribute("href");
      expect(href).not.toBeNull();
      const prefix = "https://wa.me/?text=";
      expect(href!.startsWith(prefix)).toBe(true);
      expect(decodeURIComponent(href!.slice(prefix.length))).toBe(text);
    }

    // SMS hints state the true billed part count (Unicode vs ASCII rules),
    // and the texts stay short enough to never exceed 2 billed parts.
    for (const id of ["sms-en", "sms-bn"] as const) {
      const text = await page.getByTestId(`campaign-message-${id}`).locator("pre").innerText();
      const parts = expectedParts(text);
      expect(parts).toBeLessThanOrEqual(2);
      const hint = await page.getByTestId(`sms-parts-${id}`).innerText();
      expect(hint).toContain(`${text.length} characters`);
      if (parts === 1) {
        expect(hint).toContain("fits in a single SMS");
      } else {
        expect(hint).toContain(`billed as ${parts} joined SMS parts`);
      }
    }
  });

  test("banner image is generated with the logo and is downloadable", async ({ page }) => {
    await setupMocks(page);
    await openCampaignsTab(page);

    const img = page.getByTestId("img-campaign-banner");
    await expect(img).toBeVisible({ timeout: 15000 });
    const src = await img.getAttribute("src");
    expect(src).not.toBeNull();
    expect(src!.startsWith("data:image/png")).toBe(true);
    // A painted 1080×1080 banner encodes far larger than a blank canvas would.
    expect(src!.length).toBeGreaterThan(20000);

    const download = page.getByTestId("link-download-banner");
    await expect(download).toBeVisible();
    expect(await download.getAttribute("download")).toBe("erationcards-whatsapp-banner.png");
    expect((await download.getAttribute("href"))!.startsWith("data:image/png")).toBe(true);
  });

  test("share button hands WhatsApp the banner picture and a live-settings caption", async ({ page }) => {
    await setupMocks(page);
    // Stub the Web Share API before the app loads and record what it receives.
    await page.addInitScript(() => {
      (window as unknown as { __shared: unknown }).__shared = null;
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      Object.defineProperty(navigator, "share", {
        value: async (data: { text?: string; files?: File[] }) => {
          (window as unknown as { __shared: unknown }).__shared = {
            text: data.text ?? "",
            fileName: data.files?.[0]?.name ?? "",
            fileType: data.files?.[0]?.type ?? "",
            fileSize: data.files?.[0]?.size ?? 0,
          };
        },
        configurable: true,
      });
    });
    await openCampaignsTab(page);

    await expect(page.getByTestId("img-campaign-banner")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("button-share-banner").click();
    await page.waitForFunction(() => (window as unknown as { __shared: unknown }).__shared !== null);

    const shared = await page.evaluate(
      () =>
        (window as unknown as { __shared: { text: string; fileName: string; fileType: string; fileSize: number } })
          .__shared
    );
    expect(shared.fileName).toBe("erationcards-whatsapp-banner.png");
    expect(shared.fileType).toBe("image/png");
    // A painted 1080×1080 banner is far larger than a blank canvas would be.
    expect(shared.fileSize).toBeGreaterThan(15000);
    // Caption comes from the mocked live settings, keeps the campaign link,
    // stays bilingual, and carries the honesty disclaimer.
    expect(shared.text).toContain("Single card ₹83");
    expect(shared.text).toContain("₹61 each");
    expect(shared.text).toContain(MOCK_CONTACT.phone);
    expect(shared.text).toContain("utm_source=whatsapp");
    expect(shared.text).toContain("private printing service");
    expect(shared.text).toContain("বেসরকারি");
    // Native share succeeded, so the manual-fallback note must not appear.
    await expect(page.getByTestId("text-share-note")).toHaveCount(0);
  });

  test("when sharing and clipboard are both unavailable, fallback downloads the picture and stays honest", async ({ page }) => {
    await setupMocks(page);
    await page.addInitScript(() => {
      // No Web Share API at all, and every copy path blocked.
      Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
      Object.defineProperty(navigator, "canShare", { value: undefined, configurable: true });
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: () => Promise.reject(new Error("denied")) },
        configurable: true,
      });
      Object.defineProperty(document, "execCommand", { value: () => false, configurable: true });
    });
    await openCampaignsTab(page);

    await expect(page.getByTestId("img-campaign-banner")).toBeVisible({ timeout: 15000 });
    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("button-share-banner").click();

    // The picture still reaches the admin as a download.
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("erationcards-whatsapp-banner.png");

    // The note must NOT claim the message was copied — it wasn't.
    const note = page.getByTestId("text-share-note");
    await expect(note).toBeVisible();
    await expect(note).toContainText("copying the message did not work");
    // Instead the caption is offered for manual copying, built from live settings.
    const captionBox = page.getByTestId("text-share-caption");
    await expect(captionBox).toBeVisible();
    await expect(captionBox).toContainText("Single card ₹83");
    await expect(captionBox).toContainText("বেসরকারি");
  });

  test("closing the share sheet is a cancel — no fallback note, no caption box", async ({ page }) => {
    await setupMocks(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      Object.defineProperty(navigator, "share", {
        value: () => Promise.reject(new DOMException("closed", "AbortError")),
        configurable: true,
      });
    });
    await openCampaignsTab(page);

    await expect(page.getByTestId("img-campaign-banner")).toBeVisible({ timeout: 15000 });
    await page.getByTestId("button-share-banner").click();
    await page.waitForTimeout(400);
    await expect(page.getByTestId("text-share-note")).toHaveCount(0);
    await expect(page.getByTestId("text-share-caption")).toHaveCount(0);
  });

  test("copy button copies the message to the clipboard and shows feedback", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await setupMocks(page);
    await openCampaignsTab(page);

    await page.getByTestId("button-copy-whatsapp-en").click();
    await expect(page.getByTestId("button-copy-whatsapp-en")).toContainText("Copied!", { timeout: 5000 });

    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain("utm_source=whatsapp");
    expect(clipboard).toContain("Single card: ₹83");
  });
});
