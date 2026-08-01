import { test, expect } from "@playwright/test";

/**
 * /faq — site-wide FAQ page is fully bilingual (English + Bengali), matching
 * the /guides/* pattern: every question and every answer carries a lang="bn"
 * Bengali line directly under the English text.
 */
test.describe("FAQ page — bilingual entries", () => {
  test("every question and answer shows Bengali under the English", async ({ page }) => {
    await page.goto("/faq");

    const items = page.locator("[data-testid^='faq-item-']");
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(20);

    // Every entry's summary carries a Bengali question line.
    await expect(page.locator("summary p[lang='bn']")).toHaveCount(count);

    // The first entry is open by default: English + Bengali answers visible.
    const first = items.first();
    await expect(first.locator("summary h2")).toContainText("What is a PVC ration card?");
    // :scope > div — the answer body (the summary's Bengali line lives in a nested div).
    await expect(first.locator(":scope > div > p[lang='bn']")).toBeVisible();

    // Hero intro carries a Bengali subtitle too.
    await expect(page.locator("h1 ~ p[lang='bn']")).toBeVisible();
  });
});
