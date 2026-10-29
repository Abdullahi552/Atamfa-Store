import { Bar, Line } from 'react-chartjs-2';
import { baseOptions, useChartColors } from '@/components/charts/chartTheme';
import { formatCompactNaira, formatDate } from '@/lib/format';

/** Line chart of pics sold per day (last 7 days). */
export function WeeklyLine({ data = [] }) {
  const c = useChartColors();
  const chart = {
    labels: data.map((d) => formatDate(d.date, { weekday: 'short' })),
    datasets: [{ data: data.map((d) => d.pics), borderColor: c.primary, backgroundColor: `${c.accent.replace('rgb', 'rgba').replace(')', ',0.35)')}`, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: c.accent, pointBorderColor: c.primary, pointBorderWidth: 2, borderWidth: 2.5 }],
  };
  const options = baseOptions(c);
  options.plugins.tooltip.callbacks = { label: (ctx) => `${ctx.parsed.y} pics` };
  return <div className="h-56"><Line data={chart} options={options} /></div>;
}

/** Bar chart of revenue per month (last 6 months). */
export function MonthlyBar({ data = [] }) {
  const c = useChartColors();
  const chart = {
    labels: data.map((d) => formatDate(`${d.month}-01`, { month: 'short' })),
    datasets: [{ data: data.map((d) => d.revenue), backgroundColor: data.map((_, i) => (i === data.length - 1 ? c.primary : c.accent)), borderRadius: 12, borderSkipped: false, maxBarThickness: 38 }],
  };
  const options = baseOptions(c, { yFormat: (v) => formatCompactNaira(v) });
  options.plugins.tooltip.callbacks = { label: (ctx) => formatCompactNaira(ctx.parsed.y) };
  return <div className="h-56"><Bar data={chart} options={options} /></div>;
}

export function RevenueBars({ data = [], labelKey = 'label' }) {
  const c = useChartColors();
  const chart = {
    labels: data.map((d) => d[labelKey]),
    datasets: [
      { label: 'Revenue', data: data.map((d) => d.revenue), backgroundColor: c.accent, borderRadius: 10, borderSkipped: false, maxBarThickness: 34 },
      { label: 'Profit', data: data.map((d) => d.profit), backgroundColor: c.primary, borderRadius: 10, borderSkipped: false, maxBarThickness: 34 },
    ],
  };
  const options = baseOptions(c, { yFormat: (v) => formatCompactNaira(v) });
  options.plugins.legend = { display: true, labels: { color: c.muted, usePointStyle: true, boxWidth: 8 } };
  options.plugins.tooltip.displayColors = true;
  options.plugins.tooltip.callbacks = { label: (ctx) => `${ctx.dataset.label}: ${formatCompactNaira(ctx.parsed.y)}` };
  return <div className="h-64"><Bar data={chart} options={options} /></div>;
}
