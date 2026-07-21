import { test, expect } from "@playwright/test";

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

async function setupLoginMocks(
  page: import("@playwright/test").Page,
  {
    loginResult = "success",
  }: { loginResult?: "success" | "wrong-creds" | "server-error" } = {}
) {
  await page.route("**/api/**", async (route, request) => {
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/admin/login" && method === "POST") {
      if (loginResult === "success") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ token: "mock-admin-token-abc123" }),
        });
      } else if (loginResult === "wrong-creds") {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invalid credentials" }),
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      }
    } else if (pathname === "/api/admin/me" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ADMIN),
      });
    } else {
      await route.continue();
    }
  });
}

test.describe("Admin login", () => {
  test("shows 'Login failed' toast when wrong credentials are submitted", async ({ page }) => {
    await setupLoginMocks(page, { loginResult: "wrong-creds" });
    await page.goto("/admin/login");

    await page.getByTestId("input-admin-email").fill("wrong@example.com");
    await page.getByTestId("input-admin-password").fill("badpassword");
    await page.getByTestId("button-admin-login").click();

    await expect(
      page.getByText("Login failed", { exact: true }).first()
    ).toBeVisible({ timeout: 8000 });

    await expect(page).not.toHaveURL(/\/admin\/dashboard/, { timeout: 2000 });
  });

  test("stays on login page and shows field error when email is left empty", async ({ page }) => {
    let loginCalled = false;
    await page.route("**/api/admin/login", async (route) => {
      loginCalled = true;
      await route.continue();
    });

    await page.goto("/admin/login");
    await page.getByTestId("input-admin-password").fill("somepassword");
    await page.getByTestId("button-admin-login").click();

    await expect(page.locator("text=Invalid email address").first()).toBeVisible({
      timeout: 5000,
    });
    expect(loginCalled).toBe(false);
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
  });

  test("redirects to /admin/dashboard on successful login", async ({ page }) => {
    await setupLoginMocks(page, { loginResult: "success" });
    await page.goto("/admin/login");

    await page.getByTestId("input-admin-email").fill("admin@test.com");
    await page.getByTestId("input-admin-password").fill("correctpassword");
    await page.getByTestId("button-admin-login").click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });
});
