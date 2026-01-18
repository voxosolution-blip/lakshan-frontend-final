// Main App Component
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Milk } from './pages/milk/Milk';
import { MilkSettings } from './pages/milk/MilkSettings';
import { FarmerFreeProductsSettings } from './pages/milk/FarmerFreeProductsSettings';
import { FarmerPaysheet } from './pages/milk/FarmerPaysheet';
import { Workers } from './pages/salary/Workers';
import { WorkerPaysheet } from './pages/salary/WorkerPaysheet';
import { Inventory } from './pages/inventory/Inventory';
import { Production } from './pages/production/Production';
import { Sales } from './pages/sales/Sales';
import { Returns } from './pages/returns/Returns';
import { Payments } from './pages/payments/Payments';
import { Cheques } from './pages/cheques/Cheques';
import { Expenses } from './pages/expenses/Expenses';
import { Reports } from './pages/reports/Reports';
import { Buyers } from './pages/buyers/Buyers';
import { LoginRoute } from './components/common/LoginRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="milk"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Milk />
            </ProtectedRoute>
          }
        />
        <Route
          path="milk/settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <MilkSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="milk/free-products-settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <FarmerFreeProductsSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="milk/paysheet/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <FarmerPaysheet />
            </ProtectedRoute>
          }
        />
        <Route
          path="salary"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Workers />
            </ProtectedRoute>
          }
        />
        <Route
          path="salary/paysheet/:id"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <WorkerPaysheet />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="production"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Production />
            </ProtectedRoute>
          }
        />
        <Route path="sales" element={<Sales />} />
        <Route
          path="returns"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Returns />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Payments />
            </ProtectedRoute>
          }
        />
        <Route
          path="cheques"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Cheques />
            </ProtectedRoute>
          }
        />
        <Route path="expenses" element={<Expenses />} />
        <Route
          path="buyers"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Buyers />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ACCOUNTANT']}>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

