# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: courier-dispatch.spec.ts >> Courier dispatch form >> submitting dispatch form with courier + tracking sends both fields and updates order status
- Location: tests/courier-dispatch.spec.ts:161:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('button-view-order-7')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('button-view-order-7')

```

# Test source

```ts
  74  |         status: 200,
  75  |         contentType: "application/json",
  76  |         body: JSON.stringify(MOCK_ADMIN),
  77  |       });
  78  |     } else if (pathname === "/api/orders/stats") {
  79  |       await route.fulfill({
  80  |         status: 200,
  81  |         contentType: "application/json",
  82  |         body: JSON.stringify(MOCK_STATS),
  83  |       });
  84  |     } else if (pathname.startsWith("/api/operators")) {
  85  |       await route.fulfill({
  86  |         status: 200,
  87  |         contentType: "application/json",
  88  |         body: JSON.stringify([]),
  89  |       });
  90  |     } else if (pathname === "/api/orders" && method === "GET") {
  91  |       await route.fulfill({
  92  |         status: 200,
  93  |         contentType: "application/json",
  94  |         body: JSON.stringify({ orders, total: orders.length, page: 1, limit: 20 }),
  95  |       });
  96  |     } else if (/^\/api\/orders\/\d+$/.test(pathname) && method === "GET") {
  97  |       const id = parseInt(pathname.split("/").pop()!);
  98  |       const order = orders.find((o) => o.id === id) ?? orders[0];
  99  |       await route.fulfill({
  100 |         status: 200,
  101 |         contentType: "application/json",
  102 |         body: JSON.stringify(order),
  103 |       });
  104 |     } else if (/^\/api\/orders\/\d+$/.test(pathname) && method === "PATCH") {
  105 |       const id = parseInt(pathname.split("/").pop()!);
  106 |       const body = JSON.parse(request.postData() ?? "{}");
  107 |       onStatusUpdate?.(id, body);
  108 |       const idx = orders.findIndex((o) => o.id === id);
  109 |       if (idx !== -1) Object.assign(orders[idx], body);
  110 |       await route.fulfill({
  111 |         status: 200,
  112 |         contentType: "application/json",
  113 |         body: JSON.stringify({ ...(orders[idx] ?? orders[0]), ...body }),
  114 |       });
  115 |     } else {
  116 |       await route.continue();
  117 |     }
  118 |   });
  119 | }
  120 | 
  121 | test.describe("Courier dispatch form", () => {
  122 |   test("selecting 'Dispatched' shows the courier form instead of immediately updating status", async ({ page }) => {
  123 |     const orders = [makeOrder()];
  124 |     await setupMocks(page, { orders });
  125 | 
  126 |     await page.goto("/admin/dashboard");
  127 |     await expect(page.getByTestId("button-view-order-7")).toBeVisible({ timeout: 10000 });
  128 |     await page.getByTestId("button-view-order-7").click();
  129 | 
  130 |     await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 8000 });
  131 |     await page.getByTestId("select-dialog-status").click();
  132 |     await page.getByRole("option", { name: "Dispatched" }).click();
  133 | 
  134 |     await expect(page.getByTestId("section-dispatch-form")).toBeVisible({ timeout: 5000 });
  135 |     await expect(page.getByTestId("select-dispatch-courier")).toBeVisible();
  136 |     await expect(page.getByTestId("input-dispatch-tracking")).toBeVisible();
  137 | 
  138 |     await expect(page.getByTestId("badge-order-status-7")).not.toContainText("dispatched");
  139 |   });
  140 | 
  141 |   test("Confirm Dispatch button is disabled until a courier is selected", async ({ page }) => {
  142 |     const orders = [makeOrder()];
  143 |     await setupMocks(page, { orders });
  144 | 
  145 |     await page.goto("/admin/dashboard");
  146 |     await expect(page.getByTestId("button-view-order-7")).toBeVisible({ timeout: 10000 });
  147 |     await page.getByTestId("button-view-order-7").click();
  148 | 
  149 |     await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 8000 });
  150 |     await page.getByTestId("select-dialog-status").click();
  151 |     await page.getByRole("option", { name: "Dispatched" }).click();
  152 | 
  153 |     await expect(page.getByTestId("button-confirm-dispatch")).toBeDisabled({ timeout: 5000 });
  154 | 
  155 |     await page.getByTestId("select-dispatch-courier").click();
  156 |     await page.getByRole("option", { name: "India Post" }).click();
  157 | 
  158 |     await expect(page.getByTestId("button-confirm-dispatch")).toBeEnabled({ timeout: 3000 });
  159 |   });
  160 | 
  161 |   test("submitting dispatch form with courier + tracking sends both fields and updates order status", async ({ page }) => {
  162 |     const orders = [makeOrder()];
  163 |     let capturedBody: Record<string, unknown> = {};
  164 | 
  165 |     await setupMocks(page, {
  166 |       orders,
  167 |       onStatusUpdate: (_id, body) => {
  168 |         capturedBody = body;
  169 |         Object.assign(orders[0], body);
  170 |       },
  171 |     });
  172 | 
  173 |     await page.goto("/admin/dashboard");
> 174 |     await expect(page.getByTestId("button-view-order-7")).toBeVisible({ timeout: 10000 });
      |                                                           ^ Error: expect(locator).toBeVisible() failed
  175 |     await page.getByTestId("button-view-order-7").click();
  176 | 
  177 |     await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 8000 });
  178 |     await page.getByTestId("select-dialog-status").click();
  179 |     await page.getByRole("option", { name: "Dispatched" }).click();
  180 | 
  181 |     await expect(page.getByTestId("section-dispatch-form")).toBeVisible({ timeout: 5000 });
  182 | 
  183 |     await page.getByTestId("select-dispatch-courier").click();
  184 |     await page.getByRole("option", { name: "Delhivery" }).click();
  185 | 
  186 |     await page.getByTestId("input-dispatch-tracking").fill("DEL987654321");
  187 |     await page.getByTestId("button-confirm-dispatch").click();
  188 | 
  189 |     await expect(page.getByTestId("badge-order-status-7")).toContainText("dispatched", { timeout: 8000 });
  190 |     expect(capturedBody.status).toBe("dispatched");
  191 |     expect(capturedBody.courierName).toBe("Delhivery");
  192 |     expect(capturedBody.trackingNumber).toBe("DEL987654321");
  193 |     await expect(page.getByTestId("section-dispatch-form")).not.toBeVisible({ timeout: 3000 });
  194 |   });
  195 | 
  196 |   test("Cancel button hides the dispatch form without updating the order", async ({ page }) => {
  197 |     const orders = [makeOrder()];
  198 |     let patchCalled = false;
  199 | 
  200 |     await setupMocks(page, {
  201 |       orders,
  202 |       onStatusUpdate: () => { patchCalled = true; },
  203 |     });
  204 | 
  205 |     await page.goto("/admin/dashboard");
  206 |     await expect(page.getByTestId("button-view-order-7")).toBeVisible({ timeout: 10000 });
  207 |     await page.getByTestId("button-view-order-7").click();
  208 | 
  209 |     await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 8000 });
  210 |     await page.getByTestId("select-dialog-status").click();
  211 |     await page.getByRole("option", { name: "Dispatched" }).click();
  212 | 
  213 |     await expect(page.getByTestId("section-dispatch-form")).toBeVisible({ timeout: 5000 });
  214 | 
  215 |     await page.getByRole("button", { name: "Cancel" }).click();
  216 | 
  217 |     await expect(page.getByTestId("section-dispatch-form")).not.toBeVisible({ timeout: 3000 });
  218 |     expect(patchCalled).toBe(false);
  219 |     await expect(page.getByTestId("badge-order-status-7")).not.toContainText("dispatched");
  220 |   });
  221 | });
  222 | 
```