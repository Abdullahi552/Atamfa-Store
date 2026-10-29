export const ROLES = { ADMIN: 'admin', CASHIER: 'cashier' };

export const CATEGORIES = ['Turmi', 'Ankara', 'Satin', 'Velvet', 'Lace', 'Cotton'];
export const MATERIAL_TYPES = ['100% Cotton', 'Polyester', 'Silk', 'Cotton blend', 'Nylon', 'Viscose'];
export const SIZES = ['S', 'M', 'L', 'XL'];

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'pos', label: 'POS' },
];

export const SALE_STATUSES = [
  { value: 'completed', label: 'Completed' },
  { value: 'processing', label: 'Processing' },
  { value: 'refunded', label: 'Refunded' },
];

/** Colours the owner can pick from when adding cloth. A custom colour can also be added. */
export const FABRIC_COLORS = [
  { name: 'Indigo', hex: '#2B2F77' }, { name: 'Royal Blue', hex: '#2457C5' }, { name: 'Sky Blue', hex: '#6FB1E8' },
  { name: 'Teal', hex: '#1F8A8A' }, { name: 'Emerald', hex: '#1E8E5A' }, { name: 'Lime Green', hex: '#8BC34A' },
  { name: 'Olive', hex: '#6B7A2A' }, { name: 'Gold', hex: '#C9962B' }, { name: 'Mustard', hex: '#D9A21B' },
  { name: 'Yellow', hex: '#F2D23C' }, { name: 'Orange', hex: '#E8812B' }, { name: 'Rust', hex: '#B5482A' },
  { name: 'Red', hex: '#C62828' }, { name: 'Maroon', hex: '#7A1F2B' }, { name: 'Wine', hex: '#5E1A3A' },
  { name: 'Pink', hex: '#E86FA3' }, { name: 'Fuchsia', hex: '#C2268F' }, { name: 'Purple', hex: '#6A3AA8' },
  { name: 'Lilac', hex: '#B79BDB' }, { name: 'Brown', hex: '#6B4A32' }, { name: 'Cream', hex: '#F1E6CC' },
  { name: 'White', hex: '#FFFFFF' }, { name: 'Silver', hex: '#B8BCC6' }, { name: 'Grey', hex: '#7C8190' },
  { name: 'Black', hex: '#16171C' },
];

/**
 * Stock level. MUST match the backend's `stockStatus` filter:
 *   out    -> stock <= 0
 *   low    -> stock <= lowStockThreshold
 *   medium -> stock <= lowStockThreshold * 3
 *   high   -> otherwise
 */
export function stockLevel(stock, threshold = 5) {
  if (stock <= 0) return 'out';
  if (stock <= threshold) return 'low';
  if (stock <= threshold * 3) return 'medium';
  return 'high';
}
