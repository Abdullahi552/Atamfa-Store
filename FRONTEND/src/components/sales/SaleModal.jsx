import { useRef, useState } from 'react';
import { Printer, Undo2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Field, Textarea } from '@/components/ui/Field';
import { ErrorState, Spinner } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/common/Badges';
import Receipt, { printReceipt } from '@/components/sales/Receipt';
import { useAsync } from '@/hooks/useAsync';
import { saleService } from '@/services/saleService';
import { useToast } from '@/context/ToastContext';

/**
 * Shows a receipt. Pass either `sale` (already loaded, e.g. just created) or `saleId` (fetched).
 * canRefund: show the refund action. onChanged: called after a refund so lists can refresh.
 */
export default function SaleModal({ sale: initial, saleId, onClose, canRefund = false, refundLabel = 'Refund sale', onChanged }) {
  const toast = useToast();
  const receiptRef = useRef(null);
  const { data, loading, error, reload, setData } = useAsync(() => (initial ? Promise.resolve(initial) : saleService.get(saleId)), [saleId]);
  const sale = data;
  const [refunding, setRefunding] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const doRefund = async () => {
    if (reason.trim().length < 3) return toast.error('Please give a short reason.');
    setBusy(true);
    try {
      const updated = await saleService.refund(sale.id, reason.trim());
      setData(updated);
      setRefunding(false);
      toast.success('Sale refunded. Stock has been restored.');
      onChanged?.(updated);
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <>
      <Modal
        onClose={onClose} title={sale ? `Receipt ${sale.receiptNumber}` : 'Receipt'} size="sm"
        description={sale ? undefined : ' '}
        footer={sale && (
          <>
            <StatusBadge status={sale.status} />
            <span className="flex-1" />
            {canRefund && sale.status === 'completed' && <Button variant="outline" icon={Undo2} onClick={() => setRefunding(true)}>{refundLabel}</Button>}
            <Button icon={Printer} onClick={() => printReceipt(receiptRef.current)}>Print</Button>
          </>
        )}
      >
        {loading && <div className="flex justify-center py-12"><Spinner className="h-6 w-6" /></div>}
        {error && <ErrorState error={error} onRetry={reload} />}
        {sale && <Receipt sale={sale} innerRef={receiptRef} />}
      </Modal>

      {refunding && (
        <Modal
          onClose={() => setRefunding(false)} title={refundLabel} size="sm"
          description="Items go back into stock and the sale is marked as refunded."
          footer={<><Button variant="outline" onClick={() => setRefunding(false)}>Cancel</Button><Button variant="danger" loading={busy} onClick={doRefund}>Confirm refund</Button></>}
        >
          <Field label="Reason"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer did not pay" autoFocus /></Field>
        </Modal>
      )}
    </>
  );
}
