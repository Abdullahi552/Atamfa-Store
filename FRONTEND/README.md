# Atamfa POS & Inventory: Frontend

React 18 + Vite + Tailwind CSS frontend for a Hausa Atamfa fabric shop. Sells fabric **by the pic**, with **cloth colour** (no photos) identifying each material. Two roles: **Admin** (overview, products, sales, cashiers, reports, settings) and **Cashier** (POS terminal, own sales).

> Backend developer? Start with **[docs/BACKEND_API_CONTRACT.md](docs/BACKEND_API_CONTRACT.md)**.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173, runs on the built-in mock API (no backend needed)
```

Demo logins (mock mode only): admin `admin` / `admin123`, cashier `aisha` / `cashier123`.

## Connect to the real backend

```bash
cp .env.example .env.local
# edit .env.local:
#   VITE_USE_MOCK=false
#   VITE_PROXY_TARGET=http://localhost:5000
npm run dev
```

| Variable | Default | Meaning |
|---|---|---|
| `VITE_USE_MOCK` | `true` in dev, `false` in production build | Use the in-memory mock API |
| `VITE_API_BASE_URL` | `/api` | API base path or full URL |
| `VITE_ASSET_BASE_URL` | empty | Prefix for uploaded-file paths returned by the API |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Dev server proxy target for `/api` and `/uploads` |
| `VITE_APP_NAME` | `Atamfa POS` | Shown on the login screen |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build to `dist/` (mock API is stripped out) |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Smoke test: admin and cashier journeys against the mock API |

## Production deployment

Build with `npm run build` and serve `dist/` as a single-page app (every path falls back to `index.html`).

**nginx (same origin, no CORS):**
```nginx
server {
  listen 80;
  root /var/www/atamfa/dist;
  location / { try_files $uri /index.html; }
  location /api/     { proxy_pass http://127.0.0.1:5000; }
  location /uploads/ { proxy_pass http://127.0.0.1:5000; }
}
```
**Vercel / Netlify:** `vercel.json` and `public/_redirects` are included for the SPA fallback. Set `VITE_API_BASE_URL` (and `VITE_ASSET_BASE_URL`) to your API's full URL and enable CORS on the API.

## Project structure

```
src/
  config/env.js          environment values
  lib/                   http client (axios), formatters, constants, csv export
  services/              one small file per API area (the only place URLs live)
  context/               Auth, Cart, Settings, Theme, Toast providers
  hooks/                 useAsync, useDebounce, useClickOutside
  components/
    ui/                  Button, Field, Modal, Badge, Pagination, ...
    common/              FabricTile/Swatch, ColorPicker, Avatar, ProfileModal, NotificationBell
    layout/              AppShell (greeting + pill navigation), Admin/Cashier layouts
    charts/              Chart.js wrappers that follow the light/dark theme
    pos/                 ProductCard, CartPanel, Keypad, HeldCartsModal, RecentOrders
    sales/               Receipt (printable), SaleModal, SalesTable
  pages/                 Login, admin/*, cashier/*
  mocks/mockAdapter.js   in-memory fake API (also a reference implementation)
tests/smoke.test.jsx
docs/BACKEND_API_CONTRACT.md
```

## How it behaves (highlights)

- **Colour instead of photos.** Admin picks cloth colours from a 25-colour palette or adds a custom named colour. Products show as woven colour tiles; cashiers choose the colour when a material has more than one.
- **Session.** JWT in `localStorage`; restored via `GET /auth/me`; any 401 signs the user out.
- **POS.** Search or scan a barcode (type the product code + Enter), numeric keypad sets the quantity of the selected line, discount in % or ₦ (capped by the shop maximum), tax from settings, Cash / Transfer / POS, Hold and Resume, Paid, printable receipt.
- **Light and dark mode**, responsive down to phones, keyboard accessible, reduced-motion friendly.
- **Code splitting** per route; charts and React are separate cached chunks.

## Customising

- Categories, material types, sizes and the colour palette: `src/lib/constants.js`.
- Brand colours and fonts: CSS variables at the top of `src/index.css` and `tailwind.config.js`.

## Known limits

- The POS loads up to 500 active products at once and filters them in the browser. For a bigger catalogue, switch the POS search to the server's `search` parameter.
- Mock data lives in memory and resets on page reload.
