import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CompanyProvider } from './context/CompanyContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

// Lazy Loaded Pages for High-Performance Route Splitting
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const LeadDetails = lazy(() => import('./pages/LeadDetails'));
const Customers = lazy(() => import('./pages/Customers'));
const Companies = lazy(() => import('./pages/Companies'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Deals = lazy(() => import('./pages/Deals'));
const Activities = lazy(() => import('./pages/Activities'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Followups = lazy(() => import('./pages/Followups'));
const Products = lazy(() => import('./pages/Products'));
const Reports = lazy(() => import('./pages/Reports'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));

// High-speed theme-aware page loading skeleton
function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin" />
      <span className="text-xs font-semibold text-slate-400">Loading module...</span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <CompanyProvider>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public Route */}
                    <Route path="/login" element={<Login />} />

                    {/* Protected Application Routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route element={<MainLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/leads" element={<Leads />} />
                        <Route path="/leads/:id" element={<LeadDetails />} />
                        <Route path="/customers" element={<Customers />} />
                        <Route path="/companies" element={<Companies />} />
                        <Route path="/contacts" element={<Contacts />} />
                        <Route path="/deals" element={<Deals />} />
                        <Route path="/activities" element={<Activities />} />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/followups" element={<Followups />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/profile" element={<Profile />} />

                        {/* Settings - Disallowed for Read Only */}
                        <Route element={<ProtectedRoute allowedRoles={['Admin', 'Sales Manager', 'Sales Executive']} />}>
                          <Route path="/settings" element={<Settings />} />
                        </Route>

                        {/* Admin Only Route */}
                        <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                          <Route path="/audit-logs" element={<AuditLogs />} />
                        </Route>
                      </Route>
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </CompanyProvider>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
