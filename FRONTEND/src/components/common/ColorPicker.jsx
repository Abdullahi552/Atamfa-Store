import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { FABRIC_COLORS } from '@/lib/constants';
import { cx } from '@/lib/format';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Swatch, isLight } from '@/components/common/Swatch';

const same = (a, b) => a.toLowerCase() === b.toLowerCase();

/** Multi-select cloth colour picker: presets + custom colour. value = [{ name, hex }] */
export default function ColorPicker({ value = [], onChange, invalid }) {
  const [customHex, setCustomHex] = useState('#2B2F77');
  const [customName, setCustomName] = useState('');

  const has = (hex) => value.some((c) => same(c.hex, hex));
  const toggle = (c) => onChange(has(c.hex) ? value.filter((v) => !same(v.hex, c.hex)) : [...value, c]);
  const addCustom = () => {
    if (!customName.trim() || has(customHex)) return;
    onChange([...value, { name: customName.trim(), hex: customHex.toUpperCase() }]);
    setCustomName('');
  };

  return (
    <div className={cx('rounded-2xl border p-3', invalid ? 'border-rust' : 'border-line')}>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
        {FABRIC_COLORS.map((c) => (
          <button
            key={c.hex} type="button" onClick={() => toggle(c)} title={c.name} aria-label={c.name} aria-pressed={has(c.hex)}
            className={cx('relative flex h-9 w-full items-center justify-center rounded-xl ring-1 ring-black/10 transition hover:scale-105', has(c.hex) && 'ring-2 ring-primary dark:ring-accent')}
            style={{ background: c.hex }}
          >
            {has(c.hex) && <Check className="h-4 w-4" style={{ color: isLight(c.hex) ? '#111' : '#fff' }} />}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <input type="color" value={customHex} onChange={(e) => setCustomHex(e.target.value)} aria-label="Custom colour" className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-transparent p-0.5" />
        <Input className="min-w-[140px] flex-1" placeholder="Name this colour, e.g. Sage" value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} />
        <Button variant="soft" icon={Plus} onClick={addCustom} disabled={!customName.trim() || has(customHex)}>Add colour</Button>
      </div>

      {value.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {value.map((c) => (
            <span key={c.hex} className="inline-flex items-center gap-1.5 rounded-full bg-surface2 py-1 pl-1.5 pr-1 text-xs font-medium">
              <Swatch color={c} size={16} /> {c.name}
              <button type="button" onClick={() => onChange(value.filter((v) => !same(v.hex, c.hex)))} aria-label={`Remove ${c.name}`} className="rounded-full p-0.5 text-muted hover:bg-line hover:text-ink"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
