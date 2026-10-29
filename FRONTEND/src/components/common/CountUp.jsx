import { useEffect, useRef, useState } from 'react';

/** Animates a number from its previous value. `format` turns the number into display text. */
export default function CountUp({ value = 0, format = (n) => n, duration = 700 }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now();
    const a = from.current;
    const b = Number(value) || 0;
    if (reduce) { setShown(b); from.current = b; return undefined; }
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setShown(a + (b - a) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{format(shown)}</>;
}
