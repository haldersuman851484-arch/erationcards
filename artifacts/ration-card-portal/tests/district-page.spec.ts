import { test, expect } from "@playwright/test";

test.describe("District page — direct URL navigation", () => {
  test("kolkata page renders correct H1, district name, and CTA button", async ({ page }) => {
    await page.goto("/pvc-ration-card/kolkata");

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText("PVC Ration Card Kolkata");
    await expect(h1).toContainText("কলকাতা");

    const orderBtn = page.getByRole("link", { name: /Order Now/i }).first();
    await expect(orderBtn).toBeVisible();
    await expect(orderBtn).toHaveAttribute("href", "/order");
  });

  test("murshidabad page shows district-specific title and delivery note", async ({ page }) => {
    await page.goto("/pvc-ration-card/murshidabad");

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText("PVC Ration Card Murshidabad");
    await expect(h1).toContainText("মুর্শিদাবাদ");

    await expect(page).toHaveTitle(/PVC Ration Card Murshidabad/i);

    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute("content", /Murshidabad/i);

    await expect(page.locator("text=historic silk-weaving district").first()).toBeVisible();

    await expect(page.locator("text=Berhampore").first()).toBeVisible();
  });

  test("unknown district URL shows fallback 'District not found' content", async ({ page }) => {
    await page.goto("/pvc-ration-card/unknown-xyz");

    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    await expect(h1).toContainText("District not found");

    await expect(page.getByRole("link", { name: /Back to Home/i })).toBeVisible();
  });
});
