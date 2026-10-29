import AppShell from '@/components/layout/AppShell';

const NAV = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/sales', label: 'Sales' },
  { to: '/admin/cashiers', label: 'Cashiers' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout() {
  return <AppShell nav={NAV} />;
}
