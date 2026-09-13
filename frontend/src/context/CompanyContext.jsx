import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsApi } from '../api/crmApi';
import { useSocket } from './SocketContext';

const CompanyContext = createContext();

export function CompanyProvider({ children }) {
  const [companySettings, setCompanySettings] = useState(() => {
    const cached = localStorage.getItem('crm_company_settings');
    return cached ? JSON.parse(cached) : {
      company_name: 'Enterprise CRM Inc.',
      display_name: 'Enterprise CRM',
      currency: 'USD',
      timezone: 'UTC',
      date_format: 'MM/DD/YYYY'
    };
  });
  const [loading, setLoading] = useState(true);
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  const fetchCompanySettings = useCallback(async () => {
    try {
      const res = await settingsApi.getCompanySettings();
      if (res.data.success && res.data.data) {
        setCompanySettings(res.data.data);
        localStorage.setItem('crm_company_settings', JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.warn("Could not fetch company settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanySettings();
  }, [fetchCompanySettings]);

  // Real-time synchronization for company branding & settings
  useEffect(() => {
    const handleCompanyUpdate = (updated) => {
      if (updated) {
        setCompanySettings(updated);
        localStorage.setItem('crm_company_settings', JSON.stringify(updated));
      } else {
        fetchCompanySettings();
      }
    };

    subscribeToEvent('company_settings_updated', handleCompanyUpdate);
    return () => {
      unsubscribeFromEvent('company_settings_updated', handleCompanyUpdate);
    };
  }, [subscribeToEvent, unsubscribeFromEvent, fetchCompanySettings]);

  // Dynamically update document title based on company brand
  useEffect(() => {
    const brand = companySettings?.display_name || companySettings?.company_name || 'Enterprise CRM';
    document.title = `${brand} | Sales & Pipeline Management`;
  }, [companySettings]);

  const updateCompanySettings = async (data) => {
    const res = await settingsApi.updateCompanySettings(data);
    if (res.data.success) {
      setCompanySettings(res.data.data);
      localStorage.setItem('crm_company_settings', JSON.stringify(res.data.data));
      return { success: true, data: res.data.data };
    }
    return { success: false, message: res.data.message };
  };

  const uploadLogo = async (formData) => {
    const res = await settingsApi.uploadCompanyLogo(formData);
    if (res.data.success) {
      setCompanySettings(res.data.data);
      localStorage.setItem('crm_company_settings', JSON.stringify(res.data.data));
      return { success: true, data: res.data.data };
    }
    return { success: false, message: res.data.message };
  };

  const removeLogo = async () => {
    const res = await settingsApi.removeCompanyLogo();
    if (res.data.success) {
      setCompanySettings(res.data.data);
      localStorage.setItem('crm_company_settings', JSON.stringify(res.data.data));
      return { success: true, data: res.data.data };
    }
    return { success: false, message: res.data.message };
  };

  return (
    <CompanyContext.Provider
      value={{
        companySettings,
        loading,
        updateCompanySettings,
        uploadLogo,
        removeLogo,
        refreshSettings: fetchCompanySettings,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (!context) {
    return {
      companySettings: {
        company_name: 'Enterprise CRM Inc.',
        display_name: 'Enterprise CRM',
        currency: 'USD',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY'
      },
      loading: false,
      updateCompanySettings: async () => {},
      uploadLogo: async () => {},
      removeLogo: async () => {},
      refreshSettings: () => {},
    };
  }
  return context;
}
