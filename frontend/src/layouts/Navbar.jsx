import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  User,
  Settings as SettingsIcon,
  LogOut,
  CheckCircle,
  Users as UsersIcon,
  ChevronDown,
  ShieldCheck,
  Circle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { notificationApi } from '../api/crmApi';
import Avatar from '../components/common/Avatar';
import GlobalSearchModal from '../components/common/GlobalSearchModal';
import { formatTime12Hour } from '../utils/dateUtils';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ onOpenMobileSidebar }) {
  const { user, logout, isAdmin, isReadOnly } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { onlineUsers, isConnected } = useSocket();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isOnlineOpen, setIsOnlineOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const onlineRef = useRef(null);

  // Global Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
      if (onlineRef.current && !onlineRef.current.contains(e.target)) {
        setIsOnlineOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await notificationApi.getNotifications({ limit: 6 });
      if (res.data.success) {
        setNotifications(res.data.data.notifications || []);
        setUnreadCount(res.data.data.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-20 h-16 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shadow-sm transition-colors duration-200"
        style={{
          backgroundColor: 'var(--theme-bg-sidebar, #ffffff)',
          borderBottom: '1px solid var(--theme-border-color, #e2e8f0)',
        }}
      >
        {/* Left: Mobile Toggle & Global Search trigger */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 clay-pill lg:hidden transition-all active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Trigger Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-3 w-48 sm:w-72 md:w-80 px-4 py-2 clay-inset text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium transition-all text-left group"
          >
            <Search className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-brand-500 transition-colors" />
            <span className="flex-1 truncate">Quick search CRM...</span>
          </button>
        </div>

        {/* Right: Presence, Notifications, Theme, Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Online Presence Interactive Popover */}
          <div className="relative" ref={onlineRef}>
            <button
              onClick={() => setIsOnlineOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3.5 py-1.5 clay-pill text-xs text-slate-700 dark:text-slate-200 font-bold transition-all active:scale-95 hover:bg-slate-50 dark:hover:bg-[#1a253a]"
              title="Click to view online team members"
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </span>
              <span>{Math.max(onlineUsers.length, 1)} online</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Active Members Dropdown Popover */}
            {isOnlineOpen && (
              <div className="absolute right-0 mt-2 w-72 clay-card p-2 z-40 animate-scaleIn">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Active Members
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                    {Math.max(onlineUsers.length, 1)} Active
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                  {onlineUsers.length > 0 ? (
                    onlineUsers.map((u, idx) => (
                      <div
                        key={u.user_id || idx}
                        className="p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={u.full_name} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                              {u.full_name} {u.user_id === user?.id && '(You)'}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 shrink-0 ml-2">
                          {u.role || 'Staff'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={user?.full_name} size="sm" />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {user?.full_name} (You)
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {user?.email}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 shrink-0 ml-2">
                        {user?.role_name || user?.role || 'Staff'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl clay-pill text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-all active:scale-95"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400 animate-fadeIn" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 animate-fadeIn" />
            )}
          </button>

          {/* Notification Center */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className="relative p-2 rounded-xl clay-pill text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-all active:scale-95"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 clay-card overflow-hidden z-40 animate-scaleIn">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 rounded-full border border-rose-200 dark:border-rose-800">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-bold"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No recent notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-start justify-between gap-3 ${
                          !n.is_read ? 'bg-brand-50/50 dark:bg-brand-950/30' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {n.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {n.message}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1">
                            {formatTime12Hour(n.created_at)}
                          </div>
                        </div>
                        {!n.is_read && (
                          <button
                            onClick={(e) => handleMarkAsRead(n.id, e)}
                            className="p-1 text-slate-400 hover:text-brand-600 transition-colors"
                            title="Mark as read"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <Link
                  to="/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="block text-center py-2.5 bg-slate-50/80 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  View All Notifications →
                </Link>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 pl-3 clay-pill transition-all active:scale-95"
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {user?.full_name || 'User'}
                </span>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold">
                  {user?.role_name || user?.role || 'Staff'}
                </span>
              </div>
              <Avatar
                src={user?.avatar_url}
                name={user?.full_name}
                size="sm"
              />
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 clay-card py-2 z-40 animate-scaleIn">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {user?.email}
                  </p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 rounded-full border border-brand-200 dark:border-brand-800">
                    {user?.role_name || user?.role}
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    View Profile
                  </Link>

                  {!isReadOnly && (
                    <Link
                      to="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4 text-slate-400" />
                      Settings
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      to="/audit-logs"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-slate-400" />
                      Audit Logs
                    </Link>
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Categorized Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
