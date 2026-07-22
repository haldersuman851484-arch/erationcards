# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-order-list.spec.ts >> Admin order list >> renders several seeded orders and shows their statuses
- Location: tests/admin-order-list.spec.ts:129:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=PVC001')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('text=PVC001')

```

# Test source

```ts
  33  |     familyCards: [],
  34  |     quantity: 1,
  35  |     amount: "149",
  36  |     status: "pending",
  37  |     paymentStatus: "confirmed",
  38  |     paymentMethod: "upi",
  39  |     paymentScreenshotUrl: null,
  40  |     operatorId: null,
  41  |     trackingNumber: null,
  42  |     notes: null,
  43  |     createdAt: "2024-07-01T10:00:00.000Z",
  44  |     updatedAt: "2024-07-01T10:00:00.000Z",
  45  |     ...overrides,
  46  |   };
  47  | }
  48  | 
  49  | const SEED_ORDERS = [
  50  |   makeOrder({ id: 1, orderNumber: "PVC001", customerName: "Rajesh Kumar", status: "pending" }),
  51  |   makeOrder({ id: 2, orderNumber: "PVC002", customerName: "Priya Sharma", status: "dispatched" }),
  52  |   makeOrder({ id: 3, orderNumber: "PVC003", customerName: "Suresh Patel", status: "delivered" }),
  53  | ];
  54  | 
  55  | type OrderShape = ReturnType<typeof makeOrder>;
  56  | 
  57  | async function setupMocks(
  58  |   page: import("@playwright/test").Page,
  59  |   {
  60  |     orders = SEED_ORDERS,
  61  |     onStatusUpdate,
  62  |   }: {
  63  |     orders?: OrderShape[];
  64  |     onStatusUpdate?: (id: number, body: Record<string, unknown>) => void;
  65  |   } = {}
  66  | ) {
  67  |   await page.addInitScript(() => {
  68  |     localStorage.setItem("adminToken", "test-admin-token");
  69  |   });
  70  | 
  71  |   await page.route("**/api/**", async (route, request) => {
  72  |     const url = new URL(request.url());
  73  |     const { pathname } = url;
  74  |     const method = request.method();
  75  | 
  76  |     if (pathname === "/api/admin/me") {
  77  |       await route.fulfill({
  78  |         status: 200,
  79  |         contentType: "application/json",
  80  |         body: JSON.stringify(MOCK_ADMIN),
  81  |       });
  82  |     } else if (pathname === "/api/orders/stats") {
  83  |       await route.fulfill({
  84  |         status: 200,
  85  |         contentType: "application/json",
  86  |         body: JSON.stringify(MOCK_STATS),
  87  |       });
  88  |     } else if (pathname.startsWith("/api/operators")) {
  89  |       await route.fulfill({
  90  |         status: 200,
  91  |         contentType: "application/json",
  92  |         body: JSON.stringify([]),
  93  |       });
  94  |     } else if (pathname === "/api/orders" && method === "GET") {
  95  |       const statusFilter = url.searchParams.get("status");
  96  |       const filtered = statusFilter
  97  |         ? orders.filter((o) => o.status === statusFilter)
  98  |         : orders;
  99  |       await route.fulfill({
  100 |         status: 200,
  101 |         contentType: "application/json",
  102 |         body: JSON.stringify({ orders: filtered, total: filtered.length, page: 1, limit: 20 }),
  103 |       });
  104 |     } else if (/^\/api\/orders\/\d+$/.test(pathname) && method === "GET") {
  105 |       const id = parseInt(pathname.split("/").pop()!);
  106 |       const order = orders.find((o) => o.id === id) ?? orders[0];
  107 |       await route.fulfill({
  108 |         status: 200,
  109 |         contentType: "application/json",
  110 |         body: JSON.stringify(order),
  111 |       });
  112 |     } else if (/^\/api\/orders\/\d+$/.test(pathname) && method === "PATCH") {
  113 |       const id = parseInt(pathname.split("/").pop()!);
  114 |       const body = JSON.parse(request.postData() ?? "{}");
  115 |       onStatusUpdate?.(id, body);
  116 |       const original = orders.find((o) => o.id === id) ?? orders[0];
  117 |       await route.fulfill({
  118 |         status: 200,
  119 |         contentType: "application/json",
  120 |         body: JSON.stringify({ ...original, ...body }),
  121 |       });
  122 |     } else {
  123 |       await route.continue();
  124 |     }
  125 |   });
  126 | }
  127 | 
  128 | test.describe("Admin order list", () => {
  129 |   test("renders several seeded orders and shows their statuses", async ({ page }) => {
  130 |     await setupMocks(page);
  131 |     await page.goto("/admin/dashboard");
  132 | 
> 133 |     await expect(page.locator("text=PVC001")).toBeVisible({ timeout: 10000 });
      |                                               ^ Error: expect(locator).toBeVisible() failed
  134 | 
  135 |     await expect(page.locator("text=PVC002")).toBeVisible();
  136 |     await expect(page.locator("text=PVC003")).toBeVisible();
  137 | 
  138 |     await expect(page.locator("text=Rajesh Kumar")).toBeVisible();
  139 |     await expect(page.locator("text=Priya Sharma")).toBeVisible();
  140 |     await expect(page.locator("text=Suresh Patel")).toBeVisible();
  141 | 
  142 |     await expect(page.getByTestId("badge-order-status-1")).toContainText("pending");
  143 |     await expect(page.getByTestId("badge-order-status-2")).toContainText("dispatched");
  144 |     await expect(page.getByTestId("badge-order-status-3")).toContainText("delivered");
  145 |   });
  146 | 
  147 |   test("status filter shows only orders matching the selected status", async ({ page }) => {
  148 |     await setupMocks(page);
  149 |     await page.goto("/admin/dashboard");
  150 | 
  151 |     await expect(page.locator("text=PVC001")).toBeVisible({ timeout: 10000 });
  152 | 
  153 |     await page.getByTestId("select-status-filter").click();
  154 |     await page.getByRole("option", { name: "Dispatched" }).click();
  155 | 
  156 |     await expect(page.locator("text=PVC002")).toBeVisible({ timeout: 10000 });
  157 |     await expect(page.locator("text=PVC001")).not.toBeVisible();
  158 |     await expect(page.locator("text=PVC003")).not.toBeVisible();
  159 |   });
  160 | 
  161 |   test("updating order status from the detail dialog persists the new status in the order list", async ({ page }) => {
  162 |     const orderState = [
  163 |       makeOrder({ id: 1, orderNumber: "PVC001", customerName: "Rajesh Kumar", status: "pending" }),
  164 |     ];
  165 | 
  166 |     await setupMocks(page, {
  167 |       orders: orderState,
  168 |       onStatusUpdate: (id, body) => {
  169 |         const target = orderState.find((o) => o.id === id);
  170 |         if (target) Object.assign(target, body);
  171 |       },
  172 |     });
  173 | 
  174 |     await page.goto("/admin/dashboard");
  175 |     await expect(page.getByTestId("button-view-order-1")).toBeVisible({ timeout: 10000 });
  176 | 
  177 |     await expect(page.getByTestId("badge-order-status-1")).toContainText("pending");
  178 | 
  179 |     await page.getByTestId("button-view-order-1").click();
  180 |     await expect(page.getByTestId("select-dialog-status")).toBeVisible({ timeout: 10000 });
  181 | 
  182 |     await page.getByTestId("select-dialog-status").click();
  183 |     await page.getByRole("option", { name: "Processing" }).click();
  184 | 
  185 |     await expect(page.getByTestId("badge-order-status-1")).toContainText("processing", {
  186 |       timeout: 8000,
  187 |     });
  188 |   });
  189 | });
  190 | 
```