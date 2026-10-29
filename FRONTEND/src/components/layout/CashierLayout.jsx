import AppShell from '@/components/layout/AppShell';
import { CartProvider } from '@/context/CartContext';

const NAV = [
  { to: '/pos', label: 'Point of sale', end: true },
  { to: '/pos/my-sales', label: 'My sales' },
];

export default function CashierLayout() {
  return (
    <CartProvider>
      <AppShell nav={NAV} wide />
    </CartProvider>
  );
}
