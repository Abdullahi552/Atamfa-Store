import { assetUrl } from '@/config/env';
import { useSettings } from '@/context/SettingsContext';
import { formatDateTime, formatNaira } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/constants';

/** Prints just the receipt (not the whole app) by cloning it into #print-root. */
export function printReceipt(element) {
  if (!element) return;
  let root = document.getElementById('print-root');
  if (!root) { root = document.createElement('div'); root.id = 'print-root'; document.body.appendChild(root); }
  root.innerHTML = element.outerHTML;
  document.body.classList.add('print-receipt');
  const done = () => { document.body.classList.remove('print-receipt'); root.innerHTML = ''; window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}

export default function Receipt({ sale, innerRef }) {
  const { settings } = useSettings();
  const method = PAYMENT_METHODS.find((m) => m.value === sale.paymentMethod)?.label || sale.paymentMethod;
  const logo = assetUrl(settings.shopLogoUrl);
  const Row = ({ label, value, bold }) => (
    <div className={`flex justify-between gap-3 ${bold ? 'text-sm font-bold' : ''}`}><span>{label}</span><span>{value}</span></div>
  );

  return (
    <div ref={innerRef} className="mx-auto w-full max-w-[340px] rounded-2xl bg-white p-5 font-mono text-xs leading-relaxed text-black ring-1 ring-black/10">
      <div className="text-center">
        {logo && <img src={logo} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" />}
        <p className="text-base font-bold">{settings.shopName}</p>
        {settings.shopAddress && <p>{settings.shopAddress}</p>}
        {settings.shopPhone && <p>{settings.shopPhone}</p>}
      </div>
      <div className="my-3 border-t border-dashed border-black/40" />
      <Row label="Receipt" value={sale.receiptNumber} />
      <Row label="Date" value={formatDateTime(sale.createdAt)} />
      <Row label="Cashier" value={sale.cashier?.name} />
      <Row label="Payment" value={method} />
      {sale.status === 'refunded' && <p className="mt-2 border border-black p-1 text-center font-bold">*** REFUNDED ***</p>}
      <div className="my-3 border-t border-dashed border-black/40" />
      {sale.items?.map((it, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between gap-3"><span className="font-semibold">{it.name}</span><span>{formatNaira(it.lineTotal)}</span></div>
          <p className="text-black/70">{it.color?.name ? `${it.color.name} · ` : ''}{it.quantity} pic{it.quantity > 1 ? 's' : ''} × {formatNaira(it.unitPrice)}</p>
        </div>
      ))}
      <div className="my-3 border-t border-dashed border-black/40" />
      <Row label="Subtotal" value={formatNaira(sale.subtotal)} />
      {sale.discount > 0 && <Row label="Discount" value={`-${formatNaira(sale.discount)}`} />}
      <Row label={`Tax (${sale.taxRate ?? 0}%)`} value={formatNaira(sale.tax)} />
      <div className="my-1 border-t border-black/40" />
      <Row label="TOTAL" value={formatNaira(sale.total)} bold />
      {sale.amountTendered > 0 && <><Row label="Received" value={formatNaira(sale.amountTendered)} /><Row label="Change" value={formatNaira(Math.max(0, sale.amountTendered - sale.total))} /></>}
      <div className="my-3 border-t border-dashed border-black/40" />
      <p className="text-center">{settings.receiptFooter}</p>
    </div>
  );
}
