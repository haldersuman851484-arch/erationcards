# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: family-card-validation.spec.ts >> POST /api/orders — familyCards validation >> rejects familyCards entry with rationCardNumber shorter than 5 characters
- Location: tests/family-card-validation.spec.ts:95:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 502
```

# Test source

```ts
  11  |  */
  12  | import { test, expect } from "@playwright/test";
  13  | 
  14  | /** Minimal valid order body. quantity/amount are required by CreateOrderBody. */
  15  | function validOrderBody(overrides: Record<string, unknown> = {}) {
  16  |   return {
  17  |     customerName: "Rajesh Kumar",
  18  |     customerPhone: "9876543210",
  19  |     rationCardNumber: "WB01234567890",
  20  |     address: "12 Park Street",
  21  |     state: "West Bengal",
  22  |     district: "Kolkata",
  23  |     pincode: "700001",
  24  |     cardType: "AAY",
  25  |     quantity: 1,
  26  |     amount: 70,
  27  |     paymentMethod: "upi",
  28  |     ...overrides,
  29  |   };
  30  | }
  31  | 
  32  | test.describe("POST /api/orders — familyCards validation", () => {
  33  |   // ── Happy paths ──────────────────────────────────────────────────────────
  34  | 
  35  |   test("accepts a valid order with no family cards (quantity 1)", async ({
  36  |     request,
  37  |   }) => {
  38  |     const res = await request.post("/api/orders", {
  39  |       data: validOrderBody({ familyCards: [] }),
  40  |     });
  41  |     expect(res.status()).toBe(201);
  42  |     const body = await res.json();
  43  |     expect(body).toMatchObject({
  44  |       customerName: "Rajesh Kumar",
  45  |       cardType: "AAY",
  46  |       quantity: 1,
  47  |     });
  48  |   });
  49  | 
  50  |   test("accepts a valid order with one well-formed family card", async ({
  51  |     request,
  52  |   }) => {
  53  |     const res = await request.post("/api/orders", {
  54  |       data: validOrderBody({
  55  |         familyCards: [
  56  |           {
  57  |             customerName: "Priya Kumar",
  58  |             rationCardNumber: "WB09876543210",
  59  |             cardType: "PHH",
  60  |           },
  61  |         ],
  62  |         quantity: 2,
  63  |         amount: 100,
  64  |       }),
  65  |     });
  66  |     expect(res.status()).toBe(201);
  67  |     const body = await res.json();
  68  |     expect(body.quantity).toBe(2);
  69  |   });
  70  | 
  71  |   // ── Rejection cases ──────────────────────────────────────────────────────
  72  | 
  73  |   test("rejects familyCards entry with customerName shorter than 2 characters", async ({
  74  |     request,
  75  |   }) => {
  76  |     const res = await request.post("/api/orders", {
  77  |       data: validOrderBody({
  78  |         familyCards: [
  79  |           {
  80  |             customerName: "X",                 // too short (< 2 chars)
  81  |             rationCardNumber: "WB09876543210",
  82  |             cardType: "AAY",
  83  |           },
  84  |         ],
  85  |         quantity: 2,
  86  |         amount: 100,
  87  |       }),
  88  |     });
  89  |     expect(res.status()).toBe(400);
  90  |     const body = await res.json();
  91  |     expect(body.error).toBe("Invalid familyCards");
  92  |     expect(Array.isArray(body.details)).toBe(true);
  93  |   });
  94  | 
  95  |   test("rejects familyCards entry with rationCardNumber shorter than 5 characters", async ({
  96  |     request,
  97  |   }) => {
  98  |     const res = await request.post("/api/orders", {
  99  |       data: validOrderBody({
  100 |         familyCards: [
  101 |           {
  102 |             customerName: "Priya Kumar",
  103 |             rationCardNumber: "WB0",           // too short (< 5 chars)
  104 |             cardType: "AAY",
  105 |           },
  106 |         ],
  107 |         quantity: 2,
  108 |         amount: 100,
  109 |       }),
  110 |     });
> 111 |     expect(res.status()).toBe(400);
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  112 |     const body = await res.json();
  113 |     expect(body.error).toBe("Invalid familyCards");
  114 |     expect(Array.isArray(body.details)).toBe(true);
  115 |   });
  116 | 
  117 |   test("rejects familyCards entry with an invalid cardType", async ({
  118 |     request,
  119 |   }) => {
  120 |     const res = await request.post("/api/orders", {
  121 |       data: validOrderBody({
  122 |         familyCards: [
  123 |           {
  124 |             customerName: "Priya Kumar",
  125 |             rationCardNumber: "WB09876543210",
  126 |             cardType: "INVALID_TYPE",          // not in ALLOWED_CARD_TYPES
  127 |           },
  128 |         ],
  129 |         quantity: 2,
  130 |         amount: 100,
  131 |       }),
  132 |     });
  133 |     expect(res.status()).toBe(400);
  134 |     const body = await res.json();
  135 |     expect(body.error).toBe("Invalid familyCards");
  136 |     expect(Array.isArray(body.details)).toBe(true);
  137 |   });
  138 | 
  139 |   test("rejects familyCards with multiple invalid entries and reports all issues", async ({
  140 |     request,
  141 |   }) => {
  142 |     const res = await request.post("/api/orders", {
  143 |       data: validOrderBody({
  144 |         familyCards: [
  145 |           {
  146 |             customerName: "A",                 // too short
  147 |             rationCardNumber: "WB0",           // too short
  148 |             cardType: "BAD",                   // invalid
  149 |           },
  150 |           {
  151 |             customerName: "Valid Name",
  152 |             rationCardNumber: "WB09876543210",
  153 |             cardType: "PHH",
  154 |           },
  155 |         ],
  156 |         quantity: 3,
  157 |         amount: 150,
  158 |       }),
  159 |     });
  160 |     expect(res.status()).toBe(400);
  161 |     const body = await res.json();
  162 |     expect(body.error).toBe("Invalid familyCards");
  163 |     // At least the first entry's issues should be present
  164 |     expect(Array.isArray(body.details)).toBe(true);
  165 |     expect(body.details.length).toBeGreaterThan(0);
  166 |   });
  167 | 
  168 |   test("rejects order when top-level cardType is not in the allowed list", async ({
  169 |     request,
  170 |   }) => {
  171 |     const res = await request.post("/api/orders", {
  172 |       data: validOrderBody({ cardType: "INVALID_CARD_TYPE" }),
  173 |     });
  174 |     expect(res.status()).toBe(400);
  175 |     const body = await res.json();
  176 |     // This error comes from the explicit cardType check, not FamilyCardsSchema
  177 |     expect(typeof body.error).toBe("string");
  178 |     expect(body.error).toMatch(/Invalid card category/i);
  179 |   });
  180 | });
  181 | 
```