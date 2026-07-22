# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: order-form.spec.ts >> Order form >> shows a validation error when customerName is empty and stays on step 1
- Location: tests/order-form.spec.ts:147:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByTestId('input-ration-card-number')

```

# Test source

```ts
  53  |       await route.fulfill({
  54  |         status: 201,
  55  |         contentType: "application/json",
  56  |         body: JSON.stringify(MOCK_ORDER_RESPONSE),
  57  |       });
  58  |     } else {
  59  |       await route.continue();
  60  |     }
  61  |   });
  62  | }
  63  | 
  64  | async function fillStep1(page: import("@playwright/test").Page) {
  65  |   await page.getByTestId("input-customer-name").fill("Rajesh Kumar");
  66  |   await page.getByTestId("input-ration-card-number").fill("WB01234567890");
  67  |   await page.getByTestId("button-next-step1").click();
  68  |   await expect(page.getByTestId("dialog-family-member")).toBeVisible({
  69  |     timeout: 5000,
  70  |   });
  71  |   await page.getByTestId("button-family-no").click();
  72  | }
  73  | 
  74  | async function fillStep2(page: import("@playwright/test").Page) {
  75  |   await page.getByTestId("input-delivery-name").fill("Rajesh Kumar");
  76  |   await page.getByTestId("input-address").fill("12 Park Street, Kolkata");
  77  |   await page.getByTestId("input-post-office").fill("Park Street");
  78  |   await page.getByTestId("select-district").click();
  79  |   const kolkataOption = page.getByRole("option", { name: "Kolkata" });
  80  |   await expect(kolkataOption).toBeVisible({ timeout: 5000 });
  81  |   await kolkataOption.click();
  82  |   await page.getByTestId("input-pincode").fill("700001");
  83  |   await page.getByTestId("input-phone").fill("9876543210");
  84  |   await expect(page.getByTestId("button-next-step2")).toBeEnabled({ timeout: 3000 });
  85  |   await page.getByTestId("button-next-step2").click();
  86  | }
  87  | 
  88  | async function reachStep3(page: import("@playwright/test").Page) {
  89  |   await fillStep1(page);
  90  |   await expect(page.getByTestId("input-delivery-name")).toBeVisible({
  91  |     timeout: 5000,
  92  |   });
  93  |   await fillStep2(page);
  94  |   await expect(page.getByTestId("button-upload-screenshot")).toBeVisible({
  95  |     timeout: 5000,
  96  |   });
  97  |   await page.setInputFiles('[data-testid="input-screenshot"]', {
  98  |     name: "screenshot.jpg",
  99  |     mimeType: "image/jpeg",
  100 |     buffer: Buffer.from("fake-image-data"),
  101 |   });
  102 |   await expect(page.locator("text=Screenshot selected")).toBeVisible({
  103 |     timeout: 3000,
  104 |   });
  105 | }
  106 | 
  107 | test.describe("Order form", () => {
  108 |   test("completes all 3 steps and submits the order successfully", async ({
  109 |     page,
  110 |   }) => {
  111 |     await setupOrderMocks(page);
  112 |     await page.goto("/order");
  113 | 
  114 |     await fillStep1(page);
  115 | 
  116 |     await expect(page.getByTestId("input-delivery-name")).toBeVisible({
  117 |       timeout: 5000,
  118 |     });
  119 |     await fillStep2(page);
  120 | 
  121 |     await expect(page.getByTestId("button-upload-screenshot")).toBeVisible({
  122 |       timeout: 5000,
  123 |     });
  124 |     await expect(page.getByTestId("text-merchant-upi-id")).toContainText(
  125 |       "test@upi"
  126 |     );
  127 | 
  128 |     await page.setInputFiles('[data-testid="input-screenshot"]', {
  129 |       name: "screenshot.jpg",
  130 |       mimeType: "image/jpeg",
  131 |       buffer: Buffer.from("fake-image-data"),
  132 |     });
  133 | 
  134 |     await expect(page.locator("text=Screenshot selected")).toBeVisible({
  135 |       timeout: 3000,
  136 |     });
  137 | 
  138 |     const submitButton = page.getByTestId("button-submit-order");
  139 |     await expect(submitButton).toBeEnabled({ timeout: 3000 });
  140 |     await submitButton.click();
  141 | 
  142 |     await expect(page).toHaveURL(/\/order-upload\/PVCTEST001/, {
  143 |       timeout: 10000,
  144 |     });
  145 |   });
  146 | 
  147 |   test("shows a validation error when customerName is empty and stays on step 1", async ({
  148 |     page,
  149 |   }) => {
  150 |     await setupOrderMocks(page);
  151 |     await page.goto("/order");
  152 | 
> 153 |     await page.getByTestId("input-ration-card-number").fill("WB01234567890");
      |                                                        ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  154 |     await page.getByTestId("button-next-step1").click();
  155 | 
  156 |     await expect(
  157 |       page.locator("text=Name must be at least 2 characters")
  158 |     ).toBeVisible({ timeout: 3000 });
  159 | 
  160 |     await expect(page.getByTestId("dialog-family-member")).not.toBeVisible();
  161 |     await expect(page.getByTestId("input-customer-name")).toBeVisible();
  162 |   });
  163 | 
  164 |   test("accepts a screenshot file and shows a preview before submission", async ({
  165 |     page,
  166 |   }) => {
  167 |     await setupOrderMocks(page);
  168 |     await page.goto("/order");
  169 | 
  170 |     await fillStep1(page);
  171 |     await expect(page.getByTestId("input-delivery-name")).toBeVisible({
  172 |       timeout: 5000,
  173 |     });
  174 |     await fillStep2(page);
  175 | 
  176 |     await expect(page.getByTestId("button-upload-screenshot")).toBeVisible({
  177 |       timeout: 5000,
  178 |     });
  179 | 
  180 |     await page.setInputFiles('[data-testid="input-screenshot"]', {
  181 |       name: "payment.png",
  182 |       mimeType: "image/png",
  183 |       buffer: Buffer.from("fake-png-data"),
  184 |     });
  185 | 
  186 |     await expect(page.locator("text=Screenshot selected")).toBeVisible({
  187 |       timeout: 3000,
  188 |     });
  189 |     await expect(
  190 |       page.getByTestId("button-upload-screenshot")
  191 |     ).not.toBeVisible();
  192 |   });
  193 | 
  194 |   test("shows an error and stays on step 3 when the order API returns 500 after screenshot upload", async ({
  195 |     page,
  196 |   }) => {
  197 |     await page.route("**/api/**", async (route, request) => {
  198 |       const url = new URL(request.url());
  199 |       const { pathname } = url;
  200 |       const method = request.method();
  201 | 
  202 |       if (pathname === "/api/payments/upi-config" && method === "GET") {
  203 |         await route.fulfill({
  204 |           status: 200,
  205 |           contentType: "application/json",
  206 |           body: JSON.stringify({ merchantUpiId: "test@upi" }),
  207 |         });
  208 |       } else if (
  209 |         pathname === "/api/payments/upload-screenshot" &&
  210 |         method === "POST"
  211 |       ) {
  212 |         await route.fulfill({
  213 |           status: 200,
  214 |           contentType: "application/json",
  215 |           body: JSON.stringify({ url: "https://example.com/screenshot.jpg" }),
  216 |         });
  217 |       } else if (pathname === "/api/orders" && method === "POST") {
  218 |         await route.fulfill({
  219 |           status: 500,
  220 |           contentType: "application/json",
  221 |           body: JSON.stringify({ error: "Internal server error" }),
  222 |         });
  223 |       } else {
  224 |         await route.continue();
  225 |       }
  226 |     });
  227 | 
  228 |     await page.goto("/order");
  229 |     await reachStep3(page);
  230 | 
  231 |     const submitButton = page.getByTestId("button-submit-order");
  232 |     await expect(submitButton).toBeEnabled({ timeout: 3000 });
  233 |     await submitButton.click();
  234 | 
  235 |     await expect(
  236 |       page.getByText("Failed to place order", { exact: true }).first()
  237 |     ).toBeVisible({
  238 |       timeout: 8000,
  239 |     });
  240 |     await expect(page).not.toHaveURL(/\/order-upload\//, { timeout: 3000 });
  241 |     await expect(submitButton).toBeEnabled({ timeout: 5000 });
  242 |   });
  243 | 
  244 |   test("shows an upload error and does not call the order API when screenshot upload fails", async ({
  245 |     page,
  246 |   }) => {
  247 |     let orderApiCalled = false;
  248 | 
  249 |     await page.route("**/api/**", async (route, request) => {
  250 |       const url = new URL(request.url());
  251 |       const { pathname } = url;
  252 |       const method = request.method();
  253 | 
```