import { test, expect } from "@playwright/test";

test.describe("page-enter animation wrapper", () => {
  test("Home page has .page-enter wrapper", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".page-enter")).toBeVisible();
  });

  test("Order page has .page-enter wrapper after navigation", async ({
    page,
  }) => {
    await page.goto("/order");
    await expect(page.locator(".page-enter")).toBeVisible();
  });

  test("Track page has .page-enter wrapper after navigation", async ({
    page,
  }) => {
    await page.goto("/track");
    await expect(page.locator(".page-enter")).toBeVisible();
  });

  test(".page-enter wrapper persists across client-side navigation", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".page-enter")).toBeVisible();

    await page.goto("/order");
    await expect(page.locator(".page-enter")).toBeVisible();

    await page.goto("/track");
    await expect(page.locator(".page-enter")).toBeVisible();
  });
});
