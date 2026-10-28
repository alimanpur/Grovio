import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import ProtectedRoute from '@/components/grovio/ProtectedRoute.jsx'
import LandingPage from '@/pages/public/LandingPage.jsx'
import StoryPage from '@/pages/public/StoryPage.jsx'
import NotFound from '@/pages/NotFound.jsx'
import SignIn from '@/pages/auth/SignIn.jsx'
import Register from '@/pages/auth/Register.jsx'
import ForgotPassword from '@/pages/auth/ForgotPassword.jsx'
import ResetPassword from '@/pages/auth/ResetPassword.jsx'
import Onboarding from '@/pages/Onboarding.jsx'
import Today from '@/pages/today/Today.jsx'
import Pulse from '@/pages/today/Pulse.jsx'
import FutureLab from '@/pages/today/FutureLab.jsx'
import Billing from '@/pages/counter/Billing.jsx'
import Bills from '@/pages/counter/Bills.jsx'
import Returns from '@/pages/counter/Returns.jsx'
import Payments from '@/pages/counter/Payments.jsx'
import Products from '@/pages/stock/Products.jsx'
import Inventory from '@/pages/stock/Inventory.jsx'
import Purchases from '@/pages/stock/Purchases.jsx'
import SmartImport from '@/pages/stock/SmartImport.jsx'
import Suppliers from '@/pages/stock/Suppliers.jsx'
import Categories from '@/pages/stock/Categories.jsx'
import Sales from '@/pages/insights/Sales.jsx'
import Reports from '@/pages/insights/Reports.jsx'
import Customers from '@/pages/insights/Customers.jsx'
import Gst from '@/pages/insights/Gst.jsx'
import Users from '@/pages/store/Users.jsx'
import InvoiceSettings from '@/pages/store/InvoiceSettings.jsx'
import Taxes from '@/pages/store/Taxes.jsx'
import Settings from '@/pages/store/Settings.jsx'
import ChangePassword from '@/pages/store/ChangePassword.jsx'
import Backup from '@/pages/store/Backup.jsx'
import Help from '@/pages/store/Help.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/story" element={<StoryPage />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected app routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="today" replace />} />
        <Route path="today" element={<Today />} />
        <Route path="pulse" element={<Pulse />} />
        <Route path="future-lab" element={<FutureLab />} />
        <Route path="billing" element={<Billing />} />
        <Route path="bills" element={<Bills />} />
        <Route path="returns" element={<Returns />} />
        <Route path="payments" element={<Payments />} />
        <Route path="products" element={<Products />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="smart-import" element={<SmartImport />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="categories" element={<Categories />} />
        <Route path="sales" element={<Sales />} />
        <Route path="reports" element={<Reports />} />
        <Route path="customers" element={<Customers />} />
        <Route path="gst" element={<Gst />} />
        <Route path="users" element={<Users />} />
        <Route path="invoice-settings" element={<InvoiceSettings />} />
        <Route path="taxes" element={<Taxes />} />
        <Route path="settings" element={<Settings />} />
        <Route path="change-password" element={<ChangePassword />} />
        <Route path="backup" element={<Backup />} />
        <Route path="help" element={<Help />} />
        <Route path="onboarding" element={<Onboarding />} />
      </Route>

      {/* Legacy + Lovable route redirects */}
      <Route path="/register" element={<Navigate to="/sign-up" replace />} />
      <Route path="/dashboard" element={<Navigate to="/app/today" replace />} />
      <Route path="/notifications" element={<Navigate to="/app/pulse" replace />} />
      <Route path="/today" element={<Navigate to="/app/today" replace />} />
      <Route path="/pulse" element={<Navigate to="/app/pulse" replace />} />
      <Route path="/future-lab" element={<Navigate to="/app/future-lab" replace />} />
      <Route path="/billing" element={<Navigate to="/app/billing" replace />} />
      <Route path="/bills" element={<Navigate to="/app/bills" replace />} />
      <Route path="/returns" element={<Navigate to="/app/returns" replace />} />
      <Route path="/payments" element={<Navigate to="/app/payments" replace />} />
      <Route path="/products" element={<Navigate to="/app/products" replace />} />
      <Route path="/inventory" element={<Navigate to="/app/inventory" replace />} />
      <Route path="/purchases" element={<Navigate to="/app/purchases" replace />} />
      <Route path="/smart-import" element={<Navigate to="/app/smart-import" replace />} />
      <Route path="/suppliers" element={<Navigate to="/app/suppliers" replace />} />
      <Route path="/categories" element={<Navigate to="/app/categories" replace />} />
      <Route path="/sales" element={<Navigate to="/app/sales" replace />} />
      <Route path="/reports" element={<Navigate to="/app/reports" replace />} />
      <Route path="/customers" element={<Navigate to="/app/customers" replace />} />
      <Route path="/gst" element={<Navigate to="/app/gst" replace />} />
      <Route path="/users" element={<Navigate to="/app/users" replace />} />
      <Route path="/invoice-settings" element={<Navigate to="/app/invoice-settings" replace />} />
      <Route path="/taxes" element={<Navigate to="/app/taxes" replace />} />
      <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
      <Route path="/change-password" element={<Navigate to="/app/change-password" replace />} />
      <Route path="/backup" element={<Navigate to="/app/backup" replace />} />
      <Route path="/help" element={<Navigate to="/app/help" replace />} />
      <Route path="/onboarding" element={<Navigate to="/app/onboarding" replace />} />

      {/* Story page (public) */}
      <Route path="/story" element={<StoryPage />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
