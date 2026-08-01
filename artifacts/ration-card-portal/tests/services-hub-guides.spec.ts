import { test, expect } from "@playwright/test";

test.describe("Services hub page", () => {
  test("renders the tile grid, instant-correction banner and disclaimer", async ({ page }) => {
    await page.goto("/services");

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText("Ration Card Services");

    // Highlighted correction banner links to the correction guide
    const banner = page.getByTestId("banner-instant-correction");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Instant Correction");
    await expect(banner).toHaveAttribute("href", "/guides/ration-card-correction-west-bengal");

    // Full grid: 18 service tiles
    const tiles = page.getByTestId("grid-services").locator("a");
    await expect(tiles).toHaveCount(18);

    // The three portal tiles link to existing pages
    await expect(page.getByTestId("tile-order")).toHaveAttribute("href", "/order");
    await expect(page.getByTestId("tile-track")).toHaveAttribute("href", "/track");
    await expect(page.getByTestId("tile-download")).toHaveAttribute("href", "/download");

    // Honest framing: free-guide note + non-affiliation disclaimer
    await expect(page.locator("text=free of charge on").first()).toBeVisible();
    await expect(page.locator("text=not affiliated with the Government").first()).toBeVisible();
  });

  test("tile navigates to a guide article", async ({ page }) => {
    await page.goto("/services");
    await page.getByTestId("tile-link-aadhaar-ration-card-west-bengal").click();
    await expect(page).toHaveURL(/\/guides\/link-aadhaar-ration-card-west-bengal$/);
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText("Link Aadhaar");
  });

  test("Instant With Aadhaar section lists all six OTP services", async ({ page }) => {
    await page.goto("/services");
    const section = page.getByTestId("section-instant-aadhaar");
    await expect(section).toBeVisible({ timeout: 10000 });
    await expect(section).toContainText("Instant With Aadhaar");

    const tiles = page.getByTestId("grid-instant-aadhaar").locator("a");
    await expect(tiles).toHaveCount(6);

    // Bengali subtitles render (matches the official portal's bilingual tiles)
    await expect(page.getByTestId("grid-instant-aadhaar").locator('[lang="bn"]').first()).toBeVisible();

    // The new mobile-number guide is reachable from the section
    await page.getByTestId("tile-instant-update-mobile-number-ration-card-west-bengal").click();
    await expect(page).toHaveURL(/\/guides\/update-mobile-number-ration-card-west-bengal$/);
    await expect(page.locator("h1").first()).toContainText("Update the Mobile Number");
  });
});

test.describe("New guide articles", () => {
  test("correction guide renders quick answer, steps, FAQ and CTA", async ({ page }) => {
    await page.goto("/guides/ration-card-correction-west-bengal");

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText("Correct Your Ration Card");

    await expect(page.getByTestId("text-guide-quick-answer")).toContainText("Form-5");

    // Steps + native-details FAQ (crawler-visible content)
    await expect(page.locator("ol li").first()).toBeVisible();
    await expect(page.getByTestId("guide-faq-item-0")).toBeVisible();

    // Live price rendered (a ₹ amount, not a raw token) in the quick answer
    await expect(page.getByTestId("text-guide-quick-answer")).not.toContainText("%%PRICE");

    await expect(page.getByTestId("button-guide-order")).toBeVisible();
  });

  test("reactivation guide title and meta description are set", async ({ page }) => {
    await page.goto("/guides/reactivate-ration-card-west-bengal");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveTitle(/Reactivate/i);
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content", /eKYC/i);
    // Canonical points at the page itself
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      "https://erationcards.in/guides/reactivate-ration-card-west-bengal",
    );
  });

  test("delink guide renders with correct canonical and live prices", async ({ page }) => {
    await page.goto("/guides/delink-mobile-number-ration-card-west-bengal");
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveTitle(/Delink/i);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      "https://erationcards.in/guides/delink-mobile-number-ration-card-west-bengal",
    );
    await expect(page.getByTestId("text-guide-quick-answer")).not.toContainText("%%PRICE");
    await expect(page.getByTestId("guide-faq-item-0")).toBeVisible();
  });

  test("navbar Services link reaches the hub", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Services", exact: true }).first().click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.locator("h1").first()).toContainText("Ration Card Services");
  });
});
