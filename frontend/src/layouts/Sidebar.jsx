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

export default function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) {
  const { isAdmin, isManager, isReadOnly } = useAuth();

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
    <div className="h-full flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 select-none">
      {/* Brand Header */}
      <div>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-slate-100 dark:border-slate-800`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                RD
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base leading-tight tracking-tight text-slate-900 dark:text-slate-100">
                  RD-CRM
                </span>
                <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                  Enterprise Suite
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
              RD
            </div>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Main Navigation items */}
        <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `group relative flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'px-3'
                  } py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className={`w-5 h-5 shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span>{item.name}</span>}

                {/* Collapsed Tooltip */}
                {isCollapsed && (
                  <div className="fixed left-20 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-750">
                    {item.name}
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Bottom Settings items */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `group relative flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'px-3'
                } py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className={`w-5 h-5 shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
              {!isCollapsed && <span>{item.name}</span>}

              {isCollapsed && (
                <div className="fixed left-20 ml-2 px-2.5 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-md shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap border border-slate-750">
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
          isCollapsed ? 'w-20' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onCloseMobile} />
          <div className="fixed inset-y-0 left-0 w-64 z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
