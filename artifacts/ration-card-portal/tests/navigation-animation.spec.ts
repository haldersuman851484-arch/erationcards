import { test, expect } from "@playwright/test";

// The .page-enter fade must run ONLY for client-side navigations.
// Initial page loads are served as fully-painted prerendered snapshots in
// production; animating the first mount both delayed first paint (the CSS
// animation starts the page at opacity 0) and re-blanked the page when React
// mounted seconds later on slow mobiles — the main PageSpeed mobile Speed
// Index penalty. See PageTransition in src/App.tsx.
test.describe("page-enter animation wrapper", () => {
  test("initial load renders WITHOUT the animation wrapper", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(".page-enter")).toHaveCount(0);
  });

  test("direct load of a deep page also skips the wrapper", async ({ page }) => {
    await page.goto("/track");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator(".page-enter")).toHaveCount(0);
  });

  test("client-side navigation adds the wrapper", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await page.click('header a[href*="/track"]');
    await expect(page.locator(".page-enter")).toBeVisible();
  });

  test("browser Back to the initially loaded page also animates", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await page.click('header a[href*="/track"]');
    await expect(page.locator(".page-enter")).toBeVisible();

    await page.goBack();
    // Back to the first location is still a client-side navigation and must
    // animate too (the "has navigated" latch in PageTransition is sticky).
    await expect(page.locator(".page-enter")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/PVC|Ration/i);
  });
});
