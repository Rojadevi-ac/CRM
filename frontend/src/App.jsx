import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import Customers from './pages/Customers';
import Companies from './pages/Companies';
import Contacts from './pages/Contacts';
import Deals from './pages/Deals';
import Activities from './pages/Activities';
import Tasks from './pages/Tasks';
import Followups from './pages/Followups';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import AuditLogs from './pages/AuditLogs';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <SocketProvider>
            <BrowserRouter>
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
            </BrowserRouter>
          </SocketProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
