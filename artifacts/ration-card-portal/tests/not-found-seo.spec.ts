import { test, expect } from "@playwright/test";

test.describe("404 page — search engine handling", () => {
  test("unknown URL sets robots noindex and restores the default after navigating home", async ({ page }) => {
    await page.goto("/this-page-does-not-exist");

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText("Page Not Found");

    // While the 404 page is mounted, robots must say noindex so unknown
    // URLs (served as the SPA shell with HTTP 200) never get indexed.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);

    // Leaving the 404 page must restore the site-wide robots directive.
    await page.getByTestId("button-notfound-home").click();
    await expect(page.locator("h1").first()).toContainText("Get Your PVC", { timeout: 10000 });
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/);
  });

  test("404 page offers working links back into the site", async ({ page }) => {
    await page.goto("/some/deep/broken/path");

    await expect(page.getByTestId("button-notfound-home")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("button-notfound-order")).toBeVisible();
    await expect(page.getByTestId("button-notfound-track")).toBeVisible();

    await page.getByTestId("button-notfound-order").click();
    await expect(page.locator("h1").first()).toContainText("Order PVC Printed Card", { timeout: 10000 });
  });
});
