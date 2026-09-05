import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, userApi } from '../api/crmApi';
import { useToast } from './ToastContext';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('crm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('crm_token');
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('crm_user', JSON.stringify(res.data.data));
          }
        } catch (err) {
          console.error("Auth verification failed:", err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authApi.login({ email, password });
      if (res.data.success) {
        const { token, user: userData } = res.data.data;
        localStorage.setItem('crm_token', token);
        localStorage.setItem('crm_user', JSON.stringify(userData));
        setUser(userData);
        toast.success(`Welcome back, ${userData.full_name}!`);
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
    window.location.href = '/login';
  };

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('crm_user', JSON.stringify(updatedUser));
  };

  const role = user?.role_name || user?.role || '';
  const isAdmin = role === 'Admin';
  const isManager = role === 'Sales Manager';
  const isExecutive = role === 'Sales Executive';
  const isReadOnly = role === 'Read Only';
  const canWrite = !isReadOnly;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUserProfile,
        isAuthenticated: !!user,
        role,
        isAdmin,
        isManager,
        isExecutive,
        isReadOnly,
        canWrite,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
