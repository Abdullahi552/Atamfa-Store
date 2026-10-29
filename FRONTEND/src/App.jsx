import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute, { RoleRedirect } from '@/components/common/ProtectedRoute';
import AdminLayout from '@/components/layout/AdminLayout';
import CashierLayout from '@/components/layout/CashierLayout';
import { Suspense } from 'react';
import { FullPageSpinner } from '@/components/ui/Feedback';
import { ROLES } from '@/lib/constants';

// Route-level code splitting keeps the first load small.
const Login = lazy(() => import('@/pages/Login'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const Products = lazy(() => import('@/pages/admin/Products'));
const Sales = lazy(() => import('@/pages/admin/Sales'));
const Cashiers = lazy(() => import('@/pages/admin/Cashiers'));
const Reports = lazy(() => import('@/pages/admin/Reports'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const POS = lazy(() => import('@/pages/cashier/POS'));
const MySales = lazy(() => import('@/pages/cashier/MySales'));

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute roles={[ROLES.ADMIN]}><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="sales" element={<Sales />} />
          <Route path="cashiers" element={<Cashiers />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/pos" element={<ProtectedRoute roles={[ROLES.CASHIER]}><CashierLayout /></ProtectedRoute>}>
          <Route index element={<POS />} />
          <Route path="my-sales" element={<MySales />} />
        </Route>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
