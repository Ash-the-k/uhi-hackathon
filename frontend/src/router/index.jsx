import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoginPage from '../pages/Auth/LoginPage';

const UsersManagementPage = React.lazy(() => import('../pages/Admin/UsersManagementPage').catch(() => ({ default: () => <div>Admin Users (missing)</div> })));
const AdminAppointmentsPage = React.lazy(() => import('../pages/Admin/AdminAppointments').catch(() => ({ default: () => <div>Admin Appointments (missing)</div> })));
const DoctorDashboard = React.lazy(() => import('../pages/Doctor/DoctorDashboard').catch(() => ({ default: () => <div>Doctor Dashboard (missing)</div> })));
const PatientDashboard = React.lazy(() => import('../pages/Patient/PatientDashboard').catch(() => ({ default: () => <div>Patient Dashboard (missing)</div> })));
const StaffDashboard = React.lazy(() => import('../pages/Staff/StaffDashboard').catch(() => ({ default: () => <div>Staff Dashboard (missing)</div> })));

const RequireAuth = ({ role }) => {
  const { auth } = useContext(AuthContext);
  if (!auth?.token) return <Navigate to="/login" replace />;
  if (role && auth.role !== role) return <Navigate to="/login" replace />;
  return <Outlet />;
};

export default function Router() {
  return (
    <BrowserRouter>
      <React.Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RequireAuth role="admin" />}>
            <Route path="/admin/users" element={<UsersManagementPage />} />
            <Route path="/admin/appointments" element={<AdminAppointmentsPage />} />
          </Route>

          <Route element={<RequireAuth role="doctor" />}>
            <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          </Route>

          <Route element={<RequireAuth role="patient" />}>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
          </Route>

          <Route element={<RequireAuth role="staff" />}>
            <Route path="/staff/dashboard" element={<StaffDashboard />} />
          </Route>

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
