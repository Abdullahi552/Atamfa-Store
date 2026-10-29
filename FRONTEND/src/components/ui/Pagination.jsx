import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/components/ui/Button';

export default function Pagination({ pagination, onPage }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { page, totalPages, total } = pagination;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-muted">
      <span>{total} results</span>
      <div className="flex items-center gap-2">
        <IconButton icon={ChevronLeft} label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className="h-8 w-8 disabled:opacity-40" />
        <span className="num text-ink">{page} / {totalPages}</span>
        <IconButton icon={ChevronRight} label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="h-8 w-8 disabled:opacity-40" />
      </div>
    </div>
  );
}
