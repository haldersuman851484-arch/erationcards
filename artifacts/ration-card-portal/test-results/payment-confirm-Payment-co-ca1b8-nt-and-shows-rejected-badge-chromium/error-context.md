# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payment-confirm.spec.ts >> Payment confirmation >> Reject button disappears after rejecting payment and shows rejected badge
- Location: tests/payment-confirm.spec.ts:144:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('button-reject-payment-42')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('button-reject-payment-42')

```

# Test source

```ts
  53  | async function setupMocks(
  54  |   page: import("@playwright/test").Page,
  55  |   {
  56  |     orders,
  57  |     onPaymentUpdate,
  58  |   }: {
  59  |     orders: OrderShape[];
  60  |     onPaymentUpdate?: (id: number, body: Record<string, unknown>) => void;
  61  |   }
  62  | ) {
  63  |   await page.addInitScript(() => {
  64  |     localStorage.setItem("adminToken", "test-admin-token");
  65  |   });
  66  | 
  67  |   await page.route("**/api/**", async (route, request) => {
  68  |     const url = new URL(request.url());
  69  |     const { pathname } = url;
  70  |     const method = request.method();
  71  | 
  72  |     if (pathname === "/api/admin/me") {
  73  |       await route.fulfill({
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
  104 |     } else if (/^\/api\/orders\/\d+\/payment-status$/.test(pathname) && method === "PATCH") {
  105 |       const id = parseInt(pathname.split("/")[3]);
  106 |       const body = JSON.parse(request.postData() ?? "{}");
  107 |       onPaymentUpdate?.(id, body);
  108 |       const original = orders.find((o) => o.id === id) ?? orders[0];
  109 |       const updated = { ...original, ...body };
  110 |       const idx = orders.findIndex((o) => o.id === id);
  111 |       if (idx !== -1) Object.assign(orders[idx], body);
  112 |       await route.fulfill({
  113 |         status: 200,
  114 |         contentType: "application/json",
  115 |         body: JSON.stringify(updated),
  116 |       });
  117 |     } else {
  118 |       await route.continue();
  119 |     }
  120 |   });
  121 | }
  122 | 
  123 | test.describe("Payment confirmation", () => {
  124 |   test("Confirm button disappears after confirming payment and shows confirmed badge", async ({ page }) => {
  125 |     const orders = [makeOrder()];
  126 | 
  127 |     await setupMocks(page, {
  128 |       orders,
  129 |       onPaymentUpdate: (_id, body) => { Object.assign(orders[0], body); },
  130 |     });
  131 | 
  132 |     await page.goto("/admin/dashboard");
  133 |     await expect(page.getByTestId("button-confirm-payment-42")).toBeVisible({ timeout: 10000 });
  134 |     await expect(page.getByTestId("button-reject-payment-42")).toBeVisible();
  135 | 
  136 |     await page.getByTestId("button-confirm-payment-42").click();
  137 | 
  138 |     await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible({ timeout: 8000 });
  139 |     await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();
  140 | 
  141 |     await expect(page.getByText("confirmed").first()).toBeVisible({ timeout: 5000 });
  142 |   });
  143 | 
  144 |   test("Reject button disappears after rejecting payment and shows rejected badge", async ({ page }) => {
  145 |     const orders = [makeOrder()];
  146 | 
  147 |     await setupMocks(page, {
  148 |       orders,
  149 |       onPaymentUpdate: (_id, body) => { Object.assign(orders[0], body); },
  150 |     });
  151 | 
  152 |     await page.goto("/admin/dashboard");
> 153 |     await expect(page.getByTestId("button-reject-payment-42")).toBeVisible({ timeout: 10000 });
      |                                                                ^ Error: expect(locator).toBeVisible() failed
  154 | 
  155 |     await page.getByTestId("button-reject-payment-42").click();
  156 | 
  157 |     await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible({ timeout: 8000 });
  158 |     await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();
  159 | 
  160 |     await expect(page.getByText("rejected").first()).toBeVisible({ timeout: 5000 });
  161 |   });
  162 | 
  163 |   test("already-confirmed order shows no Confirm or Reject buttons", async ({ page }) => {
  164 |     const orders = [makeOrder({ paymentStatus: "confirmed" })];
  165 | 
  166 |     await setupMocks(page, { orders });
  167 | 
  168 |     await page.goto("/admin/dashboard");
  169 |     await expect(page.locator("text=PVCPAY001")).toBeVisible({ timeout: 10000 });
  170 | 
  171 |     await expect(page.getByTestId("button-confirm-payment-42")).not.toBeVisible();
  172 |     await expect(page.getByTestId("button-reject-payment-42")).not.toBeVisible();
  173 | 
  174 |     await expect(page.getByText("confirmed").first()).toBeVisible();
  175 |   });
  176 | });
  177 | 
```