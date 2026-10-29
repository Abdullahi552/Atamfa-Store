# Atamfa POS: Backend Integration Guide

**Audience:** the backend developer.
**Purpose:** explain what the frontend is, how it behaves, and exactly which endpoints, request bodies and response shapes it expects.

The frontend is finished and talks to a REST API. If your API matches this document, no frontend changes are needed. The file `src/mocks/mockAdapter.js` is a **runnable reference implementation** of everything below (in-memory, ~600 lines). When this document and the mock disagree, treat it as a bug and tell the frontend developer.

---

## 1. What the frontend is

A React single-page app (Vite + Tailwind CSS) for a **Hausa Atamfa fabric shop**. The shop sells **raw fabric by the piece ("pic")**, not clothing. There are no product photos: every material is identified by its **cloth colour(s)** (a name + hex code), which the owner picks when adding a material.

### Two kinds of user (role is returned by the API, never chosen on the login form)

| Role | Lands on | Can do |
|---|---|---|
| `admin` (owner) | `/admin` | Dashboard, products, all sales, cashiers, reports, settings |
| `cashier` | `/pos` | Sell (POS terminal), view **own** sales, change own password/picture |

### Screens and the data each one needs

| Screen | Route | Endpoints used |
|---|---|---|
| Login | `/login` | `POST /auth/login`, `GET /auth/me` |
| Admin overview | `/admin` | `GET /dashboard` (auto-refreshes every 60 s) |
| Products | `/admin/products` | `GET/POST/PUT/DELETE /products` |
| Sales (all) | `/admin/sales` | `GET /sales`, `GET /sales/:id`, `POST /sales/:id/refund`, `GET /cashiers`, `GET /products` |
| Cashiers | `/admin/cashiers` | `/cashiers` endpoints |
| Reports | `/admin/reports` | `/reports/*`, `GET /cashiers` |
| Settings | `/admin/settings` | `GET/PUT /settings`, `POST /settings/logo`, `PUT /auth/profile` |
| POS terminal | `/pos` | `GET /products`, `POST /sales`, `GET /sales`, `/suspended-carts`, `POST /sales/:id/refund` |
| My sales | `/pos/my-sales` | `GET /sales`, `GET /sales/:id` |
| Notification bell (admin) | every admin page | `GET /notifications` (polled every 60 s), `POST /notifications/read-all` |
| Profile (both roles) | avatar menu | `PUT /auth/password`, `POST /auth/avatar` |

---

## 2. Conventions (please follow exactly)

**Base URL.** All paths below are relative to the API base (default `/api`, configurable with `VITE_API_BASE_URL`). In production serve the frontend and API on the same domain (reverse proxy `/api`), or enable CORS (see section 9).

**Format.** JSON in and out, `camelCase` keys. Uploads are `multipart/form-data`.

**Auth.** `Authorization: Bearer <jwt>` on every request except `POST /auth/login`. Tokens last 24 h.
- Return **401 only** when the token is missing, invalid or expired. The frontend reacts to any 401 by signing the user out.
- Return **403** when the user is signed in but not allowed (wrong role, deactivated, etc.). Never 401 for that.
- A wrong username/password on login is a 401 and is handled separately on the login screen.

**Money.** Numbers in **naira** with up to 2 decimals (e.g. `18500`, `1250.5`). Never strings, never kobo integers.

**Dates and times.** Timestamps are ISO 8601 UTC strings (`2026-10-27T09:15:00.000Z`).
Date *filters* (`from`, `to`, `date`) are `yyyy-mm-dd`, **inclusive**, interpreted in the **shop's timezone (Africa/Lagos, UTC+1)**. "Today", "this week" and "this month" also use that timezone. Weeks start on **Monday**.

**IDs.** Use one type consistently (integers recommended). The frontend compares IDs with `===`, so never return the same ID as a number in one place and a string in another.

**Pagination.** Query `page` (starts at 1) and `limit`. List responses look like:
```json
{ "data": [ ... ], "pagination": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 } }
```
Default `limit` 20, maximum **500** (the POS loads the whole catalogue with `limit=500`).
Some small lists return just `{ "data": [ ... ] }` (marked below).

**Empty responses.** `204 No Content` with no body for logout, delete and similar.

**Errors.** Any status of 400 or above with this body:
```json
{
  "message": "Human-readable text shown to the user",
  "code": "MACHINE_CODE (optional)",
  "errors": { "fieldName": "message for that field" },
  "details": {}
}
```
`message` is shown directly in toasts, so keep it short and friendly. `errors` keys must equal the **request body field names**; the forms put each message under the matching input. Use **422** for validation, **409** for duplicates, **404** for not found.

Error codes the frontend reacts to:

| `code` | Status | When |
|---|---|---|
| `INSUFFICIENT_STOCK` | 422 | A sale asks for more pics than available. Frontend refreshes the product list. |
| `VACATION_MODE` | 403 | Sales are paused in settings. |
| `DISCOUNT_TOO_HIGH` | 422 | Discount above the shop maximum. |
| `PRODUCT_UNAVAILABLE` | 404 | Product archived or deleted while in a cart. |

---

## 3. Business rules the backend must implement identically

The frontend shows live totals in the cart. The server is the **source of truth**, and its numbers must match the cart to the kobo.

### 3.1 Sale totals
```
subtotal  = round2( sum(unitPrice * quantity) )          // unitPrice = product's CURRENT pricePerPic
maxDisc   = round2( subtotal * settings.maxDiscountPercent / 100 )
rawDisc   = discount.type == "percent" ? subtotal * value / 100 : value
discount  = rawDisc                                        // reject with 422 DISCOUNT_TOO_HIGH if rawDisc > maxDisc + 0.01
taxable   = round2( subtotal - discount )
tax       = round2( taxable * settings.taxRate / 100 )     // tax is applied AFTER discount
total     = round2( taxable + tax )
```
The frontend never sends a discount above the maximum (it caps it first), so rejecting is safe.
Store `taxRate` on the sale so old receipts stay correct if the rate changes later.

### 3.2 Stock
- Stock is tracked **per product** (in pics), **not per colour**. A product can have several colours; they share one stock number.
- Creating a sale must, **in one database transaction**: validate stock (summing quantities across lines of the same product), decrement stock, insert the sale and its items. If any product is short, roll back and return `422 INSUFFICIENT_STOCK` with a message like `Only 3 pics of Satin Wine left.` and `details: { productId, available }`.
- Refunding a sale restores stock for every item (once only).
- **Stock level**, used for badges and the `stockStatus` filter:

| Level | Condition |
|---|---|
| `out` | `stock <= 0` |
| `low` | `stock <= lowStockThreshold` |
| `medium` | `stock <= lowStockThreshold * 3` |
| `high` | otherwise |

`lowStockThreshold` is per product (the global setting only pre-fills new products).

### 3.3 Sale items are snapshots
Each sale item stores, at the time of sale: product id, `name`, `code`, colour (`name` + `hex`), `quantity`, `unitPrice`, **and `unitCost` (the product's cost price then)**. Profit reports use the snapshot `unitCost`, so changing a product's price later must not change history. `unitCost` is **not** returned to the frontend.

### 3.4 Money definitions used in dashboards and reports

| Term | Definition |
|---|---|
| `revenue` | `sum(subtotal - discount)` of **completed** sales. **Tax excluded.** |
| `costOfGoods` | `sum(quantity * unitCost)` of completed sales |
| `grossProfit` | `revenue - costOfGoods` |
| `marginPercent` | `grossProfit / revenue * 100`, rounded to 1 decimal (0 if no revenue) |
| `averageOrderValue` | `sum(total) / completed transactions` (tax included; what customers paid) |
| `todaySales` (dashboard) | `sum(total)` of today's completed sales (tax included) |
| `picsSold` | `sum(quantity)` of completed sales |

Refunded sales are excluded from every figure above.

### 3.5 Sale status and refunds
Statuses: `completed`, `processing`, `refunded`. The POS creates sales directly as `completed` (payment is taken at the till). `processing` exists for future use and for the filter dropdown; the frontend never creates it.

- **Admin** can refund any `completed` sale.
- **Cashier** can refund only **their own** sale and only **on the same day** (this is the "customer did not pay" action in the Recent Orders strip). Otherwise return 403 with a clear message.
- A reason (3+ characters) is required.
- The POS **"Refund"** button on an *unsaved cart* simply clears the cart on the client. No API call is made.

### 3.6 Roles and visibility
- Cashier calls to `GET /sales` and `GET /sales/:id` are **automatically restricted to their own sales** (ignore any `cashierId` they send; return 404 for someone else's sale).
- Admin-only endpoints must return 403 to cashiers. See the permission table in section 5.
- A deactivated user must be rejected immediately, even with a still-valid token (403 on login; 401 on later requests is acceptable).

### 3.7 Cashier shifts (login/logout log)
- A successful **cashier** login opens a shift (`loginAt`) unless one is already open.
- `POST /auth/logout` closes the open shift (`logoutAt`).
- Recommended: also close shifts that were never closed (cashier shut the browser) when the token expires, or after a fixed idle time.
- Deactivating a cashier closes their open shift.
- `durationMinutes` = `(logoutAt or now) - loginAt`, in minutes. `status` is `active` while `logoutAt` is null, otherwise `completed`.

### 3.8 Receipt numbers
Unique, sequential, human-friendly: `RCP-000123` (prefix + zero-padded id is fine).

### 3.9 Vacation mode
When `settings.vacationMode` is true, `POST /sales` returns `403` with `code: "VACATION_MODE"`. Everything else keeps working.

---

## 4. Data shapes

### User (returned by `/auth/*`)
```json
{ "id": 2, "name": "Aisha Bello", "username": "aisha", "role": "cashier",
  "email": null, "phone": null, "avatarUrl": "/uploads/avatars/2.png", "active": true }
```
`avatarUrl` may be `null`, a path (`/uploads/...`, which the frontend prefixes with `VITE_ASSET_BASE_URL`) or an absolute URL.

### Colour
```json
{ "name": "Royal Blue", "hex": "#2457C5" }
```
`hex` is `#RRGGBB`. `name` is free text (the owner can add custom colours).

### Product
```json
{
  "id": 1, "name": "Atamfa Turmi Premium", "code": "TUR-001", "category": "Turmi",
  "colors": [ { "name": "Royal Blue", "hex": "#2457C5" }, { "name": "Gold", "hex": "#C9962B" } ],
  "sizes": [],
  "pricePerPic": 18500, "costPrice": 14000, "stock": 42, "lowStockThreshold": 8,
  "materialType": "100% Cotton", "description": null,
  "archived": false, "createdAt": "2026-01-02T10:00:00.000Z", "updatedAt": "2026-10-20T10:00:00.000Z"
}
```
- `category` is one of: `Turmi`, `Ankara`, `Satin`, `Velvet`, `Lace`, `Cotton`.
- `colors` has **at least one** entry.
- `sizes` is an optional array of `S`, `M`, `L`, `XL`.
- `code` is unique, case-insensitive. The frontend upper-cases it before sending.
- `materialType` and `description` may be `null`.

### Sale (full, from `POST /sales`, `GET /sales/:id`, refund)
```json
{
  "id": 501, "receiptNumber": "RCP-000501",
  "cashier": { "id": 2, "name": "Aisha Bello" },
  "items": [
    { "productId": 1, "name": "Atamfa Turmi Premium", "code": "TUR-001",
      "color": { "name": "Gold", "hex": "#C9962B" },
      "quantity": 3, "unitPrice": 18500, "lineTotal": 55500 }
  ],
  "subtotal": 55500, "discount": 0, "tax": 1110, "taxRate": 2, "total": 56610,
  "paymentMethod": "cash", "amountTendered": 60000,
  "status": "completed", "createdAt": "2026-10-27T09:15:00.000Z",
  "refundedAt": null, "refundReason": null
}
```
`item.color` is `null` for a product with no colour. `amountTendered` is `null` unless the cashier typed it (cash only; informational).

### Sale summary (list rows)
```json
{ "id": 501, "receiptNumber": "RCP-000501", "createdAt": "...", "cashier": { "id": 2, "name": "Aisha Bello" },
  "itemsCount": 3, "paymentMethod": "cash", "total": 56610, "status": "completed" }
```
`itemsCount` = total **pics** across all lines.

### Settings
```json
{ "shopName": "Danladi Atamfa House", "shopAddress": "Kantin Kwari Market, Kano", "shopPhone": "0803 000 0000",
  "shopLogoUrl": null, "taxRate": 2, "maxDiscountPercent": 10, "lowStockThreshold": 5,
  "receiptFooter": "Thank you for your patronage.", "vacationMode": false }
```
Single row. `taxRate` and `maxDiscountPercent` are percentages (0 to 100).

### Shift
```json
{ "id": 9, "cashier": { "id": 2, "name": "Aisha Bello" }, "loginAt": "...", "logoutAt": null, "durationMinutes": 125, "status": "active" }
```

### Notification
```json
{ "id": "low-6", "type": "low_stock", "title": "Low stock", "message": "Satin Wine has 6 pics left.", "read": false, "createdAt": "..." }
```
`type` is `low_stock` or `sale` (anything else shows a generic bell icon). Generate them from live data, or store them; either is fine.

---

## 5. Endpoints

Permission key: **A** = admin only, **C** = cashier only, **Any** = any signed-in user.

### 5.1 Authentication

| Method and path | Who | Request | Response |
|---|---|---|---|
| `POST /auth/login` | public | `{ username, password }` | `200 { token, user }`. `401` wrong credentials. `403` account deactivated. Usernames are case-insensitive. Opens a shift for cashiers. |
| `POST /auth/logout` | Any | none | `204`. Closes the cashier's open shift. |
| `GET /auth/me` | Any | none | `200 User`. Called on every page refresh to restore the session. |
| `PUT /auth/password` | Any | `{ currentPassword, newPassword }` | `200 { message }`. `400` with `errors.currentPassword` if wrong. `422` with `errors.newPassword` if under 8 characters. |
| `PUT /auth/profile` | Any | `{ name, username, email, phone }` | `200 User`. `409` with `errors.username` if taken. |
| `POST /auth/avatar` | Any | multipart, field `avatar` (image, max 2 MB) | `200 { avatarUrl }` |

Hash passwords with bcrypt. Never return password fields.

### 5.2 Products

| Method and path | Who | Notes |
|---|---|---|
| `GET /products` | Any | Query below. Returns `{ data: [Product], pagination }`. |
| `GET /products/:id` | Any | `200 Product`, `404` if missing. |
| `POST /products` | A | Body: all Product fields except `id`, `archived`, timestamps. `201 Product`. `409` with `errors.code` for duplicate code. `422` with per-field `errors`. |
| `PUT /products/:id` | A | **Partial update**: only the sent fields change. `200 Product`. Also used to **restore**: body `{ "archived": false }`. Same errors as create. |
| `DELETE /products/:id` | A | **Soft delete**: set `archived = true`. `204`. Archived products disappear from the POS but stay in history. |

`GET /products` query parameters (all optional):

| Param | Meaning |
|---|---|
| `search` | Case-insensitive match on name **or** code |
| `category` | Exact match |
| `color` | Colour **name**, case-insensitive; matches if any of the product's colours has that name |
| `stockStatus` | `high`, `medium`, `low` or `out` (see 3.2) |
| `status` | `active` (default), `archived`, `all` |
| `sortBy` | `name` (default), `code`, `pricePerPic`, `stock` |
| `sortOrder` | `asc` (default) or `desc` |
| `page`, `limit` | See section 2 |

Create/update body example:
```json
{ "name": "Atamfa Turmi Premium", "code": "TUR-001", "category": "Turmi",
  "colors": [ { "name": "Royal Blue", "hex": "#2457C5" } ], "sizes": [],
  "pricePerPic": 18500, "costPrice": 14000, "stock": 42, "lowStockThreshold": 8,
  "materialType": "100% Cotton", "description": null }
```
Validation: name and code required; `colors` non-empty; `pricePerPic > 0`; `costPrice >= 0`; `stock` and `lowStockThreshold` whole numbers `>= 0`.

### 5.3 Sales

| Method and path | Who | Notes |
|---|---|---|
| `POST /sales` | C | Create a completed sale. See below. `201 Sale`. |
| `GET /sales` | Any | Filtered list. `{ data: [SaleSummary], pagination }`, newest first. Cashiers only ever see their own. |
| `GET /sales/:id` | Any | `200 Sale`. Cashier asking for another cashier's sale gets `404`. |
| `POST /sales/:id/refund` | Any | Body `{ reason }`. `200 Sale` (status now `refunded`). See rules in 3.5. `409` if already refunded. |

`POST /sales` body:
```json
{
  "items": [
    { "productId": 1, "color": { "name": "Gold", "hex": "#C9962B" }, "quantity": 3 },
    { "productId": 11, "color": { "name": "White", "hex": "#FFFFFF" }, "quantity": 2 }
  ],
  "discount": { "type": "percent", "value": 5 },
  "paymentMethod": "cash",
  "amountTendered": 60000
}
```
- `discount` is `null` when there is none. `type` is `percent` or `amount` (naira).
- `paymentMethod`: `cash`, `transfer` or `pos`.
- `amountTendered` is optional and only sent for cash.
- `color` must be one of the product's colours (422 otherwise) or `null` if the product has none.
- **Do not trust prices from the client.** The frontend sends none; use the product's current price.
- The same product may appear on several lines with different colours. Check stock against the **sum**.
- Errors: `403 VACATION_MODE`, `422 INSUFFICIENT_STOCK`, `422 DISCOUNT_TOO_HIGH`, `404 PRODUCT_UNAVAILABLE`.

`GET /sales` query parameters (all optional):

| Param | Meaning |
|---|---|
| `from`, `to` | `yyyy-mm-dd`, inclusive, shop timezone |
| `cashierId` | Admin only (ignored for cashiers) |
| `productId` | Sales containing that product |
| `status` | `completed`, `processing`, `refunded` |
| `paymentMethod` | `cash`, `transfer`, `pos` |
| `search` | Receipt number contains (case-insensitive) |
| `page`, `limit` | See section 2 |

### 5.4 Held (suspended) carts

A cashier can set an order aside while serving another customer. Scoped per cashier; each cashier sees only their own.

| Method and path | Who | Request and response |
|---|---|---|
| `GET /suspended-carts` | C | `200 { data: [HeldCart] }` |
| `POST /suspended-carts` | C | Body `{ items: [{ productId, color, quantity }], discount }` (same shapes as a sale). `201 HeldCart`. |
| `DELETE /suspended-carts/:id` | C | `204`. The frontend deletes the held cart when the cashier resumes it. |

`HeldCart`:
```json
{ "id": 7, "items": [ { "productId": 11, "name": "Cotton Plain White", "color": { "name": "White", "hex": "#FFFFFF" }, "quantity": 2 } ],
  "discount": null, "createdAt": "..." }
```
The server adds `name` to each item (join to the product) for display. Held carts **do not reserve stock**, and prices/stock are re-read from the product list when resumed.

### 5.5 Cashiers

| Method and path | Who | Request and response |
|---|---|---|
| `GET /cashiers` | A | `200 { data: [Cashier] }` (no pagination). |
| `POST /cashiers` | A | `{ name, username, password }` then `201 Cashier`. Role is forced to `cashier`. `409` with `errors.username` if taken. Password min 8 characters. |
| `PUT /cashiers/:id` | A | `{ name?, username?, active? }` then `200 Cashier`. `{ "active": true }` reactivates. |
| `DELETE /cashiers/:id` | A | Deactivate (`active = false`), close open shift, `204`. Sales history is kept. |
| `POST /cashiers/:id/reset-password` | A | `200 { tempPassword }`. Generate a random 10-character password, store its hash, return the plain text once. |

`Cashier` = User fields plus `createdAt` and:
```json
"stats": { "today": 56610, "week": 210400, "month": 980300, "overall": 4521000 }
```
`stats` values are `sum(total)` of that cashier's **completed** sales for today, the current week (Monday start), the current month, and all time.

### 5.6 Dashboard

`GET /dashboard` (A). One call powers the whole overview. Shape:
```json
{
  "stats": { "todaySales": 0, "grossProfit": 0, "transactions": 0, "lowStockCount": 0, "averageOrderValue": 0 },
  "weeklyTrend":  [ { "date": "2026-10-21", "pics": 34, "revenue": 410000 } ],
  "monthlyTrend": [ { "month": "2026-05", "revenue": 3100000, "profit": 980000 } ],
  "profitSummary": { "revenue": 0, "costOfGoods": 0, "grossProfit": 0, "marginPercent": 0 },
  "recentSales": [ SaleSummary ],
  "bestSellers": [ { "productId": 1, "name": "...", "code": "...", "picsSold": 40, "revenue": 740000, "colors": [Colour] } ],
  "lowStock":    [ { "id": 6, "name": "...", "code": "...", "stock": 6, "lowStockThreshold": 8, "colors": [Colour] } ],
  "activityFeed": [ { "id": "s501", "type": "sale", "message": "Aisha Bello sold RCP-000501 (₦56,610)", "createdAt": "..." } ],
  "cashierActivity": [ Shift ]
}
```
- `stats` and `profitSummary` are for **today**. `weeklyTrend` is exactly the **last 7 days ending today** (oldest first, include days with zero). `monthlyTrend` is the **last 6 calendar months** (oldest first, include zero months). Trend `revenue` follows the `revenue` definition in 3.4 (tax excluded).
- `recentSales`: the 5 latest sales of any status. `bestSellers`: top 5 by pics sold over the last 30 days. `lowStock`: up to 6 active products with `stock <= lowStockThreshold`, lowest first. `lowStockCount` counts **all** such products.
- `activityFeed`: latest 8 events. `type` is one of `sale`, `refund`, `login`, `logout`, `stock`; newest first.
- `cashierActivity`: the 5 most recent shifts.

### 5.7 Reports (all admin only)

Period reports share one response shape:
```json
{
  "period": { "from": "2026-10-01T00:00:00.000Z", "to": "2026-10-31T23:59:59.999Z" },
  "summary": { "revenue": 0, "costOfGoods": 0, "grossProfit": 0, "marginPercent": 0,
               "transactions": 0, "picsSold": 0, "averageOrderValue": 0 },
  "breakdown": [ { "key": "2026-10-27", "label": "Tue, 27 Oct", "revenue": 0, "profit": 0, "transactions": 0, "pics": 0 } ]
}
```
`breakdown` is sorted ascending, `label` is display text (the frontend shows it as is), `profit` = bucket `grossProfit`. Include only buckets that have sales (or zero buckets, either is fine).

| Endpoint | Params | Breakdown buckets |
|---|---|---|
| `GET /reports/daily` | `date` (default today) | Hourly (`9 AM`, `10 AM`, ...) |
| `GET /reports/weekly` | `date` (any day in the week; default today) | Daily, Monday to Sunday |
| `GET /reports/monthly` | `month` as `yyyy-mm` (default this month) | Daily |
| `GET /reports/custom` | `from`, `to` (required) | Daily if range is 62 days or less, otherwise monthly |

Other reports:

| Endpoint | Params | Response |
|---|---|---|
| `GET /reports/bestsellers` | `from`, `to`, `limit` (default 10) | `{ data: [{ productId, name, code, picsSold, revenue, profit, colors }] }` sorted by `picsSold` desc. Here `revenue` = sum of `lineTotal` (before discount and tax) and `profit` = `lineTotal - quantity * unitCost`. |
| `GET /reports/slowmovers` | `days` (default 30), `limit` (default 50) | `{ data: [{ productId, name, code, stock, picsSold, lastSoldAt, colors }] }`. Active products with `stock > 0` that sold **zero** pics in the last `days` days. `lastSoldAt` is the last sale ever (or `null`). Sort by `stock` desc. |
| `GET /reports/lowstock` | none | `{ data: [Product] }` active products with `stock <= lowStockThreshold`, lowest first |
| `GET /reports/inventory` | none | `{ data: [Product], totals: { itemCount, totalPics, stockValueCost, stockValueRetail } }` for active products. Stock values are `sum(stock * costPrice)` and `sum(stock * pricePerPic)`. |
| `GET /reports/activity` | `from`, `to`, `cashierId`, `page`, `limit` | `{ data: [Shift], pagination }`, newest first. Filter on `loginAt`. |

**Exports.** "Export Excel" downloads a CSV generated in the browser from the data above, and "Print / Save PDF" uses the browser print dialog. No server-side export endpoints are needed. (If you later want server-generated `.xlsx`/PDF, add them as separate endpoints; the frontend does not call any.)

### 5.8 Settings

| Method and path | Who | Notes |
|---|---|---|
| `GET /settings` | Any | `200 Settings`. Cashiers need it for tax rate, max discount, vacation banner and receipt text. |
| `PUT /settings` | A | **Partial update** (`{ "vacationMode": true }` alone is valid). `200 Settings` (the full updated object). `422` with `errors` if `taxRate` or `maxDiscountPercent` is outside 0 to 100. Ignore `shopLogoUrl` in this body. |
| `POST /settings/logo` | A | multipart, field `logo` (image, max 2 MB). `200 { shopLogoUrl }`. |

### 5.9 Notifications (admin)

| Method and path | Who | Notes |
|---|---|---|
| `GET /notifications` | A | `200 { data: [Notification] }` newest first. Low-stock alerts plus the latest few sales. Keep it to about the last 20. |
| `POST /notifications/read-all` | A | `204`. Marks everything read for this user. |

---

## 6. Suggested SQLite tables

Matches the original spec. Types are suggestions.

| Table | Key columns |
|---|---|
| `users` | id, name, username (unique, lowercase), password_hash, role (`admin`/`cashier`), email, phone, avatar_url, active, created_at |
| `products` | id, name, code (unique nocase), category, **colors (JSON text: `[{name,hex}]`)**, sizes (JSON text), price_per_pic, cost_price, stock, low_stock_threshold, material_type, description, archived, created_at, updated_at |
| `sales` | id, receipt_number (unique), cashier_id, subtotal, discount, tax, tax_rate, total, payment_method, amount_tendered, status, created_at, refunded_at, refund_reason, refunded_by |
| `sale_items` | id, sale_id, product_id, name, code, **color_name, color_hex**, quantity, unit_price, **unit_cost**, line_total |
| `suspended_carts` | id, cashier_id, items (JSON text), discount (JSON text), created_at |
| `settings` | single row: shop_name, shop_address, shop_phone, shop_logo_url, tax_rate, max_discount_percent, low_stock_threshold, receipt_footer, vacation_mode |
| `activity_logs` | id, cashier_id, login_at, logout_at (a row per shift) |
| `notifications` (optional) | id, type, title, message, created_at, plus a per-user read marker |

Tips: use `better-sqlite3` transactions for sale creation and refunds; index `sales(created_at)`, `sales(cashier_id, created_at)`, `sale_items(product_id)`, `products(code)`.

---

## 7. Seed data for development

Please seed at least:
- `admin` / `admin123` (role admin), with a note that the password must be changed on first use.
- Two cashiers (for example `aisha`, `yusuf`).
- About 10 products across the six categories, each with 1 to 3 colours, a couple of them below their low-stock threshold.
- Default settings: tax 2 %, max discount 10 %, low-stock 5.

The seed in `src/mocks/mockAdapter.js` (function `seed()`) is a good template.

---

## 8. Connecting the frontend to your API

1. `cp .env.example .env.local` and set:
   ```
   VITE_USE_MOCK=false
   VITE_PROXY_TARGET=http://localhost:5000     # where your API runs in development
   VITE_API_BASE_URL=/api                      # keep as is when proxied
   ```
2. `npm install && npm run dev`. The dev server proxies `/api` and `/uploads` to your API, so no CORS setup is needed in development.
3. Work through the screens in this order; each unlocks the next: login, products, POS sale, sales list and receipt, dashboard, cashiers, reports, settings.
4. To compare behaviour at any point, run the app with `VITE_USE_MOCK=true` (default for `npm run dev`; admin `admin`/`admin123`, cashier `aisha`/`cashier123`).

`npm test` runs a smoke test of both roles against the mock API. It is a good model for the user journeys your API must support.

---

## 9. Production notes

- **Same origin (recommended).** Serve the built frontend (`dist/`) and proxy `/api` and `/uploads` to the API, so there is no CORS. A sample nginx block is in the README.
- **Different origins.** Build with `VITE_API_BASE_URL=https://api.example.com/api` and `VITE_ASSET_BASE_URL=https://api.example.com`. The API must allow: the frontend origin, methods `GET, POST, PUT, DELETE, OPTIONS`, headers `Authorization, Content-Type`.
- **Security checklist.** Rate-limit `/auth/login`; hash passwords with bcrypt; validate and size-limit uploads (images only, 2 MB); never trust client-supplied prices or totals; enforce roles on the server for every endpoint above.
- **Do not rely on the frontend for rules.** Hiding a button is not security; section 3 and the permission column in section 5 must be enforced server-side.

---

## 10. Decisions to confirm with the shop owner

These reflect reasonable defaults in the frontend. Tell the frontend developer if any should change.

1. Cashiers may refund (mark as not paid) **their own sales from the same day**; older refunds are admin only.
2. Stock is **per product**, not per colour. If the shop needs per-colour stock, `products.colors` would need a `stock` per colour and the sale and stock rules in 3.2 change.
3. Held carts do not reserve stock.
4. Report exports are generated in the browser (CSV and print to PDF), not by the server.
5. Revenue and profit **exclude tax**; the dashboard "Today's sales" figure **includes tax**.
