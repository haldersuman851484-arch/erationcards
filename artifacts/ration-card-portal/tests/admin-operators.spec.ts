import { test, expect, type Page } from "@playwright/test";

/**
 * Admin → Operators tab: full operator management.
 *
 * Covers: listing every operator with details, status filtering, approve
 * from the tab, editing every field (client validation + server 409 on a
 * duplicate email), permanent termination behind a confirmation, and the
 * Download-all CSV export.
 *
 * Per the project convention, EVERY /api/** route is fulfilled by mocks —
 * any real-API 401 triggers the global session-expired redirect mid-test.
 */

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

type Op = {
  id: number; name: string; email: string; phone: string; shopName: string;
  address: string; state: string; district: string; pincode: string;
  status: string; walletBalance: number; totalOrdersHandled: number; createdAt: string;
};

function initialOperators(): Op[] {
  return [
    {
      id: 11, name: "Rakesh Mondal", email: "rakesh@shop.in", phone: "9830012345",
      shopName: "Mondal Xerox", address: "Bazar Road, Basirhat", state: "West Bengal",
      district: "North 24 Parganas", pincode: "743411", status: "pending",
      walletBalance: 0, totalOrdersHandled: 0, createdAt: "2026-07-30T10:00:00.000Z",
    },
    {
      id: 12, name: "অমিত সাহা", email: "amit@cyber.in", phone: "9830512399",
      shopName: "Saha Cyber Cafe", address: "College Para, Siliguri", state: "West Bengal",
      district: "Darjeeling", pincode: "734001", status: "active",
      walletBalance: 1250.5, totalOrdersHandled: 42, createdAt: "2026-06-10T10:00:00.000Z",
    },
    {
      id: 13, name: "Fatima Begum", email: "fatima@seva.in", phone: "9830987654",
      shopName: "Seva Kendra", address: "Station Road, Asansol", state: "West Bengal",
      district: "Paschim Bardhaman", pincode: "713301", status: "suspended",
      walletBalance: 75, totalOrdersHandled: 7, createdAt: "2026-05-01T10:00:00.000Z",
    },
  ];
}

type MockState = {
  operators: Op[];
  patches: Array<{ id: number } & Record<string, unknown>>;
  statusPatches: Array<{ id: number; status: string }>;
  deletes: number[];
  exportHits: number;
};

async function setupMocks(page: Page): Promise<MockState> {
  const state: MockState = {
    operators: initialOperators(),
    patches: [],
    statusPatches: [],
    deletes: [],
    exportHits: 0,
  };

  await page.addInitScript(() => {
    localStorage.setItem("adminToken", "test-admin-token");
  });

  await page.route("**/api/**", async (route, request) => {
    const { pathname } = new URL(request.url());
    const method = request.method();

    if (pathname === "/api/admin/me") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ADMIN) });
      return;
    }

    if (pathname === "/api/operators" && method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(state.operators) });
      return;
    }

    const statusMatch = pathname.match(/^\/api\/admin\/operators\/(\d+)\/status$/);
    if (statusMatch && method === "PATCH") {
      const id = Number(statusMatch[1]);
      const body = request.postDataJSON() as { status: string };
      state.statusPatches.push({ id, status: body.status });
      const op = state.operators.find((o) => o.id === id);
      if (op) op.status = body.status;
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ id, name: op?.name, email: op?.email, status: body.status }),
      });
      return;
    }

    if (pathname === "/api/admin/operators/export" && method === "GET") {
      state.exportHits += 1;
      await route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="operators_2026-08-05.csv"',
        },
        body: "\uFEFFID,Name,Email\r\n11,Rakesh Mondal,rakesh@shop.in\r\n",
      });
      return;
    }

    const idMatch = pathname.match(/^\/api\/admin\/operators\/(\d+)$/);
    if (idMatch && method === "PATCH") {
      const id = Number(idMatch[1]);
      const body = request.postDataJSON() as Record<string, unknown>;
      state.patches.push({ id, ...body });
      const dupe = state.operators.find((o) => o.email === body.email && o.id !== id);
      if (dupe) {
        await route.fulfill({
          status: 409, contentType: "application/json",
          body: JSON.stringify({ error: `Another operator (${dupe.name}) already uses ${body.email}. Each operator needs their own email.` }),
        });
        return;
      }
      const op = state.operators.find((o) => o.id === id);
      if (op) Object.assign(op, body);
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(op ?? {}) });
      return;
    }
    if (idMatch && method === "DELETE") {
      const id = Number(idMatch[1]);
      state.deletes.push(id);
      state.operators = state.operators.filter((o) => o.id !== id);
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ success: true, ordersKept: 42 }),
      });
      return;
    }

    // Fallback: benign empty payload. Never let calls reach the real API —
    // a 401 from it triggers the global session-expired redirect mid-test.
    await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  return state;
}

async function openOperatorsTab(page: Page) {
  await page.goto("/admin/dashboard");
  // Operators is the default tab; wait for the roster to render.
  await expect(page.getByTestId("row-operator-12")).toBeVisible({ timeout: 10000 });
}

test.describe("Admin operator management", () => {
  test("lists every operator (all statuses) with full details", async ({ page }) => {
    await setupMocks(page);
    await openOperatorsTab(page);

    // All three operators, whatever their status.
    for (const id of [11, 12, 13]) {
      await expect(page.getByTestId(`row-operator-${id}`)).toBeVisible();
    }

    // Bengali name renders, plus shop, contact, location, wallet, orders, joined date.
    const activeRow = page.getByTestId("row-operator-12");
    await expect(activeRow).toContainText("অমিত সাহা");
    await expect(activeRow).toContainText("Saha Cyber Cafe");
    await expect(activeRow).toContainText("amit@cyber.in");
    await expect(activeRow).toContainText("9830512399");
    await expect(activeRow).toContainText("Darjeeling");
    await expect(activeRow).toContainText("PIN 734001");
    await expect(activeRow).toContainText("₹1,250.50");
    await expect(activeRow).toContainText("42");
    await expect(activeRow).toContainText("10 Jun 2026");
    await expect(activeRow).toContainText("Active");

    await expect(page.getByTestId("row-operator-11")).toContainText("Pending");
    await expect(page.getByTestId("row-operator-13")).toContainText("Suspended");

    // The tab badge counts pending applications.
    await expect(page.getByTestId("tab-operators")).toContainText("1");
  });

  test("status filters narrow the list", async ({ page }) => {
    await setupMocks(page);
    await openOperatorsTab(page);

    await page.getByTestId("filter-operators-pending").click();
    await expect(page.getByTestId("row-operator-11")).toBeVisible();
    await expect(page.getByTestId("row-operator-12")).not.toBeVisible();
    await expect(page.getByTestId("row-operator-13")).not.toBeVisible();

    await page.getByTestId("filter-operators-suspended").click();
    await expect(page.getByTestId("row-operator-13")).toBeVisible();
    await expect(page.getByTestId("row-operator-11")).not.toBeVisible();

    await page.getByTestId("filter-operators-all").click();
    for (const id of [11, 12, 13]) {
      await expect(page.getByTestId(`row-operator-${id}`)).toBeVisible();
    }
  });

  test("approve and suspend still work from the roster", async ({ page }) => {
    const state = await setupMocks(page);
    await openOperatorsTab(page);

    await page.getByTestId("button-approve-operator-11").click();
    await expect(page.getByText("Operator approved! They can now log in.").first()).toBeVisible();
    expect(state.statusPatches).toContainEqual({ id: 11, status: "active" });

    await page.getByTestId("button-suspend-operator-12").click();
    await expect(page.getByText("Operator suspended. They can no longer log in.").first()).toBeVisible();
    expect(state.statusPatches).toContainEqual({ id: 12, status: "suspended" });
  });

  test("edit dialog saves every field", async ({ page }) => {
    const state = await setupMocks(page);
    await openOperatorsTab(page);

    await page.getByTestId("button-edit-operator-12").click();
    await expect(page.getByTestId("input-operator-name")).toHaveValue("অমিত সাহা");
    await expect(page.getByTestId("input-operator-email")).toHaveValue("amit@cyber.in");

    await page.getByTestId("input-operator-name").fill("Amit Saha");
    await page.getByTestId("input-operator-phone").fill("9830512340");
    await page.getByTestId("input-operator-shopName").fill("Saha Digital Seva");
    await page.getByTestId("input-operator-walletBalance").fill("1500");
    await page.getByTestId("button-save-operator").click();

    await expect(page.getByText("Operator details saved.").first()).toBeVisible();
    expect(state.patches).toHaveLength(1);
    expect(state.patches[0]).toMatchObject({
      id: 12,
      name: "Amit Saha",
      email: "amit@cyber.in",
      phone: "9830512340",
      shopName: "Saha Digital Seva",
      address: "College Para, Siliguri",
      state: "West Bengal",
      district: "Darjeeling",
      pincode: "734001",
      status: "active",
      walletBalance: 1500,
    });

    // The roster reflects the saved changes.
    await expect(page.getByTestId("row-operator-12")).toContainText("Amit Saha");
    await expect(page.getByTestId("row-operator-12")).toContainText("₹1,500.00");
  });

  test("a duplicate email is rejected with the server's clear message", async ({ page }) => {
    await setupMocks(page);
    await openOperatorsTab(page);

    await page.getByTestId("button-edit-operator-12").click();
    await page.getByTestId("input-operator-email").fill("rakesh@shop.in");
    await page.getByTestId("button-save-operator").click();

    await expect(page.getByText(/already uses rakesh@shop\.in/).first()).toBeVisible();
    // Dialog stays open so the admin can fix the email.
    await expect(page.getByTestId("input-operator-email")).toBeVisible();
  });

  test("client-side validation blocks bad values before any request", async ({ page }) => {
    const state = await setupMocks(page);
    await openOperatorsTab(page);

    await page.getByTestId("button-edit-operator-12").click();
    await page.getByTestId("input-operator-pincode").fill("12");
    await page.getByTestId("input-operator-phone").fill("12345");
    await page.getByTestId("input-operator-walletBalance").fill("-50");
    await page.getByTestId("button-save-operator").click();

    await expect(page.getByTestId("error-operator-pincode")).toContainText("PIN code must be 6 digits");
    await expect(page.getByTestId("error-operator-phone")).toBeVisible();
    await expect(page.getByTestId("error-operator-walletBalance")).toBeVisible();
    expect(state.patches).toHaveLength(0);
  });

  test("terminate needs confirmation; cancel keeps the account", async ({ page }) => {
    const state = await setupMocks(page);
    await openOperatorsTab(page);

    await page.getByTestId("button-terminate-operator-13").click();
    await expect(page.getByText("Permanently delete Fatima Begum?")).toBeVisible();
    await expect(page.getByText(/permanent and cannot be undone/)).toBeVisible();
    await expect(page.getByText(/past orders and records stay/)).toBeVisible();

    await page.getByTestId("button-cancel-terminate").click();
    await expect(page.getByTestId("row-operator-13")).toBeVisible();
    expect(state.deletes).toHaveLength(0);
  });

  test("confirming terminate deletes the account and keeps past orders", async ({ page }) => {
    const state = await setupMocks(page);
    await openOperatorsTab(page);

    await page.getByTestId("button-terminate-operator-13").click();
    await page.getByTestId("button-confirm-terminate").click();

    await expect(page.getByText("Fatima Begum's account is deleted.").first()).toBeVisible();
    await expect(page.getByText(/42 past orders stay in your records/).first()).toBeVisible();
    expect(state.deletes).toEqual([13]);
    await expect(page.getByTestId("row-operator-13")).not.toBeVisible();
    await expect(page.getByTestId("row-operator-11")).toBeVisible();
  });

  test("download all saves the CSV from the export endpoint", async ({ page }) => {
    const state = await setupMocks(page);
    await openOperatorsTab(page);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("button-download-operators").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("operators_2026-08-05.csv");
    expect(state.exportHits).toBe(1);
    await expect(page.getByText("Download started").first()).toBeVisible();
  });
});
