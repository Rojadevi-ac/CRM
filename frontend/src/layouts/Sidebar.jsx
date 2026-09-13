import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Building2,
  Contact,
  Handshake,
  Activity,
  ClipboardCheck,
  CalendarClock,
  Package,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';

export default function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) {
  const { isAdmin, isManager, isReadOnly } = useAuth();
  const { companySettings } = useCompany();

  const brandName = companySettings?.display_name || companySettings?.company_name || 'Enterprise CRM';
  const legalSub = companySettings?.legal_name || 'Enterprise CRM';
  const backendBase = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:5000';
  const logoUrl = companySettings?.logo_url ? (companySettings.logo_url.startsWith('http') ? companySettings.logo_url : `${backendBase}${companySettings.logo_url}`) : null;
  const initials = brandName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RD';

  const NAV_ITEMS = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', path: '/leads', icon: UserPlus },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Companies', path: '/companies', icon: Building2 },
    { name: 'Contacts', path: '/contacts', icon: Contact },
    { name: 'Deals', path: '/deals', icon: Handshake },
    { name: 'Activities', path: '/activities', icon: Activity },
    { name: 'Tasks', path: '/tasks', icon: ClipboardCheck },
    { name: 'Follow-ups', path: '/followups', icon: CalendarClock },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const BOTTOM_ITEMS = [
    ...(isAdmin ? [{ name: 'Audit Logs', path: '/audit-logs', icon: ShieldCheck }] : []),
    ...(!isReadOnly ? [{ name: 'Settings', path: '/settings', icon: Settings }] : []),
  ];

  const sidebarContent = (
    <div
      className="h-full flex flex-col justify-between transition-all duration-300 select-none shadow-sm"
      style={{
        backgroundColor: 'var(--theme-bg-sidebar, #ffffff)',
        borderRight: '1px solid var(--theme-border-color, #e2e8f0)',
      }}
    >
      {/* Brand Header */}
      <div>
        <div
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4`}
          style={{ borderBottom: '1px solid var(--theme-border-color, #e2e8f0)' }}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="w-9 h-9 rounded-2xl object-cover shadow-sm border border-slate-200/80 dark:border-slate-700/60 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm border border-white/30 shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-sm leading-tight tracking-tight text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                  {brandName}
                  <span className="w-2 h-2 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0"></span>
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider truncate">
                  Enterprise Suite
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName}
                  className="w-9 h-9 rounded-2xl object-cover shadow-sm border border-slate-200/80 dark:border-slate-700/60"
                  title={brandName}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm border border-white/30"
                  title={brandName}
                >
                  {initials}
                </div>
              )}
            </div>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-xl text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 clay-pill transition-all active:scale-95"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Navigation items */}
        <div className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-140px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `group relative flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-3.5'
                  } py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-50/90 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 shadow-clay-pill dark:shadow-clay-pill-dark border border-brand-200/80 dark:border-brand-750'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/90 dark:hover:bg-[#182238] hover:text-slate-900 dark:hover:text-slate-100 hover:shadow-soft-xs'
                  }`
                }
              >
                <Icon className={`w-4 h-4 shrink-0 ${isCollapsed ? '' : 'mr-3'} transition-transform group-hover:scale-110`} />
                {!isCollapsed && <span>{item.name}</span>}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="fixed left-20 ml-2 px-3 py-1.5 clay-card text-slate-900 dark:text-white text-xs font-bold shadow-clay-card-hover dark:shadow-clay-card-dark-hover opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Bottom Settings items */}
      <div className="p-3 border-t border-slate-100/80 dark:border-slate-800/80 space-y-1.5">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `group relative flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'px-3.5'
                } py-2.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-50/90 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 shadow-clay-pill dark:shadow-clay-pill-dark border border-brand-200/80 dark:border-brand-750'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/90 dark:hover:bg-[#182238] hover:text-slate-900 dark:hover:text-slate-100'
                }`
              }
            >
              <Icon className={`w-4 h-4 shrink-0 ${isCollapsed ? '' : 'mr-3'} transition-transform group-hover:scale-110`} />
              {!isCollapsed && <span>{item.name}</span>}

              {isCollapsed && (
                <div className="fixed left-20 ml-2 px-3 py-1.5 clay-card text-slate-900 dark:text-white text-xs font-bold shadow-clay-card-hover dark:shadow-clay-card-dark-hover opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onCloseMobile} />
          <div className="fixed inset-y-0 left-0 w-64 z-10 shadow-soft-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
