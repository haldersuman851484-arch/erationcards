# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-login.spec.ts >> Admin login >> stays on login page and shows field error when email is left empty
- Location: tests/admin-login.spec.ts:64:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('input-admin-password')

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };
  4  | 
  5  | async function setupLoginMocks(
  6  |   page: import("@playwright/test").Page,
  7  |   {
  8  |     loginResult = "success",
  9  |   }: { loginResult?: "success" | "wrong-creds" | "server-error" } = {}
  10 | ) {
  11 |   await page.route("**/api/**", async (route, request) => {
  12 |     const url = new URL(request.url());
  13 |     const { pathname } = url;
  14 |     const method = request.method();
  15 | 
  16 |     if (pathname === "/api/admin/login" && method === "POST") {
  17 |       if (loginResult === "success") {
  18 |         await route.fulfill({
  19 |           status: 200,
  20 |           contentType: "application/json",
  21 |           body: JSON.stringify({ token: "mock-admin-token-abc123" }),
  22 |         });
  23 |       } else if (loginResult === "wrong-creds") {
  24 |         await route.fulfill({
  25 |           status: 401,
  26 |           contentType: "application/json",
  27 |           body: JSON.stringify({ error: "Invalid credentials" }),
  28 |         });
  29 |       } else {
  30 |         await route.fulfill({
  31 |           status: 500,
  32 |           contentType: "application/json",
  33 |           body: JSON.stringify({ error: "Internal server error" }),
  34 |         });
  35 |       }
  36 |     } else if (pathname === "/api/admin/me" && method === "GET") {
  37 |       await route.fulfill({
  38 |         status: 200,
  39 |         contentType: "application/json",
  40 |         body: JSON.stringify(MOCK_ADMIN),
  41 |       });
  42 |     } else {
  43 |       await route.continue();
  44 |     }
  45 |   });
  46 | }
  47 | 
  48 | test.describe("Admin login", () => {
  49 |   test("shows 'Login failed' toast when wrong credentials are submitted", async ({ page }) => {
  50 |     await setupLoginMocks(page, { loginResult: "wrong-creds" });
  51 |     await page.goto("/admin/login");
  52 | 
  53 |     await page.getByTestId("input-admin-email").fill("wrong@example.com");
  54 |     await page.getByTestId("input-admin-password").fill("badpassword");
  55 |     await page.getByTestId("button-admin-login").click();
  56 | 
  57 |     await expect(
  58 |       page.getByText("Login failed", { exact: true }).first()
  59 |     ).toBeVisible({ timeout: 8000 });
  60 | 
  61 |     await expect(page).not.toHaveURL(/\/admin\/dashboard/, { timeout: 2000 });
  62 |   });
  63 | 
  64 |   test("stays on login page and shows field error when email is left empty", async ({ page }) => {
  65 |     let loginCalled = false;
  66 |     await page.route("**/api/admin/login", async (route) => {
  67 |       loginCalled = true;
  68 |       await route.continue();
  69 |     });
  70 | 
  71 |     await page.goto("/admin/login");
> 72 |     await page.getByTestId("input-admin-password").fill("somepassword");
     |                                                    ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  73 |     await page.getByTestId("button-admin-login").click();
  74 | 
  75 |     await expect(page.locator("text=Invalid email address").first()).toBeVisible({
  76 |       timeout: 5000,
  77 |     });
  78 |     expect(loginCalled).toBe(false);
  79 |     await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  80 |   });
  81 | 
  82 |   test("redirects to /admin/dashboard on successful login", async ({ page }) => {
  83 |     await setupLoginMocks(page, { loginResult: "success" });
  84 |     await page.goto("/admin/login");
  85 | 
  86 |     await page.getByTestId("input-admin-email").fill("admin@test.com");
  87 |     await page.getByTestId("input-admin-password").fill("correctpassword");
  88 |     await page.getByTestId("button-admin-login").click();
  89 | 
  90 |     await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  91 |   });
  92 | });
  93 | 
```