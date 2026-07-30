import { test, expect } from "@playwright/test";

const MOCK_ADMIN = { id: 1, email: "admin@test.com", role: "admin" };

const MOCK_STATS = {
  totalOrders: 1,
  pendingOrders: 1,
  processingOrders: 0,
  printedOrders: 0,
  dispatchedOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  totalRevenue: 149,
  todayRevenue: 149,
  todayOrders: 1,
};

// 1x1 transparent PNG so the <img> actually loads with a real bounding box.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const SCREENSHOT_URL = "/api/uploads/test-screenshot.png";

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    orderNumber: "PVCROT001",
    customerName: "Anita Bose",
    customerPhone: "9988776655",
    customerEmail: null,
    rationCardNumber: "WB-01-999999999",
    deliveryName: null,
    address: "5 Park Street",
    postOffice: null,
    state: "West Bengal",
    district: "Kolkata",
    pincode: "700016",
    cardType: "PHH",
    familyCards: [],
    rationCardPdfs: [],
    quantity: 1,
    amount: "149",
    status: "pending",
    paymentStatus: "pending",
    paymentMethod: "upi",
    paymentScreenshotUrl: SCREENSHOT_URL,
    operatorId: null,
    trackingNumber: null,
    courierName: null,
    notes: null,
    createdAt: "2024-07-10T08:00:00.000Z",
    updatedAt: "2024-07-10T08:00:00.000Z",
    ...overrides,
  };
}

type OrderShape = ReturnType<typeof makeOrder>;

async function setupProcessingMocks(
  page: import("@playwright/test").Page,
  { orders }: { orders: OrderShape[] }
) {
  await page.addInitScript(() => {
    localStorage.setItem("adminToken", "test-admin-token");
  });

  await page.route("**/api/**", async (route, request) => {
    const url = new URL(request.url());
    const { pathname } = url;
    const method = request.method();

    if (pathname === "/api/admin/me") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ADMIN) });
    } else if (pathname === "/api/orders/stats") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STATS) });
    } else if (pathname.startsWith("/api/operators")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    } else if (pathname.startsWith("/api/uploads/")) {
      await route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG });
    } else if (pathname === "/api/orders" && method === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orders, total: orders.length, page: 1, limit: 20 }),
      });
    } else if (/^\/api\/orders\/\d+$/.test(pathname) && method === "GET") {
      const id = parseInt(pathname.split("/").pop()!);
      const order = orders.find((o) => o.id === id) ?? orders[0];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(order) });
    } else {
      await route.continue();
    }
  });
}

test.describe("Screenshot viewer rotation — processing panel", () => {
  test("table screenshot opens viewer; rotate turns 90° per press, wraps after four, reopens upright", async ({ page }) => {
    await setupProcessingMocks(page, { orders: [makeOrder()] });

    await page.goto("/processing");
    await expect(page.getByTestId("button-view-screenshot-42")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-screenshot-42").click();

    const img = page.getByTestId("img-screenshot-preview");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("data-rotation", "0");

    const rotate = page.getByTestId("button-rotate-screenshot");
    await rotate.click();
    await expect(img).toHaveAttribute("data-rotation", "90");
    // Confirm the rotation is actually applied visually (90° rotation matrix).
    await expect(img).toHaveCSS("transform", "matrix(0, 1, -1, 0, 0, 0)");

    await rotate.click();
    await expect(img).toHaveAttribute("data-rotation", "180");
    await rotate.click();
    await expect(img).toHaveAttribute("data-rotation", "270");
    await rotate.click();
    await expect(img).toHaveAttribute("data-rotation", "0");

    // Leave it rotated, close, reopen — must start upright again.
    await rotate.click();
    await expect(img).toHaveAttribute("data-rotation", "90");
    await page.getByTestId("button-close-screenshot").click();
    await expect(img).not.toBeVisible();

    await page.getByTestId("button-view-screenshot-42").click();
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("data-rotation", "0");
  });

  test("details-dialog thumbnail opens viewer; Escape closes only the viewer, dialog stays open", async ({ page }) => {
    await setupProcessingMocks(page, { orders: [makeOrder()] });

    await page.goto("/processing");
    await expect(page.getByTestId("button-view-order-42")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-order-42").click();

    await expect(page.getByTestId("button-dialog-screenshot")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-dialog-screenshot").click();

    const img = page.getByTestId("img-screenshot-preview");
    await expect(img).toBeVisible();

    // Rotate still works when the viewer sits above the details dialog.
    await page.getByTestId("button-rotate-screenshot").click();
    await expect(img).toHaveAttribute("data-rotation", "90");

    await page.keyboard.press("Escape");
    await expect(img).not.toBeVisible();

    // The details dialog underneath must survive the Escape.
    await expect(page.getByTestId("button-dialog-screenshot")).toBeVisible();
    await expect(page.getByTestId("button-dialog-confirm-payment")).toBeVisible();
  });

  test("keyboard focus is trapped in the viewer — it can never reach the dialog's confirm/reject buttons", async ({ page }) => {
    await setupProcessingMocks(page, { orders: [makeOrder()] });

    await page.goto("/processing");
    await expect(page.getByTestId("button-view-order-42")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-order-42").click();

    await expect(page.getByTestId("button-dialog-screenshot")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-dialog-screenshot").click();
    await expect(page.getByTestId("img-screenshot-preview")).toBeVisible();

    // Initial focus lands on the rotate control.
    await expect(page.getByTestId("button-rotate-screenshot")).toBeFocused();

    // Tabbing cycles through viewer controls only, never the dialog beneath.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press(i % 2 === 0 ? "Tab" : "Shift+Tab");
      const focused = await page.evaluate(
        () => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.tagName ?? null
      );
      expect([
        "button-rotate-screenshot",
        "button-zoom-in-screenshot",
        "button-zoom-out-screenshot",
        "button-close-screenshot",
      ]).toContain(focused);
    }

    // Close and confirm the dialog is intact with no payment action fired.
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("img-screenshot-preview")).not.toBeVisible();
    await expect(page.getByTestId("button-dialog-confirm-payment")).toBeVisible();
    await expect(page.getByTestId("button-dialog-reject-payment")).toBeVisible();
  });
});

test.describe("Screenshot viewer zoom & pan — processing panel", () => {
  test("zoom buttons scale the image, pan only works while zoomed, everything resets on reopen", async ({ page }) => {
    await setupProcessingMocks(page, { orders: [makeOrder()] });

    await page.goto("/processing");
    await expect(page.getByTestId("button-view-screenshot-42")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-screenshot-42").click();

    const img = page.getByTestId("img-screenshot-preview");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("data-zoom", "1");
    await expect(page.getByTestId("text-zoom-level")).toHaveText("100%");
    // Zoom out is disabled at minimum zoom.
    await expect(page.getByTestId("button-zoom-out-screenshot")).toBeDisabled();

    // Not zoomed: dragging must not pan.
    const area = page.getByTestId("screenshot-pan-area");
    const wrapper = page.getByTestId("screenshot-pan-wrapper");
    const box = (await area.boundingBox())!;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy + 40);
    await page.mouse.up();
    await expect(wrapper).toHaveAttribute("data-pan-x", "0");
    await expect(wrapper).toHaveAttribute("data-pan-y", "0");

    // Zoom in twice → 200%.
    const zoomIn = page.getByTestId("button-zoom-in-screenshot");
    await zoomIn.click();
    await expect(img).toHaveAttribute("data-zoom", "1.5");
    await zoomIn.click();
    await expect(img).toHaveAttribute("data-zoom", "2");
    await expect(page.getByTestId("text-zoom-level")).toHaveText("200%");
    // Scale is applied visually alongside rotation (rotate 0, scale 2).
    await expect(img).toHaveCSS("transform", "matrix(2, 0, 0, 2, 0, 0)");

    // Zoomed: drag pans the image.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy + 40, { steps: 3 });
    await page.mouse.up();
    await expect(wrapper).toHaveAttribute("data-pan-x", "60");
    await expect(wrapper).toHaveAttribute("data-pan-y", "40");

    // Zoom works together with rotation.
    await page.getByTestId("button-rotate-screenshot").click();
    await expect(img).toHaveAttribute("data-rotation", "90");
    await expect(img).toHaveAttribute("data-zoom", "2");
    await expect(img).toHaveCSS("transform", "matrix(0, 2, -2, 0, 0, 0)");

    // Zooming back out to 100% recenters the pan and disables zoom-out.
    const zoomOut = page.getByTestId("button-zoom-out-screenshot");
    await zoomOut.click();
    await zoomOut.click();
    await expect(img).toHaveAttribute("data-zoom", "1");
    await expect(wrapper).toHaveAttribute("data-pan-x", "0");
    await expect(wrapper).toHaveAttribute("data-pan-y", "0");
    await expect(zoomOut).toBeDisabled();

    // Zoom in, close, reopen — starts at 100% and upright again.
    await zoomIn.click();
    await expect(img).toHaveAttribute("data-zoom", "1.5");
    await page.getByTestId("button-close-screenshot").click();
    await expect(img).not.toBeVisible();
    await page.getByTestId("button-view-screenshot-42").click();
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("data-zoom", "1");
    await expect(img).toHaveAttribute("data-rotation", "0");
  });

  test("scroll wheel zooms in and out and respects the max limit", async ({ page }) => {
    await setupProcessingMocks(page, { orders: [makeOrder()] });

    await page.goto("/processing");
    await expect(page.getByTestId("button-view-screenshot-42")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-view-screenshot-42").click();

    const img = page.getByTestId("img-screenshot-preview");
    await expect(img).toBeVisible();

    const area = page.getByTestId("screenshot-pan-area");
    const box = (await area.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    // Wheel up zooms in.
    await page.mouse.wheel(0, -100);
    await expect(img).toHaveAttribute("data-zoom", "1.5");

    // Zoom is clamped at the maximum.
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, -100);
    await expect(img).toHaveAttribute("data-zoom", "5");
    await expect(page.getByTestId("button-zoom-in-screenshot")).toBeDisabled();

    // Wheel down zooms back out, clamped at 100%.
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 100);
    await expect(img).toHaveAttribute("data-zoom", "1");
  });
});

test.describe("Screenshot viewer rotation — admin verification log", () => {
  test("verification-log thumbnail opens the shared viewer and rotates", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("adminToken", "test-admin-token");
    });

    await page.route("**/api/**", async (route, request) => {
      const url = new URL(request.url());
      const { pathname } = url;

      if (pathname === "/api/admin/me") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_ADMIN) });
      } else if (pathname === "/api/admin/verifications") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            verifications: [
              {
                id: 7,
                orderNumber: "PVCROT001",
                action: "confirmed",
                adminEmail: "admin@test.com",
                screenshotUrl: SCREENSHOT_URL,
                verifiedAt: "2024-07-10T08:30:00.000Z",
              },
            ],
            total: 1,
          }),
        });
      } else if (pathname === "/api/admin/reviews") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      } else if (pathname.startsWith("/api/operators")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      } else if (pathname === "/api/orders/stats") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_STATS) });
      } else if (pathname.startsWith("/api/uploads/")) {
        await route.fulfill({ status: 200, contentType: "image/png", body: TINY_PNG });
      } else {
        await route.continue();
      }
    });

    await page.goto("/admin/dashboard");
    await expect(page.getByTestId("tab-verifications")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("tab-verifications").click();

    await expect(page.getByTestId("button-verification-screenshot-7")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("button-verification-screenshot-7").click();

    const img = page.getByTestId("img-screenshot-preview");
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute("data-rotation", "0");

    await page.getByTestId("button-rotate-screenshot").click();
    await expect(img).toHaveAttribute("data-rotation", "90");

    await page.getByTestId("button-close-screenshot").click();
    await expect(img).not.toBeVisible();
  });
});
