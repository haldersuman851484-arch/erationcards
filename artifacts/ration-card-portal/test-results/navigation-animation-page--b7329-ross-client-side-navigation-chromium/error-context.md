# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation-animation.spec.ts >> page-enter animation wrapper >> .page-enter wrapper persists across client-side navigation
- Location: tests/navigation-animation.spec.ts:23:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.page-enter')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.page-enter')

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("page-enter animation wrapper", () => {
  4  |   test("Home page has .page-enter wrapper", async ({ page }) => {
  5  |     await page.goto("/");
  6  |     await expect(page.locator(".page-enter")).toBeVisible();
  7  |   });
  8  | 
  9  |   test("Order page has .page-enter wrapper after navigation", async ({
  10 |     page,
  11 |   }) => {
  12 |     await page.goto("/order");
  13 |     await expect(page.locator(".page-enter")).toBeVisible();
  14 |   });
  15 | 
  16 |   test("Track page has .page-enter wrapper after navigation", async ({
  17 |     page,
  18 |   }) => {
  19 |     await page.goto("/track");
  20 |     await expect(page.locator(".page-enter")).toBeVisible();
  21 |   });
  22 | 
  23 |   test(".page-enter wrapper persists across client-side navigation", async ({
  24 |     page,
  25 |   }) => {
  26 |     await page.goto("/");
> 27 |     await expect(page.locator(".page-enter")).toBeVisible();
     |                                               ^ Error: expect(locator).toBeVisible() failed
  28 | 
  29 |     await page.goto("/order");
  30 |     await expect(page.locator(".page-enter")).toBeVisible();
  31 | 
  32 |     await page.goto("/track");
  33 |     await expect(page.locator(".page-enter")).toBeVisible();
  34 |   });
  35 | });
  36 | 
```