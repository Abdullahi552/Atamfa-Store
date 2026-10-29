import { Delete } from 'lucide-react';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'back'];

export default function Keypad({ onKey, disabled }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((k) => (
        <button
          key={k} type="button" disabled={disabled} onClick={() => onKey(k)} aria-label={k === 'back' ? 'Backspace' : k === 'C' ? 'Reset quantity' : k}
          className="num flex h-11 items-center justify-center rounded-2xl bg-surface2 text-lg font-medium transition hover:bg-line active:scale-95 disabled:opacity-40"
        >
          {k === 'back' ? <Delete className="h-5 w-5" /> : k}
        </button>
      ))}
    </div>
  );
}
