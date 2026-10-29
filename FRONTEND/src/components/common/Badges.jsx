import { Badge } from '@/components/ui/Feedback';
import { stockLevel } from '@/lib/constants';

const LEVELS = { high: ['ok', 'High'], medium: ['warn', 'Medium'], low: ['danger', 'Low'], out: ['danger', 'Out'] };
export function StockBadge({ stock, threshold }) {
  const [tone, label] = LEVELS[stockLevel(stock, threshold)];
  return <Badge tone={tone}>{label}</Badge>;
}

const STATUS = { completed: ['ok', 'Completed'], processing: ['warn', 'Processing'], refunded: ['danger', 'Refunded'] };
export function StatusBadge({ status }) {
  const [tone, label] = STATUS[status] || ['neutral', status];
  return <Badge tone={tone}>{label}</Badge>;
}
