# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: track-order-mobile.spec.ts >> Track Order page — estimated delivery banner >> banner appears for dispatched orders
- Location: tests/track-order-mobile.spec.ts:145:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('input-order-number')

```

# Test source

```ts
  12  |   postOffice: null,
  13  |   state: "West Bengal",
  14  |   district: "Kolkata",
  15  |   pincode: "700001",
  16  |   cardType: "BPL",
  17  |   familyCards: [],
  18  |   amount: "149",
  19  |   trackingNumber: null,
  20  |   paymentId: "pay_test123",
  21  |   paymentScreenshotUrl: null,
  22  |   operatorId: null,
  23  |   notes: null,
  24  |   createdAt: "2024-07-01T10:00:00.000Z",
  25  |   updatedAt: "2024-07-01T10:00:00.000Z",
  26  | };
  27  | 
  28  | const MOCK_ORDER = { ...MOCK_ORDER_BASE, status: "processing" };
  29  | const MOCK_DISPATCHED_ORDER = { ...MOCK_ORDER_BASE, status: "dispatched" };
  30  | const MOCK_PENDING_ORDER = { ...MOCK_ORDER_BASE, status: "pending" };
  31  | const MOCK_DELIVERED_ORDER = { ...MOCK_ORDER_BASE, status: "delivered" };
  32  | const MOCK_DISPATCHED_INDIA_POST = {
  33  |   ...MOCK_ORDER_BASE,
  34  |   status: "dispatched",
  35  |   trackingNumber: "EE123456789IN",
  36  | };
  37  | const MOCK_DISPATCHED_UNKNOWN_TRACKING = {
  38  |   ...MOCK_ORDER_BASE,
  39  |   status: "dispatched",
  40  |   trackingNumber: "UNKNWN12345",
  41  | };
  42  | 
  43  | test.describe("Track Order page — mobile layout", () => {
  44  |   test.use({ viewport: { width: 375, height: 812 } });
  45  | 
  46  |   test.beforeEach(async ({ page }) => {
  47  |     await page.route("**/api/orders/track**", async (route) => {
  48  |       await route.fulfill({
  49  |         status: 200,
  50  |         contentType: "application/json",
  51  |         body: JSON.stringify(MOCK_ORDER),
  52  |       });
  53  |     });
  54  |   });
  55  | 
  56  |   test("search form submits and result card renders without horizontal scroll", async ({
  57  |     page,
  58  |   }) => {
  59  |     await page.goto("/track");
  60  | 
  61  |     const orderInput = page.getByTestId("input-order-number");
  62  |     await expect(orderInput).toBeVisible();
  63  |     await orderInput.fill("PVCTEST001");
  64  | 
  65  |     const searchButton = page.getByTestId("button-track-search");
  66  |     await expect(searchButton).toBeEnabled();
  67  |     await searchButton.click();
  68  | 
  69  |     const result = page.getByTestId("order-tracking-result");
  70  |     await expect(result).toBeVisible({ timeout: 10000 });
  71  | 
  72  |     await expect(page.getByTestId("text-order-number")).toContainText(
  73  |       "PVCTEST001"
  74  |     );
  75  |     await expect(page.getByTestId("text-customer-name")).toContainText(
  76  |       "Rajesh Kumar"
  77  |     );
  78  |     await expect(page.getByTestId("status-order")).toContainText("processing");
  79  | 
  80  |     const hasHorizontalScroll = await page.evaluate(() => {
  81  |       return document.documentElement.scrollWidth > window.innerWidth;
  82  |     });
  83  |     expect(hasHorizontalScroll).toBe(false);
  84  |   });
  85  | 
  86  |   test("WhatsApp notify button is visible with correct wa.me href", async ({
  87  |     page,
  88  |   }) => {
  89  |     await page.goto("/track");
  90  | 
  91  |     const orderInput = page.getByTestId("input-order-number");
  92  |     await orderInput.fill("PVCTEST001");
  93  | 
  94  |     const searchButton = page.getByTestId("button-track-search");
  95  |     await searchButton.click();
  96  | 
  97  |     await expect(page.getByTestId("order-tracking-result")).toBeVisible({
  98  |       timeout: 10000,
  99  |     });
  100 | 
  101 |     const whatsappButton = page.getByTestId("button-whatsapp-notify");
  102 |     await expect(whatsappButton).toBeVisible();
  103 | 
  104 |     const href = await whatsappButton.getAttribute("href");
  105 |     expect(href).toMatch(/^https:\/\/wa\.me\//);
  106 |     expect(href).toContain("PVCTEST001");
  107 |   });
  108 | });
  109 | 
  110 | async function searchAndWaitForResult(page: import("@playwright/test").Page) {
  111 |   await page.goto("/track");
> 112 |   await page.getByTestId("input-order-number").fill("PVCTEST001");
      |                                                ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  113 |   await page.getByTestId("button-track-search").click();
  114 |   await expect(page.getByTestId("order-tracking-result")).toBeVisible({
  115 |     timeout: 10000,
  116 |   });
  117 | }
  118 | 
  119 | test.describe("Track Order page — delivery address block", () => {
  120 |   test.beforeEach(async ({ page }) => {
  121 |     await page.route("**/api/orders/track**", async (route) => {
  122 |       await route.fulfill({
  123 |         status: 200,
  124 |         contentType: "application/json",
  125 |         body: JSON.stringify(MOCK_DISPATCHED_ORDER),
  126 |       });
  127 |     });
  128 |   });
  129 | 
  130 |   test("delivery address block shows street, district, state, and pincode for a dispatched order", async ({
  131 |     page,
  132 |   }) => {
  133 |     await searchAndWaitForResult(page);
  134 | 
  135 |     const addressBlock = page.getByTestId("delivery-address");
  136 |     await expect(addressBlock).toBeVisible();
  137 |     await expect(addressBlock).toContainText("12 Park Street");
  138 |     await expect(addressBlock).toContainText("Kolkata");
  139 |     await expect(addressBlock).toContainText("West Bengal");
  140 |     await expect(addressBlock).toContainText("700001");
  141 |   });
  142 | });
  143 | 
  144 | test.describe("Track Order page — estimated delivery banner", () => {
  145 |   test("banner appears for dispatched orders", async ({ page }) => {
  146 |     await page.route("**/api/orders/track**", async (route) => {
  147 |       await route.fulfill({
  148 |         status: 200,
  149 |         contentType: "application/json",
  150 |         body: JSON.stringify(MOCK_DISPATCHED_ORDER),
  151 |       });
  152 |     });
  153 | 
  154 |     await searchAndWaitForResult(page);
  155 | 
  156 |     const banner = page.getByTestId("estimated-delivery");
  157 |     await expect(banner).toBeVisible();
  158 |     await expect(banner).toContainText("Expected in 5–7 working days");
  159 |   });
  160 | 
  161 |   test("banner is absent for pending orders", async ({ page }) => {
  162 |     await page.route("**/api/orders/track**", async (route) => {
  163 |       await route.fulfill({
  164 |         status: 200,
  165 |         contentType: "application/json",
  166 |         body: JSON.stringify(MOCK_PENDING_ORDER),
  167 |       });
  168 |     });
  169 | 
  170 |     await searchAndWaitForResult(page);
  171 | 
  172 |     await expect(page.getByTestId("estimated-delivery")).not.toBeVisible();
  173 |   });
  174 | 
  175 |   test("banner is absent for delivered orders", async ({ page }) => {
  176 |     await page.route("**/api/orders/track**", async (route) => {
  177 |       await route.fulfill({
  178 |         status: 200,
  179 |         contentType: "application/json",
  180 |         body: JSON.stringify(MOCK_DELIVERED_ORDER),
  181 |       });
  182 |     });
  183 | 
  184 |     await searchAndWaitForResult(page);
  185 | 
  186 |     await expect(page.getByTestId("estimated-delivery")).not.toBeVisible();
  187 |   });
  188 | });
  189 | 
  190 | test.describe("Track Order page — courier tracking link", () => {
  191 |   test("shows 'Track with India Post' link for a recognised India Post tracking number on a dispatched order", async ({
  192 |     page,
  193 |   }) => {
  194 |     await page.route("**/api/orders/track**", async (route) => {
  195 |       await route.fulfill({
  196 |         status: 200,
  197 |         contentType: "application/json",
  198 |         body: JSON.stringify(MOCK_DISPATCHED_INDIA_POST),
  199 |       });
  200 |     });
  201 | 
  202 |     await searchAndWaitForResult(page);
  203 | 
  204 |     await expect(page.getByTestId("text-tracking-number")).toContainText(
  205 |       "EE123456789IN"
  206 |     );
  207 | 
  208 |     const courierLink = page.getByTestId("link-track-courier");
  209 |     await expect(courierLink).toBeVisible();
  210 |     await expect(courierLink).toContainText("Track with India Post");
  211 | 
  212 |     const href = await courierLink.getAttribute("href");
```