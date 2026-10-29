import { useMemo } from 'react';
import { Chart as ChartJS, BarElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip } from 'chart.js';
import { useTheme } from '@/context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const read = (name) => `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim().split(' ').join(',')})`;

/** Chart.js can't use CSS variables directly, so read the current theme's values. */
export function useChartColors() {
  const { theme } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ ink: read('ink'), muted: read('muted'), line: read('line'), accent: read('accent'), primary: read('primary'), surface: read('surface') }), [theme]);
}

export function baseOptions(c, { yFormat } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: c.primary, titleColor: '#fff', bodyColor: '#fff', padding: 10, cornerRadius: 12, displayColors: false } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: c.muted, font: { family: 'Plus Jakarta Sans', size: 11 } } },
      y: { beginAtZero: true, border: { display: false }, grid: { color: c.line }, ticks: { color: c.muted, font: { family: 'Plus Jakarta Sans', size: 11 }, callback: yFormat } },
    },
  };
}
