/**
 * In-memory fake backend used when VITE_USE_MOCK=true (demo / UI development).
 * It implements the same contract as docs/BACKEND_API_CONTRACT.md, so it also doubles as a
 * runnable reference for the backend developer. Data resets on page reload.
 */
import { AxiosError } from 'axios';
import { FABRIC_COLORS } from '@/lib/constants';

/* ------------------------------ helpers ------------------------------ */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, '0');
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sum = (list, fn) => list.reduce((a, x) => a + fn(x), 0);
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const inRange = (iso, from, to) => { const t = new Date(iso).getTime(); return t >= from.getTime() && t <= to.getTime(); };
const mondayOf = (d) => { const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

class HttpErr extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}
const fieldErr = (status, message, errors) => new HttpErr(status, message, { errors });

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const rnd = mulberry32(20261027);
const pickOne = (a) => a[Math.floor(rnd() * a.length)];
const rint = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const col = (name) => FABRIC_COLORS.find((c) => c.name === name);

/* -------------------------------- seed -------------------------------- */
const now = new Date();
const atDay = (back, h, m) => { const d = addDays(now, -back); d.setHours(h, m, 0, 0); return d; };

function buildTotals(lines, discount, settings) {
  const subtotal = r2(sum(lines, (l) => l.unitPrice * l.quantity));
  const max = r2((subtotal * settings.maxDiscountPercent) / 100);
  const raw = !discount ? 0 : discount.type === 'percent' ? (subtotal * discount.value) / 100 : discount.value;
  const disc = r2(Math.min(raw, max, subtotal));
  const taxable = r2(subtotal - disc);
  const tax = r2((taxable * settings.taxRate) / 100);
  return { subtotal, discount: disc, tax, taxRate: settings.taxRate, total: r2(taxable + tax) };
}

function seed() {
  const iso = (d) => d.toISOString();
  const db = {
    seq: { user: 4, product: 13, sale: 0, shift: 0, held: 0 },
    read: new Set(),
    users: [
      { id: 1, name: 'Alhaji Musa Danladi', username: 'admin', password: 'admin123', role: 'admin', email: 'owner@atamfa.shop', phone: '0803 000 0000', active: true, avatarUrl: null, createdAt: iso(atDay(300, 9, 0)) },
      { id: 2, name: 'Aisha Bello', username: 'aisha', password: 'cashier123', role: 'cashier', active: true, avatarUrl: null, createdAt: iso(atDay(200, 9, 0)) },
      { id: 3, name: 'Yusuf Garba', username: 'yusuf', password: 'cashier123', role: 'cashier', active: true, avatarUrl: null, createdAt: iso(atDay(120, 9, 0)) },
    ],
    settings: {
      shopName: 'Danladi Atamfa House', shopAddress: 'Kantin Kwari Market, Kano', shopPhone: '0803 000 0000', shopLogoUrl: null,
      taxRate: 2, maxDiscountPercent: 10, lowStockThreshold: 5, receiptFooter: 'Thank you for your patronage. No refund after 7 days.', vacationMode: false,
    },
    products: [], sales: [], held: [], shifts: [],
  };

  const P = (id, name, code, category, colors, price, cost, stock, threshold, materialType) => ({
    id, name, code, category, colors: colors.map(col), sizes: [], pricePerPic: price, costPrice: cost, stock, lowStockThreshold: threshold,
    materialType, description: null, archived: false, createdAt: iso(atDay(250, 10, 0)), updatedAt: iso(atDay(5, 10, 0)),
  });
  db.products = [
    P(1, 'Atamfa Turmi Premium', 'TUR-001', 'Turmi', ['Royal Blue', 'Gold'], 18500, 14000, 42, 8, '100% Cotton'),
    P(2, 'Turmi Classic Red', 'TUR-002', 'Turmi', ['Red', 'Gold'], 16000, 12000, 30, 8, '100% Cotton'),
    P(3, 'Ankara Wax Print Floral', 'ANK-001', 'Ankara', ['Orange', 'Teal', 'Yellow'], 9500, 6800, 60, 10, '100% Cotton'),
    P(4, 'Ankara Super Wax', 'ANK-002', 'Ankara', ['Purple', 'Pink'], 12000, 8800, 24, 6, '100% Cotton'),
    P(5, 'Satin Silk Emerald', 'SAT-001', 'Satin', ['Emerald'], 14500, 10500, 18, 5, 'Silk'),
    P(6, 'Satin Wine', 'SAT-002', 'Satin', ['Wine'], 14500, 10500, 6, 8, 'Silk'),
    P(7, 'Velvet Black', 'VEL-001', 'Velvet', ['Black'], 22000, 16500, 12, 4, 'Polyester'),
    P(8, 'Velvet Maroon & Gold', 'VEL-002', 'Velvet', ['Maroon', 'Gold'], 24000, 18000, 4, 5, 'Polyester'),
    P(9, 'French Lace Cream', 'LAC-001', 'Lace', ['Cream', 'White'], 35000, 27000, 15, 4, 'Nylon'),
    P(10, 'Swiss Lace Sky', 'LAC-002', 'Lace', ['Sky Blue'], 42000, 33000, 9, 3, 'Nylon'),
    P(11, 'Cotton Plain White', 'COT-001', 'Cotton', ['White'], 6500, 4500, 80, 15, '100% Cotton'),
    P(12, 'Cotton Indigo Dye', 'COT-002', 'Cotton', ['Indigo'], 8000, 5600, 3, 6, '100% Cotton'),
  ];

  // ~45 days of history
  const tmp = [];
  for (let d = 44; d >= 0; d--) {
    const n = d === 0 ? 5 : rint(2, 7);
    for (let k = 0; k < n; k++) {
      let when;
      if (d === 0) {
        const since = now.getHours() * 60 + now.getMinutes();
        if (since < 3) continue;
        when = new Date(now.getTime() - rint(1, since - 1) * 60000);
      } else when = atDay(d, rint(9, 17), rint(0, 59));
      const pool = db.products.filter((p) => !(p.id === 10 && d < 38) && !(p.id === 8 && d < 20));
      const used = new Set();
      const lines = [];
      for (let i = 0; i < rint(1, 3); i++) {
        const p = pickOne(pool);
        if (used.has(p.id)) continue;
        used.add(p.id);
        lines.push({ productId: p.id, name: p.name, code: p.code, color: pickOne(p.colors), quantity: rint(1, 6), unitPrice: p.pricePerPic, unitCost: p.costPrice });
      }
      const discount = rnd() < 0.2 ? { type: 'percent', value: 5 } : null;
      const refunded = rnd() < 0.04;
      tmp.push({ when, lines, discount, refunded, cashierId: pickOne([2, 3]), method: pickOne(['cash', 'cash', 'transfer', 'pos']) });
    }
  }
  tmp.sort((a, b) => a.when - b.when).forEach((t) => {
    const totals = buildTotals(t.lines, t.discount, db.settings);
    const id = ++db.seq.sale;
    db.sales.push({
      id, receiptNumber: `RCP-${String(id).padStart(6, '0')}`, cashierId: t.cashierId, items: t.lines.map((l) => ({ ...l, lineTotal: r2(l.unitPrice * l.quantity) })),
      ...totals, paymentMethod: t.method, amountTendered: null, status: t.refunded ? 'refunded' : 'completed', createdAt: iso(t.when),
      refundedAt: t.refunded ? iso(new Date(t.when.getTime() + 3600000)) : null, refundReason: t.refunded ? 'Customer did not pay' : null,
    });
  });

  // shifts (cashier login/logout)
  for (let d = 14; d >= 1; d--) {
    [2, 3].forEach((cid) => {
      db.shifts.push({ id: ++db.seq.shift, cashierId: cid, loginAt: iso(atDay(d, 8, rint(0, 50))), logoutAt: iso(atDay(d, rint(17, 19), rint(0, 59))) });
    });
  }
  db.shifts.push({ id: ++db.seq.shift, cashierId: 2, loginAt: iso(new Date(Math.min(atDay(0, 8, 15).getTime(), now.getTime() - 40 * 60000))), logoutAt: null });
  return db;
}

const db = seed();

/* ------------------------- shared calculations ------------------------- */
const userById = (id) => db.users.find((u) => u.id === Number(id));
const publicUser = (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role, email: u.email || null, phone: u.phone || null, avatarUrl: u.avatarUrl || null, active: u.active });
const cashierRef = (id) => ({ id, name: userById(id)?.name || 'Unknown' });
const colorsOf = (pid) => db.products.find((p) => p.id === pid)?.colors || [];

const fullSale = (s) => ({
  id: s.id, receiptNumber: s.receiptNumber, cashier: cashierRef(s.cashierId),
  items: s.items.map(({ unitCost, ...rest }) => rest),
  subtotal: s.subtotal, discount: s.discount, tax: s.tax, taxRate: s.taxRate, total: s.total, paymentMethod: s.paymentMethod,
  amountTendered: s.amountTendered, status: s.status, createdAt: s.createdAt, refundedAt: s.refundedAt, refundReason: s.refundReason,
});
const saleRow = (s) => ({ id: s.id, receiptNumber: s.receiptNumber, createdAt: s.createdAt, cashier: cashierRef(s.cashierId), itemsCount: sum(s.items, (i) => i.quantity), paymentMethod: s.paymentMethod, total: s.total, status: s.status });

function finance(list) {
  const c = list.filter((s) => s.status === 'completed');
  const revenue = sum(c, (s) => s.subtotal - s.discount);
  const cogs = sum(c, (s) => sum(s.items, (i) => i.quantity * i.unitCost));
  const profit = revenue - cogs;
  return {
    revenue: r2(revenue), costOfGoods: r2(cogs), grossProfit: r2(profit), marginPercent: revenue ? Math.round((profit / revenue) * 1000) / 10 : 0,
    transactions: c.length, picsSold: sum(c, (s) => sum(s.items, (i) => i.quantity)), averageOrderValue: c.length ? r2(sum(c, (s) => s.total) / c.length) : 0, collected: r2(sum(c, (s) => s.total)),
  };
}
const salesBetween = (from, to) => db.sales.filter((s) => inRange(s.createdAt, from, to));
const lowStockList = () => db.products.filter((p) => !p.archived && p.stock <= p.lowStockThreshold).sort((a, b) => a.stock - b.stock);
const stockLevel = (p) => (p.stock <= 0 ? 'out' : p.stock <= p.lowStockThreshold ? 'low' : p.stock <= p.lowStockThreshold * 3 ? 'medium' : 'high');
const paginate = (arr, page = 1, limit = 20) => {
  page = Math.max(1, Number(page) || 1); limit = Math.min(500, Math.max(1, Number(limit) || 20));
  return { data: arr.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: arr.length, totalPages: Math.max(1, Math.ceil(arr.length / limit)) } };
};
const shiftRow = (s) => {
  const end = s.logoutAt ? new Date(s.logoutAt) : new Date();
  return { id: s.id, cashier: cashierRef(s.cashierId), loginAt: s.loginAt, logoutAt: s.logoutAt, durationMinutes: Math.round((end - new Date(s.loginAt)) / 60000), status: s.logoutAt ? 'completed' : 'active' };
};
const closeShift = (uid) => { const s = db.shifts.find((x) => x.cashierId === uid && !x.logoutAt); if (s) s.logoutAt = new Date().toISOString(); };
const cashierStats = (id) => {
  const mine = db.sales.filter((s) => s.cashierId === id && s.status === 'completed');
  const total = (from) => r2(sum(mine.filter((s) => new Date(s.createdAt) >= from), (s) => s.total));
  return { today: total(startOfDay(now)), week: total(mondayOf(now)), month: total(new Date(now.getFullYear(), now.getMonth(), 1)), overall: r2(sum(mine, (s) => s.total)) };
};
const tempPassword = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join(''); };

/* ------------------------------- routes ------------------------------- */
const routes = [];
const on = (method, pattern, handler, { auth = true, roles } = {}) =>
  routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler, auth, roles });
const ok = (data, status = 200) => ({ data, status });

// ---- auth
on('POST', '/auth/login', ({ body }) => {
  const u = db.users.find((x) => x.username === String(body.username || '').trim().toLowerCase() && x.password === body.password);
  if (!u) throw new HttpErr(401, 'Invalid username or password.');
  if (!u.active) throw new HttpErr(403, 'This account has been deactivated. Contact the owner.');
  if (u.role === 'cashier' && !db.shifts.some((s) => s.cashierId === u.id && !s.logoutAt)) db.shifts.push({ id: ++db.seq.shift, cashierId: u.id, loginAt: new Date().toISOString(), logoutAt: null });
  return ok({ token: `mock.${u.id}`, user: publicUser(u) });
}, { auth: false });
on('POST', '/auth/logout', ({ user }) => { closeShift(user.id); return ok(null, 204); });
on('GET', '/auth/me', ({ user }) => ok(publicUser(user)));
on('PUT', '/auth/password', ({ body, user }) => {
  if (body.currentPassword !== user.password) throw fieldErr(400, 'Current password is incorrect.', { currentPassword: 'Current password is incorrect.' });
  if (!body.newPassword || body.newPassword.length < 8) throw fieldErr(422, 'Password is too short.', { newPassword: 'Use at least 8 characters.' });
  user.password = body.newPassword;
  return ok({ message: 'Password changed.' });
});
on('PUT', '/auth/profile', ({ body, user }) => {
  const username = String(body.username || user.username).trim().toLowerCase();
  if (db.users.some((u) => u.id !== user.id && u.username === username)) throw fieldErr(409, 'Username already taken.', { username: 'Username already taken.' });
  Object.assign(user, { name: body.name ?? user.name, username, email: body.email || null, phone: body.phone || null });
  return ok(publicUser(user));
});
on('POST', '/auth/avatar', ({ body, user }) => { user.avatarUrl = URL.createObjectURL(body.get('avatar')); return ok({ avatarUrl: user.avatarUrl }); });

// ---- products
const productCodeTaken = (code, exceptId) => db.products.some((p) => p.id !== exceptId && p.code.toLowerCase() === String(code).toLowerCase());
function validateProduct(b, partial = false) {
  const e = {};
  const has = (k) => !partial || k in b;
  if (has('name') && !String(b.name || '').trim()) e.name = 'Name is required.';
  if (has('code') && !String(b.code || '').trim()) e.code = 'Code is required.';
  if (has('colors') && (!Array.isArray(b.colors) || !b.colors.length)) e.colors = 'Choose at least one colour.';
  if (has('pricePerPic') && !(Number(b.pricePerPic) > 0)) e.pricePerPic = 'Price must be above 0.';
  if (has('costPrice') && !(Number(b.costPrice) >= 0)) e.costPrice = 'Cost must be 0 or more.';
  if (has('stock') && !(Number.isInteger(b.stock) && b.stock >= 0)) e.stock = 'Stock must be a whole number, 0 or more.';
  if (Object.keys(e).length) throw fieldErr(422, 'Please fix the highlighted fields.', e);
}
on('GET', '/products', ({ params: q }) => {
  let list = [...db.products];
  const status = q.status || 'active';
  if (status === 'active') list = list.filter((p) => !p.archived);
  if (status === 'archived') list = list.filter((p) => p.archived);
  if (q.search) { const s = String(q.search).toLowerCase(); list = list.filter((p) => p.name.toLowerCase().includes(s) || p.code.toLowerCase().includes(s)); }
  if (q.category) list = list.filter((p) => p.category === q.category);
  if (q.color) list = list.filter((p) => p.colors.some((c) => c.name.toLowerCase() === String(q.color).toLowerCase()));
  if (q.stockStatus) list = list.filter((p) => stockLevel(p) === q.stockStatus);
  const key = ['name', 'code', 'pricePerPic', 'stock'].includes(q.sortBy) ? q.sortBy : 'name';
  const dir = q.sortOrder === 'desc' ? -1 : 1;
  list.sort((a, b) => (typeof a[key] === 'string' ? a[key].localeCompare(b[key]) : a[key] - b[key]) * dir);
  return ok(paginate(list, q.page, q.limit));
});
on('GET', '/products/:id', ({ groups }) => {
  const p = db.products.find((x) => x.id === Number(groups.id));
  if (!p) throw new HttpErr(404, 'Material not found.');
  return ok(p);
});
on('POST', '/products', ({ body }) => {
  validateProduct(body);
  if (productCodeTaken(body.code)) throw fieldErr(409, 'That code is already used.', { code: 'That code is already used.' });
  const t = new Date().toISOString();
  const p = { id: db.seq.product++, sizes: [], materialType: null, description: null, lowStockThreshold: db.settings.lowStockThreshold, ...body, archived: false, createdAt: t, updatedAt: t };
  db.products.push(p);
  return ok(p, 201);
}, { roles: ['admin'] });
on('PUT', '/products/:id', ({ body, groups }) => {
  const p = db.products.find((x) => x.id === Number(groups.id));
  if (!p) throw new HttpErr(404, 'Material not found.');
  validateProduct(body, true);
  if ('code' in body && productCodeTaken(body.code, p.id)) throw fieldErr(409, 'That code is already used.', { code: 'That code is already used.' });
  Object.assign(p, body, { updatedAt: new Date().toISOString() });
  return ok(p);
}, { roles: ['admin'] });
on('DELETE', '/products/:id', ({ groups }) => {
  const p = db.products.find((x) => x.id === Number(groups.id));
  if (!p) throw new HttpErr(404, 'Material not found.');
  p.archived = true;
  return ok(null, 204);
}, { roles: ['admin'] });

// ---- cashiers
const cashierOut = (u) => ({ ...publicUser(u), createdAt: u.createdAt, stats: cashierStats(u.id) });
on('GET', '/cashiers', () => ok({ data: db.users.filter((u) => u.role === 'cashier').map(cashierOut) }), { roles: ['admin'] });
on('POST', '/cashiers', ({ body }) => {
  const username = String(body.username || '').trim().toLowerCase();
  if (!String(body.name || '').trim()) throw fieldErr(422, 'Name is required.', { name: 'Name is required.' });
  if (db.users.some((u) => u.username === username)) throw fieldErr(409, 'That username is taken.', { username: 'That username is taken.' });
  if (!body.password || body.password.length < 8) throw fieldErr(422, 'Password too short.', { password: 'At least 8 characters.' });
  const u = { id: db.seq.user++, name: body.name.trim(), username, password: body.password, role: 'cashier', active: true, avatarUrl: null, createdAt: new Date().toISOString() };
  db.users.push(u);
  return ok(cashierOut(u), 201);
}, { roles: ['admin'] });
on('PUT', '/cashiers/:id', ({ body, groups }) => {
  const u = userById(groups.id);
  if (!u || u.role !== 'cashier') throw new HttpErr(404, 'Cashier not found.');
  if (body.username) {
    const username = body.username.trim().toLowerCase();
    if (db.users.some((x) => x.id !== u.id && x.username === username)) throw fieldErr(409, 'That username is taken.', { username: 'That username is taken.' });
    u.username = username;
  }
  if (body.name) u.name = body.name.trim();
  if (typeof body.active === 'boolean') u.active = body.active;
  return ok(cashierOut(u));
}, { roles: ['admin'] });
on('DELETE', '/cashiers/:id', ({ groups }) => {
  const u = userById(groups.id);
  if (!u || u.role !== 'cashier') throw new HttpErr(404, 'Cashier not found.');
  u.active = false; closeShift(u.id);
  return ok(null, 204);
}, { roles: ['admin'] });
on('POST', '/cashiers/:id/reset-password', ({ groups }) => {
  const u = userById(groups.id);
  if (!u || u.role !== 'cashier') throw new HttpErr(404, 'Cashier not found.');
  u.password = tempPassword();
  return ok({ tempPassword: u.password });
}, { roles: ['admin'] });

// ---- sales
function resolveLines(items) {
  if (!Array.isArray(items) || !items.length) throw new HttpErr(422, 'Add at least one item.');
  const lines = items.map((it) => {
    const p = db.products.find((x) => x.id === Number(it.productId));
    if (!p || p.archived) throw new HttpErr(404, 'One of the materials is no longer available.', { code: 'PRODUCT_UNAVAILABLE' });
    if (!Number.isInteger(it.quantity) || it.quantity < 1) throw new HttpErr(422, 'Quantity must be a whole number of 1 or more.');
    if (it.color && !p.colors.some((c) => c.hex.toLowerCase() === it.color.hex.toLowerCase())) throw new HttpErr(422, `${p.name} does not come in that colour.`);
    return { p, line: { productId: p.id, name: p.name, code: p.code, color: it.color || null, quantity: it.quantity, unitPrice: p.pricePerPic, unitCost: p.costPrice } };
  });
  const per = new Map();
  lines.forEach(({ p, line }) => per.set(p.id, (per.get(p.id) || 0) + line.quantity));
  per.forEach((qty, id) => {
    const p = db.products.find((x) => x.id === id);
    if (qty > p.stock) throw new HttpErr(422, `Only ${p.stock} pic${p.stock === 1 ? '' : 's'} of ${p.name} left.`, { code: 'INSUFFICIENT_STOCK', details: { productId: id, available: p.stock } });
  });
  return lines.map((l) => l.line);
}
on('POST', '/sales', ({ body, user }) => {
  if (db.settings.vacationMode) throw new HttpErr(403, 'Sales are paused (vacation mode).', { code: 'VACATION_MODE' });
  const lines = resolveLines(body.items);
  const totals = buildTotals(lines, body.discount, db.settings);
  if (body.discount) {
    const sub = sum(lines, (l) => l.unitPrice * l.quantity);
    const asAmount = body.discount.type === 'percent' ? (sub * body.discount.value) / 100 : body.discount.value;
    if (asAmount > (sub * db.settings.maxDiscountPercent) / 100 + 0.01) throw new HttpErr(422, `Discount cannot exceed ${db.settings.maxDiscountPercent}% of the subtotal.`, { code: 'DISCOUNT_TOO_HIGH' });
  }
  if (!['cash', 'transfer', 'pos'].includes(body.paymentMethod)) throw new HttpErr(422, 'Choose a payment method.');
  lines.forEach((l) => { db.products.find((p) => p.id === l.productId).stock -= l.quantity; });
  const id = ++db.seq.sale;
  const sale = {
    id, receiptNumber: `RCP-${String(id).padStart(6, '0')}`, cashierId: user.id, items: lines.map((l) => ({ ...l, lineTotal: r2(l.unitPrice * l.quantity) })),
    ...totals, paymentMethod: body.paymentMethod, amountTendered: body.amountTendered ?? null, status: 'completed', createdAt: new Date().toISOString(), refundedAt: null, refundReason: null,
  };
  db.sales.push(sale);
  return ok(fullSale(sale), 201);
}, { roles: ['cashier'] });
on('GET', '/sales', ({ params: q, user }) => {
  let list = [...db.sales];
  if (user.role === 'cashier') list = list.filter((s) => s.cashierId === user.id);
  else if (q.cashierId) list = list.filter((s) => s.cashierId === Number(q.cashierId));
  if (q.from) list = list.filter((s) => new Date(s.createdAt) >= startOfDay(parseDay(q.from)));
  if (q.to) list = list.filter((s) => new Date(s.createdAt) <= endOfDay(parseDay(q.to)));
  if (q.productId) list = list.filter((s) => s.items.some((i) => i.productId === Number(q.productId)));
  if (q.status) list = list.filter((s) => s.status === q.status);
  if (q.paymentMethod) list = list.filter((s) => s.paymentMethod === q.paymentMethod);
  if (q.search) list = list.filter((s) => s.receiptNumber.toLowerCase().includes(String(q.search).toLowerCase()));
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const res = paginate(list, q.page, q.limit);
  return ok({ ...res, data: res.data.map(saleRow) });
});
const findSale = (id, user) => {
  const s = db.sales.find((x) => x.id === Number(id));
  if (!s || (user.role === 'cashier' && s.cashierId !== user.id)) throw new HttpErr(404, 'Sale not found.');
  return s;
};
on('GET', '/sales/:id', ({ groups, user }) => ok(fullSale(findSale(groups.id, user))));
on('POST', '/sales/:id/refund', ({ groups, body, user }) => {
  const s = findSale(groups.id, user);
  if (s.status !== 'completed') throw new HttpErr(409, 'This sale is already refunded.');
  if (user.role === 'cashier' && dayKey(new Date(s.createdAt)) !== dayKey(new Date())) throw new HttpErr(403, 'Cashiers can only refund their own sales from today.');
  if (!body.reason || body.reason.trim().length < 3) throw fieldErr(422, 'A reason is required.', { reason: 'A reason is required.' });
  s.items.forEach((i) => { const p = db.products.find((x) => x.id === i.productId); if (p) p.stock += i.quantity; });
  Object.assign(s, { status: 'refunded', refundedAt: new Date().toISOString(), refundReason: body.reason.trim() });
  return ok(fullSale(s));
});

// ---- held carts
on('GET', '/suspended-carts', ({ user }) => ok({ data: db.held.filter((h) => h.cashierId === user.id) }), { roles: ['cashier'] });
on('POST', '/suspended-carts', ({ body, user }) => {
  const items = body.items.map((i) => ({ productId: i.productId, name: db.products.find((p) => p.id === i.productId)?.name, color: i.color || null, quantity: i.quantity }));
  const h = { id: ++db.seq.held, cashierId: user.id, items, discount: body.discount || null, createdAt: new Date().toISOString() };
  db.held.push(h);
  return ok(h, 201);
}, { roles: ['cashier'] });
on('DELETE', '/suspended-carts/:id', ({ groups, user }) => {
  const i = db.held.findIndex((h) => h.id === Number(groups.id) && h.cashierId === user.id);
  if (i < 0) throw new HttpErr(404, 'Held order not found.');
  db.held.splice(i, 1);
  return ok(null, 204);
}, { roles: ['cashier'] });

// ---- dashboard
on('GET', '/dashboard', () => {
  const today = finance(salesBetween(startOfDay(now), endOfDay(now)));
  const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 6);
    const f = finance(salesBetween(startOfDay(d), endOfDay(d)));
    return { date: dayKey(d), pics: f.picsSold, revenue: f.revenue };
  });
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const f = finance(salesBetween(m, endOfDay(new Date(m.getFullYear(), m.getMonth() + 1, 0))));
    return { month: `${m.getFullYear()}-${pad(m.getMonth() + 1)}`, revenue: f.revenue, profit: f.grossProfit };
  });
  const last30 = salesBetween(startOfDay(addDays(now, -29)), endOfDay(now)).filter((s) => s.status === 'completed');
  const byProduct = new Map();
  last30.forEach((s) => s.items.forEach((i) => { const r = byProduct.get(i.productId) || { productId: i.productId, name: i.name, code: i.code, picsSold: 0, revenue: 0 }; r.picsSold += i.quantity; r.revenue += i.lineTotal; byProduct.set(i.productId, r); }));
  const bestSellers = [...byProduct.values()].sort((a, b) => b.picsSold - a.picsSold).slice(0, 5).map((b) => ({ ...b, revenue: r2(b.revenue), colors: colorsOf(b.productId) }));
  const recentSales = [...db.sales].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5).map(saleRow);
  const feed = [
    ...db.sales.slice(-8).map((s) => ({ id: `s${s.id}`, type: s.status === 'refunded' ? 'refund' : 'sale', message: `${cashierRef(s.cashierId).name} ${s.status === 'refunded' ? 'refunded' : 'sold'} ${s.receiptNumber} (₦${s.total.toLocaleString()})`, createdAt: s.createdAt })),
    ...db.shifts.slice(-4).flatMap((s) => [{ id: `li${s.id}`, type: 'login', message: `${cashierRef(s.cashierId).name} signed in`, createdAt: s.loginAt }, ...(s.logoutAt ? [{ id: `lo${s.id}`, type: 'logout', message: `${cashierRef(s.cashierId).name} signed out`, createdAt: s.logoutAt }] : [])]),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8);
  const low = lowStockList();
  return ok({
    stats: { todaySales: today.collected, grossProfit: today.grossProfit, transactions: today.transactions, lowStockCount: low.length, averageOrderValue: today.averageOrderValue },
    weeklyTrend, monthlyTrend,
    profitSummary: { revenue: today.revenue, costOfGoods: today.costOfGoods, grossProfit: today.grossProfit, marginPercent: today.marginPercent },
    recentSales, bestSellers,
    lowStock: low.slice(0, 6).map((p) => ({ id: p.id, name: p.name, code: p.code, stock: p.stock, lowStockThreshold: p.lowStockThreshold, colors: p.colors })),
    activityFeed: feed,
    cashierActivity: [...db.shifts].sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt)).slice(0, 5).map(shiftRow),
  });
}, { roles: ['admin'] });

// ---- reports
function report(from, to, granularity) {
  const list = salesBetween(from, to);
  const buckets = new Map();
  list.filter((s) => s.status === 'completed').forEach((s) => {
    const d = new Date(s.createdAt);
    const key = granularity === 'hour' ? pad(d.getHours()) : granularity === 'month' ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}` : dayKey(d);
    (buckets.get(key) || buckets.set(key, []).get(key)).push(s);
  });
  const label = (key) => {
    if (granularity === 'hour') { const h = Number(key); return `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`; }
    if (granularity === 'month') return new Intl.DateTimeFormat('en-NG', { month: 'short', year: 'numeric' }).format(new Date(`${key}-01T12:00:00`));
    return new Intl.DateTimeFormat('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }).format(parseDay(key));
  };
  const { collected, ...summary } = finance(list);
  const breakdown = [...buckets.keys()].sort().map((key) => { const f = finance(buckets.get(key)); return { key, label: label(key), revenue: f.revenue, profit: f.grossProfit, transactions: f.transactions, pics: f.picsSold }; });
  return ok({ period: { from: from.toISOString(), to: to.toISOString() }, summary, breakdown });
}
on('GET', '/reports/daily', ({ params: q }) => { const d = q.date ? parseDay(q.date) : now; return report(startOfDay(d), endOfDay(d), 'hour'); }, { roles: ['admin'] });
on('GET', '/reports/weekly', ({ params: q }) => { const m = mondayOf(q.date ? parseDay(q.date) : now); return report(m, endOfDay(addDays(m, 6)), 'day'); }, { roles: ['admin'] });
on('GET', '/reports/monthly', ({ params: q }) => {
  const [y, m] = (q.month || `${now.getFullYear()}-${pad(now.getMonth() + 1)}`).split('-').map(Number);
  return report(new Date(y, m - 1, 1), endOfDay(new Date(y, m, 0)), 'day');
}, { roles: ['admin'] });
on('GET', '/reports/custom', ({ params: q }) => {
  if (!q.from || !q.to) throw new HttpErr(422, 'from and to are required.');
  const from = startOfDay(parseDay(q.from)); const to = endOfDay(parseDay(q.to));
  return report(from, to, (to - from) / 86400000 > 62 ? 'month' : 'day');
}, { roles: ['admin'] });
on('GET', '/reports/bestsellers', ({ params: q }) => {
  const list = salesBetween(startOfDay(parseDay(q.from || dayKey(addDays(now, -29)))), endOfDay(parseDay(q.to || dayKey(now)))).filter((s) => s.status === 'completed');
  const m = new Map();
  list.forEach((s) => s.items.forEach((i) => { const r = m.get(i.productId) || { productId: i.productId, name: i.name, code: i.code, picsSold: 0, revenue: 0, profit: 0 }; r.picsSold += i.quantity; r.revenue += i.lineTotal; r.profit += i.lineTotal - i.quantity * i.unitCost; m.set(i.productId, r); }));
  return ok({ data: [...m.values()].sort((a, b) => b.picsSold - a.picsSold).slice(0, Number(q.limit) || 10).map((r) => ({ ...r, revenue: r2(r.revenue), profit: r2(r.profit), colors: colorsOf(r.productId) })) });
}, { roles: ['admin'] });
on('GET', '/reports/slowmovers', ({ params: q }) => {
  const days = Number(q.days) || 30;
  const since = startOfDay(addDays(now, -(days - 1)));
  const done = db.sales.filter((s) => s.status === 'completed');
  const rows = db.products.filter((p) => !p.archived && p.stock > 0).map((p) => {
    const lines = done.flatMap((s) => s.items.filter((i) => i.productId === p.id).map((i) => ({ q: i.quantity, at: s.createdAt })));
    const recent = lines.filter((l) => new Date(l.at) >= since);
    const last = lines.length ? lines.reduce((a, l) => (a > l.at ? a : l.at), '') : null;
    return { productId: p.id, name: p.name, code: p.code, stock: p.stock, picsSold: sum(recent, (l) => l.q), lastSoldAt: last, colors: p.colors };
  }).filter((r) => r.picsSold === 0).sort((a, b) => b.stock - a.stock);
  return ok({ data: rows.slice(0, Number(q.limit) || 50) });
}, { roles: ['admin'] });
on('GET', '/reports/lowstock', () => ok({ data: lowStockList() }), { roles: ['admin'] });
on('GET', '/reports/inventory', () => {
  const list = db.products.filter((p) => !p.archived);
  return ok({ data: list, totals: { itemCount: list.length, totalPics: sum(list, (p) => p.stock), stockValueCost: r2(sum(list, (p) => p.stock * p.costPrice)), stockValueRetail: r2(sum(list, (p) => p.stock * p.pricePerPic)) } });
}, { roles: ['admin'] });
on('GET', '/reports/activity', ({ params: q }) => {
  let list = [...db.shifts];
  if (q.cashierId) list = list.filter((s) => s.cashierId === Number(q.cashierId));
  if (q.from) list = list.filter((s) => new Date(s.loginAt) >= startOfDay(parseDay(q.from)));
  if (q.to) list = list.filter((s) => new Date(s.loginAt) <= endOfDay(parseDay(q.to)));
  list.sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt));
  const res = paginate(list, q.page, q.limit);
  return ok({ ...res, data: res.data.map(shiftRow) });
}, { roles: ['admin'] });

// ---- settings & notifications
on('GET', '/settings', () => ok(db.settings));
on('PUT', '/settings', ({ body }) => {
  const e = {};
  if ('taxRate' in body && !(body.taxRate >= 0 && body.taxRate <= 100)) e.taxRate = 'Between 0 and 100.';
  if ('maxDiscountPercent' in body && !(body.maxDiscountPercent >= 0 && body.maxDiscountPercent <= 100)) e.maxDiscountPercent = 'Between 0 and 100.';
  if (Object.keys(e).length) throw fieldErr(422, 'Please fix the highlighted fields.', e);
  const { shopLogoUrl, ...allowed } = body;
  Object.assign(db.settings, allowed);
  return ok(db.settings);
}, { roles: ['admin'] });
on('POST', '/settings/logo', ({ body }) => { db.settings.shopLogoUrl = URL.createObjectURL(body.get('logo')); return ok({ shopLogoUrl: db.settings.shopLogoUrl }); }, { roles: ['admin'] });
const notifications = () => [
  ...lowStockList().map((p) => ({ id: `low-${p.id}`, type: 'low_stock', title: p.stock <= 0 ? 'Out of stock' : 'Low stock', message: `${p.name} has ${p.stock} pic${p.stock === 1 ? '' : 's'} left.`, createdAt: p.updatedAt })),
  ...db.sales.slice(-3).map((s) => ({ id: `sale-${s.id}`, type: 'sale', title: 'New sale', message: `${s.receiptNumber} · ₦${s.total.toLocaleString()} by ${cashierRef(s.cashierId).name}`, createdAt: s.createdAt })),
].map((n) => ({ ...n, read: db.read.has(n.id) })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
on('GET', '/notifications', () => ok({ data: notifications() }), { roles: ['admin'] });
on('POST', '/notifications/read-all', () => { notifications().forEach((n) => db.read.add(n.id)); return ok(null, 204); }, { roles: ['admin'] });

/* ------------------------------- adapter ------------------------------- */
export async function mockAdapter(config) {
  await delay(120 + Math.random() * 160);
  const method = (config.method || 'get').toUpperCase();
  const path = (config.url || '').split('?')[0].replace(/\/$/, '');
  let body = config.data;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const fail = (e) => {
    const response = { data: { message: e.message, ...e.extra }, status: e.status, statusText: '', headers: {}, config };
    return new AxiosError(e.message, 'ERR_BAD_REQUEST', config, {}, response);
  };
  try {
    const route = routes.map((r) => ({ r, m: r.re.exec(path) })).find((x) => x.r.method === method && x.m);
    if (!route) throw new HttpErr(404, `No such endpoint: ${method} ${path}`);
    let user = null;
    if (route.r.auth) {
      const id = Number(String(config.headers?.Authorization || '').replace('Bearer mock.', ''));
      user = userById(id);
      if (!user || !user.active) throw new HttpErr(401, 'Please sign in.');
    }
    if (route.r.roles && !route.r.roles.includes(user.role)) throw new HttpErr(403, 'You do not have permission to do that.');
    const out = route.r.handler({ params: config.params || {}, body: body || {}, user, groups: route.m.groups || {} });
    return { data: out.data, status: out.status || 200, statusText: 'OK', headers: {}, config, request: {} };
  } catch (e) {
    if (e instanceof HttpErr) throw fail(e);
    throw e;
  }
}
