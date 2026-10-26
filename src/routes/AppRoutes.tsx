import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LoginPage } from '@/pages/Login';
import { ForgotPasswordPage } from '@/pages/ForgotPassword';
import { DashboardPage } from '@/pages/Dashboard';
import { CustomersPage } from '@/pages/Customers';
import { NewCustomerPage } from '@/pages/NewCustomer';
import { CustomerDetailsPage } from '@/pages/CustomerDetails';
import { EditCustomerPage } from '@/pages/EditCustomer';
import { VisitFormPage } from '@/pages/VisitForm';
import { EmployeesPage } from '@/pages/Employees';
import { NotFoundPage } from '@/pages/NotFound';
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from './guards';

export function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <RedirectIfAuthenticated>
            <AuthLayout />
          </RedirectIfAuthenticated>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/customers/new" element={<NewCustomerPage />} />
        <Route path="/customers/:customerId" element={<CustomerDetailsPage />} />
        <Route path="/customers/:customerId/edit" element={<EditCustomerPage />} />
        <Route
          path="/customers/:customerId/visits/new"
          element={<VisitFormPage mode="create" />}
        />
        <Route
          path="/customers/:customerId/visits/:visitId/edit"
          element={<VisitFormPage mode="edit" />}
        />

        {/* Admin-only. Firestore rules enforce this independently of the
            route guard. */}
        <Route element={<RequireAdmin />}>
          <Route path="/employees" element={<EmployeesPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
