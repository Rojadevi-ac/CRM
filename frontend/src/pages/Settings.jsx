import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Lock,
  Camera,
  Trash2,
  Upload,
  Shield,
  UserPlus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Palette,
  Building,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Sliders,
  Layers,
  MapPin,
  Globe,
  FileText,
  Mail,
  Phone,
  DollarSign,
  Clock,
  Calendar,
  Eye,
  Info,
  TrendingUp,
  Handshake,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { useTheme, THEME_TEMPLATES, ACCENT_PRESETS } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';
import { authApi, userApi } from '../api/crmApi';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';

export default function Settings() {
  const { user, updateUserProfile, isAdmin, canWrite, isReadOnly } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();
  const {
    themeMode,
    setThemeMode,
    themeTemplate,
    setThemeTemplate,
    accentColor,
    setAccentColor,
    sidebarBehavior,
    setSidebarBehavior,
    uiDensity,
    setUiDensity,
    borderRadius,
    setBorderRadius,
    customTheme,
    setCustomTheme,
    savePreferences,
    isDark,
  } = useTheme();

  const { companySettings, updateCompanySettings, uploadLogo, removeLogo } = useCompany();

  if (isReadOnly) {
    return <Navigate to="/dashboard" replace />;
  }

  // Active Main Tab
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'appearance' | 'company' | 'users'

  // -------------------------------------------------------------
  // 1. PROFILE & PASSWORD STATE
  // -------------------------------------------------------------
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isRemoveAvatarOpen, setIsRemoveAvatarOpen] = useState(false);

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        department: user.department || '',
      });
    }
  }, [user]);

  // -------------------------------------------------------------
  // 2. THEME SAVING STATE
  // -------------------------------------------------------------
  const [savingTheme, setSavingTheme] = useState(false);

  const handleSaveThemePreferences = async () => {
    setSavingTheme(true);
    try {
      const res = await savePreferences({
        themeMode,
        themeTemplate,
        accentColor,
        sidebarBehavior,
        uiDensity,
        borderRadius,
        customTheme,
      });
      if (res && res.success) {
        toast.success('Theme preferences saved and applied across CRM!');
      } else {
        toast.error(res?.message || 'Failed to save theme preferences to server');
      }
    } catch (err) {
      toast.error('Error saving theme settings');
    } finally {
      setSavingTheme(false);
    }
  };

  const handleResetThemeToDefault = () => {
    setThemeMode('system');
    setThemeTemplate('classic-blue');
    setAccentColor('#2563eb');
    setSidebarBehavior('expanded');
    setUiDensity('comfortable');
    setBorderRadius('medium');
    toast.info('Theme reset to Classic Blue defaults');
  };

  // -------------------------------------------------------------
  // 3. COMPANY SETTINGS STATE (ADMIN ONLY)
  // -------------------------------------------------------------
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    legal_name: '',
    display_name: '',
    email: '',
    phone: '',
    alternate_phone: '',
    website: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    country: 'United States',
    postal_code: '',
    tax_number: '',
    registration_number: '',
    currency: 'USD',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    contact_person: '',
    description: '',
  });

  const [initialCompanyData, setInitialCompanyData] = useState(null);
  const [savingCompany, setSavingCompany] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isRemoveLogoOpen, setIsRemoveLogoOpen] = useState(false);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (companySettings) {
      const data = {
        company_name: companySettings.company_name || '',
        legal_name: companySettings.legal_name || '',
        display_name: companySettings.display_name || '',
        email: companySettings.email || '',
        phone: companySettings.phone || '',
        alternate_phone: companySettings.alternate_phone || '',
        website: companySettings.website || '',
        address_line_1: companySettings.address_line_1 || '',
        address_line_2: companySettings.address_line_2 || '',
        city: companySettings.city || '',
        state: companySettings.state || '',
        country: companySettings.country || 'United States',
        postal_code: companySettings.postal_code || '',
        tax_number: companySettings.tax_number || '',
        registration_number: companySettings.registration_number || '',
        currency: companySettings.currency || 'USD',
        timezone: companySettings.timezone || 'UTC',
        date_format: companySettings.date_format || 'MM/DD/YYYY',
        contact_person: companySettings.contact_person || '',
        description: companySettings.description || '',
      };
      setCompanyForm(data);
      setInitialCompanyData(data);
    }
  }, [companySettings]);

  // -------------------------------------------------------------
  // 4. ADMIN USER MANAGEMENT STATE
  // -------------------------------------------------------------
  const [userList, setUserList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role_id: 3,
    phone: '',
    department: 'Sales',
    status: 'active',
  });
  const [submittingUser, setSubmittingUser] = useState(false);

  const fetchAdminUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const [uRes, rRes] = await Promise.all([userApi.getUsers(), userApi.getRoles()]);
      if (uRes.data.success) setUserList(uRes.data.data || []);
      if (rRes.data.success) setRoles(rRes.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminUsers();
    }
  }, [isAdmin, fetchAdminUsers]);

  // Real-time socket updates for users
  useEffect(() => {
    if (!isAdmin) return;
    const handleUpdate = () => fetchAdminUsers();
    const events = ['user_created', 'user_updated', 'user_deleted'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));
    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
    };
  }, [isAdmin, fetchAdminUsers, subscribeToEvent, unsubscribeFromEvent]);

  // -------------------------------------------------------------
  // PROFILE HANDLERS
  // -------------------------------------------------------------
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await userApi.updateProfile(profileForm);
      if (res.data.success) {
        updateUserProfile(res.data.data);
        toast.success('Profile details updated successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be under 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', avatarFile);
    try {
      const res = await userApi.uploadAvatar(formData);
      if (res.data.success) {
        updateUserProfile({ ...user, avatar_url: res.data.data.avatar_url });
        toast.success('Profile picture updated');
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await userApi.removeAvatar();
      updateUserProfile({ ...user, avatar_url: null });
      toast.success('Profile picture removed');
      setIsRemoveAvatarOpen(false);
    } catch (err) {
      toast.error('Failed to remove avatar');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      const res = await authApi.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      if (res.data.success) {
        toast.success('Password changed successfully');
        setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  // -------------------------------------------------------------
  // COMPANY SETTINGS HANDLERS (ADMIN ONLY)
  // -------------------------------------------------------------
  const handleSaveCompanySettings = async (e) => {
    e.preventDefault();
    if (!companyForm.company_name.trim()) {
      toast.error('Company Name is required');
      return;
    }
    setSavingCompany(true);
    try {
      const result = await updateCompanySettings(companyForm);
      if (result.success) {
        toast.success('Organization settings saved successfully');
        setInitialCompanyData({ ...companyForm });
      } else {
        toast.error(result.message || 'Failed to save company settings');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update company settings');
    } finally {
      setSavingCompany(false);
    }
  };

  const handleResetCompanyForm = () => {
    if (initialCompanyData) {
      setCompanyForm({ ...initialCompanyData });
      toast.info('Form reset to saved configuration');
    }
  };

  const handleLogoFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
      if (!allowed.includes(file.type)) {
        toast.error('Invalid format. Supported: PNG, JPG, JPEG, WEBP, SVG');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo file size must be under 5MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadCompanyLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', logoFile);
    try {
      const res = await uploadLogo(formData);
      if (res.success) {
        toast.success('Company logo updated successfully');
        setLogoFile(null);
        setLogoPreview(null);
      } else {
        toast.error(res.message || 'Failed to upload company logo');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error uploading company logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveCompanyLogo = async () => {
    try {
      const res = await removeLogo();
      if (res.success) {
        toast.success('Company logo removed');
        setIsRemoveLogoOpen(false);
        setLogoFile(null);
        setLogoPreview(null);
      } else {
        toast.error(res.message || 'Failed to remove logo');
      }
    } catch (err) {
      toast.error('Failed to remove company logo');
    }
  };

  // -------------------------------------------------------------
  // USER MANAGEMENT HANDLERS (ADMIN ONLY)
  // -------------------------------------------------------------
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      if (selectedUser) {
        await userApi.updateUser(selectedUser.id, userFormData);
        toast.success('User updated successfully');
      } else {
        await userApi.createUser(userFormData);
        toast.success('User created successfully');
      }
      setIsUserModalOpen(false);
      fetchAdminUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save user');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await userApi.deleteUser(selectedUser.id);
      toast.success('User removed');
      setIsDeleteUserOpen(false);
      fetchAdminUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const openCreateUserModal = () => {
    setSelectedUser(null);
    setUserFormData({
      full_name: '',
      email: '',
      password: 'Crm@123',
      role_id: roles[2]?.id || 3,
      phone: '',
      department: 'Sales',
      status: 'active',
    });
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (u) => {
    setSelectedUser(u);
    setUserFormData({
      full_name: u.full_name,
      email: u.email,
      password: '',
      role_id: u.role_id,
      phone: u.phone || '',
      department: u.department || 'Sales',
      status: u.status,
    });
    setIsUserModalOpen(true);
  };

  const hasUnsavedCompanyChanges =
    initialCompanyData &&
    JSON.stringify(companyForm) !== JSON.stringify(initialCompanyData);

  const currentTpl = THEME_TEMPLATES.find((t) => t.id === themeTemplate) || THEME_TEMPLATES[0];

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-500" /> Account & System Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure personal credentials, appearance & themes, organization CMS, and user permissions.
        </p>
      </div>

      {/* Main Tab Navigation */}
      <div className="saas-card p-1.5 flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'profile'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Profile & Security
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'appearance'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Palette className="w-3.5 h-3.5" /> Appearance & Theme
        </button>

        {/* Company Settings - Strict Admin Only */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'company'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" /> Company Settings
            <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-md">
              Admin
            </span>
          </button>
        )}

        {/* User Management - Strict Admin Only */}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'users'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> User Management
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. PROFILE & SECURITY TAB */}
      {/* ========================================================= */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="saas-card p-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <Avatar
                src={avatarPreview || user?.avatar_url}
                name={user?.full_name}
                size="2xl"
              />
            </div>

            <div className="space-y-3 text-center sm:text-left flex-1">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Profile Picture</h3>
                <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, or WEBP up to 5MB.</p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <label className="saas-btn-primary cursor-pointer flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Select Image
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                </label>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleUploadAvatar}
                    disabled={uploadingAvatar}
                    className="saas-btn-primary flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" /> Save Image
                  </button>
                )}

                {user?.avatar_url && !avatarPreview && (
                  <button
                    type="button"
                    onClick={() => setIsRemoveAvatarOpen(true)}
                    className="saas-btn-secondary text-rose-600 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Personal Details Form */}
          <div className="saas-card p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Personal Details</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full saas-input text-slate-400 opacity-60 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    className="w-full saas-input"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="saas-btn-primary px-6"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingProfile ? 'Saving...' : 'Save Profile Details'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Password Security Form */}
          <div className="saas-card p-6 max-w-xl">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Current Password *</label>
                <input
                  type="password"
                  required
                  value={pwForm.current_password}
                  onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  className="w-full saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwForm.new_password}
                  onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  className="w-full saas-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={pwForm.confirm_password}
                  onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                  className="w-full saas-input"
                />
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={changingPw}
                  className="saas-btn-primary px-6"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{changingPw ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. APPEARANCE & THEME PERSONALIZATION TAB */}
      {/* ========================================================= */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* A. LIVE INTERACTIVE COMPONENT PREVIEW */}
          <div className="saas-card p-6 border-2 border-brand-500/40 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-500 text-white shadow-sm">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Live Interface & Component Preview
                    <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/90 dark:text-emerald-300 rounded-full">
                      Real-Time Active
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Template: <span className="font-bold text-brand-600 dark:text-brand-400">{currentTpl.name}</span> | Accent: <span className="font-mono">{accentColor}</span> | Mode: <span className="uppercase">{themeMode}</span>
                  </p>
                </div>
              </div>

              {/* Quick mode switcher in preview */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setThemeMode('light')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    !isDark ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Switch preview to Light Mode"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode('dark')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                    isDark ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Switch preview to Dark Mode"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Live Interactive Elements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Preview 1: Actions & Inputs */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 space-y-3">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Buttons & Forms</div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="saas-btn-primary">
                    <Sparkles className="w-3.5 h-3.5" /> Primary Action
                  </button>
                  <button type="button" className="saas-btn-secondary">
                    Secondary
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Interactive input with theme ring..."
                  defaultValue="Sales Pipeline Active"
                  className="saas-input w-full"
                />
              </div>

              {/* Preview 2: Mini Kanban Card */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kanban Surface Card</div>
                <div className="saas-card p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200/60 dark:border-brand-800">
                      Proposal Stage
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">$48,500</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    Global Cloud Expansion
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><Handshake className="w-3 h-3 text-brand-500" /> Enterprise</span>
                    <span>90% prob</span>
                  </div>
                </div>
              </div>

              {/* Preview 3: Metrics & Chips */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#0c1220] border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Live Metrics Tile</div>
                <div className="saas-card p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Quarterly Velocity</div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">$384,200</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/90 dark:text-brand-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="saas-pill text-[10px]">Active Lead</span>
                  <span className="saas-pill text-[10px] bg-brand-50/80 text-brand-700 dark:bg-brand-950/90 dark:text-brand-300 border-brand-300/60 dark:border-brand-800">
                    High Priority
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* B. Appearance Mode */}
          <div className="saas-card p-6">
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-4 h-4 text-brand-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Appearance Mode</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select your preferred color scheme across all CRM modules.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light Mode', desc: 'Clean studio canvas', icon: Sun },
                { id: 'dark', label: 'Dark Mode', desc: 'Obsidian high-contrast surfaces', icon: Moon },
                { id: 'system', label: 'System Default', desc: 'Syncs with operating system', icon: Monitor },
              ].map((mode) => {
                const Icon = mode.icon;
                const isSelected = themeMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setThemeMode(mode.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#101726]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-brand-500" />}
                    </div>
                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{mode.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{mode.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* C. Predefined Theme Templates */}
          <div className="saas-card p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Theme Templates</h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">8 Curated Systems</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Switch visual themes instantly. Changes apply across cards, buttons, badges, tables, and navigation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {THEME_TEMPLATES.map((tpl) => {
                const isSelected = themeTemplate === tpl.id;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setThemeTemplate(tpl.id);
                      setAccentColor(tpl.primary);
                    }}
                    className={`relative p-3.5 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-500/30 bg-slate-50/80 dark:bg-slate-800/40 shadow-sm'
                        : 'border-slate-200/90 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#101726]'
                    }`}
                  >
                    {/* Visual Color Preview Swatch */}
                    <div className="h-14 rounded-xl overflow-hidden mb-3 border border-slate-200/60 dark:border-slate-700/60 relative flex flex-col justify-between p-2"
                         style={{ background: isDark ? tpl.darkBg : tpl.lightBg }}>
                      <div className="flex items-center justify-between">
                        <div className="w-3.5 h-3.5 rounded-full shadow-xs" style={{ backgroundColor: tpl.primary }} />
                        <div className="w-6 h-1.5 rounded-full" style={{ backgroundColor: tpl.secondary }} />
                      </div>
                      <div className="w-full h-3 rounded-md border"
                           style={{
                             backgroundColor: isDark ? tpl.darkCard : '#ffffff',
                             borderColor: isDark ? tpl.darkBorder : '#e2e8f0',
                           }}>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{tpl.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{tpl.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* D. Accent Colors & Custom Theme */}
          <div className="saas-card p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Accent Color</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Customize primary actions, badges, active tabs, and focus rings.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                {ACCENT_PRESETS.map((preset) => {
                  const isSelected = accentColor === preset.value && themeTemplate !== 'custom';
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setAccentColor(preset.value);
                        if (themeTemplate === 'custom') setThemeTemplate('classic-blue');
                      }}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-brand-500 bg-slate-50 dark:bg-slate-800/80 ring-1 ring-brand-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: preset.value }} />
                      <span className="text-slate-800 dark:text-slate-200">{preset.name}</span>
                    </button>
                  );
                })}

                {/* Custom Color Picker Input */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101726]">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => {
                      setAccentColor(e.target.value);
                      if (themeTemplate === 'custom') setThemeTemplate('classic-blue');
                    }}
                    className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent"
                    title="Choose custom color"
                  />
                  <span className="text-xs font-mono uppercase text-slate-600 dark:text-slate-300">{accentColor}</span>
                </div>
              </div>
            </div>

            {/* Custom Theme Palette Configuration */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Advanced Custom Theme Builder</h4>
                  <p className="text-[11px] text-slate-400">Define precise hexadecimal colors for surfaces, canvas, and borders.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setThemeTemplate(themeTemplate === 'custom' ? 'classic-blue' : 'custom')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    themeTemplate === 'custom'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'saas-btn-secondary'
                  }`}
                >
                  {themeTemplate === 'custom' ? 'Custom Theme Active' : 'Enable Custom Theme'}
                </button>
              </div>

              {themeTemplate === 'custom' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customTheme.primary || '#2563eb'}
                        onChange={(e) => setCustomTheme({ ...customTheme, primary: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={customTheme.primary || '#2563eb'}
                        onChange={(e) => setCustomTheme({ ...customTheme, primary: e.target.value })}
                        className="w-full saas-input text-[11px] font-mono py-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Secondary Gradient</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customTheme.secondary || '#4f46e5'}
                        onChange={(e) => setCustomTheme({ ...customTheme, secondary: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={customTheme.secondary || '#4f46e5'}
                        onChange={(e) => setCustomTheme({ ...customTheme, secondary: e.target.value })}
                        className="w-full saas-input text-[11px] font-mono py-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Surface Card BG</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customTheme.surface || '#101726'}
                        onChange={(e) => setCustomTheme({ ...customTheme, surface: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={customTheme.surface || '#101726'}
                        onChange={(e) => setCustomTheme({ ...customTheme, surface: e.target.value })}
                        className="w-full saas-input text-[11px] font-mono py-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Card Border</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customTheme.border || '#1e293b'}
                        onChange={(e) => setCustomTheme({ ...customTheme, border: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                      <input
                        type="text"
                        value={customTheme.border || '#1e293b'}
                        onChange={(e) => setCustomTheme({ ...customTheme, border: e.target.value })}
                        className="w-full saas-input text-[11px] font-mono py-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* E. Interface Density, Border Radius & Sidebar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* UI Density */}
            <div className="saas-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">UI Density</h4>
              </div>
              <p className="text-[11px] text-slate-400">Controls data spacing in tables & cards.</p>
              <div className="space-y-2">
                {[
                  { id: 'comfortable', label: 'Comfortable', desc: 'Spacious padding (Default)' },
                  { id: 'compact', label: 'Compact', desc: 'Higher information density' },
                ].map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setUiDensity(d.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      uiDensity === d.id
                        ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/40 font-bold text-brand-600 dark:text-brand-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div>{d.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{d.desc}</div>
                    </div>
                    {uiDensity === d.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div className="saas-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Border Radius</h4>
              </div>
              <p className="text-[11px] text-slate-400">Corner rounding across all interface cards.</p>
              <div className="space-y-2">
                {[
                  { id: 'sharp', label: 'Sharp (6px)', radius: 'rounded-md' },
                  { id: 'medium', label: 'Medium (18px)', radius: 'rounded-xl' },
                  { id: 'rounded', label: 'Ultra Rounded (28px)', radius: 'rounded-3xl' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setBorderRadius(r.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      borderRadius === r.id
                        ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/40 font-bold text-brand-600 dark:text-brand-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 border border-brand-500 ${r.radius}`} />
                      <span>{r.label}</span>
                    </div>
                    {borderRadius === r.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Sidebar Behavior */}
            <div className="saas-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-brand-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Sidebar Mode</h4>
              </div>
              <p className="text-[11px] text-slate-400">Default navigation layout behavior.</p>
              <div className="space-y-2">
                {[
                  { id: 'expanded', label: 'Expanded Full', desc: 'Standard sidebar layout' },
                  { id: 'collapsed', label: 'Compact Mini', desc: 'Icon-only slim navigation' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSidebarBehavior(s.id)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                      sidebarBehavior === s.id
                        ? 'border-brand-500 bg-brand-50/40 dark:bg-brand-950/40 font-bold text-brand-600 dark:text-brand-400'
                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div>{s.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{s.desc}</div>
                    </div>
                    {sidebarBehavior === s.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky Theme Bottom Action Bar */}
          <div className="saas-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20 shadow-md">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-bold">
                <Sparkles className="w-4 h-4" /> Active: {currentTpl.name} ({themeMode.toUpperCase()})
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleResetThemeToDefault}
                className="saas-btn-secondary"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Default
              </button>

              <button
                type="button"
                onClick={handleSaveThemePreferences}
                disabled={savingTheme}
                className="saas-btn-primary px-6 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingTheme ? 'Saving Theme...' : 'Save Theme Preferences'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. COMPANY SETTINGS TAB (STRICT ADMIN ONLY) */}
      {/* ========================================================= */}
      {activeTab === 'company' && isAdmin && (
        <div className="space-y-6">
          {/* Logo Upload Card */}
          <div className="saas-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-brand-500" /> Organization Logo & Branding
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Uploaded logo dynamically appears in the sidebar header, printable reports, and application navigation.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pt-2">
              {/* Logo Preview Container */}
              <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-[#151f33] border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative">
                {(() => {
                  const backendBase = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:5000';
                  const activeLogo = logoPreview || (companySettings?.logo_url ? (companySettings.logo_url.startsWith('http') ? companySettings.logo_url : `${backendBase}${companySettings.logo_url}`) : null);
                  return activeLogo ? (
                    <img
                      src={activeLogo}
                      alt="Company Logo Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                      <Building className="w-8 h-8 mb-1 opacity-60" />
                      <span className="text-[9px] font-bold uppercase">No Logo</span>
                    </div>
                  );
                })()}
              </div>

              {/* Controls */}
              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {companySettings?.logo_url ? 'Active Brand Logo' : 'Default Organization Placeholder'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Supports PNG, JPG, JPEG, WEBP, and SVG formats up to 5MB.
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <label className="saas-btn-primary cursor-pointer flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{companySettings?.logo_url ? 'Replace Logo' : 'Select Logo'}</span>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      className="hidden"
                      onChange={handleLogoFileSelect}
                    />
                  </label>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleUploadCompanyLogo}
                      disabled={uploadingLogo}
                      className="saas-btn-primary flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingLogo ? 'Uploading...' : 'Save Uploaded Logo'}</span>
                    </button>
                  )}

                  {companySettings?.logo_url && !logoPreview && (
                    <button
                      type="button"
                      onClick={() => setIsRemoveLogoOpen(true)}
                      className="saas-btn-secondary text-rose-600 flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Company Details Form */}
          <form onSubmit={handleSaveCompanySettings} className="space-y-6">
            {/* 1. Identity & Legal Information */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Building className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Company Identity & Registration</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.company_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                    placeholder="e.g. Acme Corporation Inc."
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Display / Brand Name</label>
                  <input
                    type="text"
                    value={companyForm.display_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, display_name: e.target.value })}
                    placeholder="e.g. Acme CRM"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Legal Registered Name</label>
                  <input
                    type="text"
                    value={companyForm.legal_name}
                    onChange={(e) => setCompanyForm({ ...companyForm, legal_name: e.target.value })}
                    placeholder="e.g. Acme Technologies LLC"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Tax / VAT / GST Number</label>
                  <input
                    type="text"
                    value={companyForm.tax_number}
                    onChange={(e) => setCompanyForm({ ...companyForm, tax_number: e.target.value })}
                    placeholder="e.g. US-EIN-987654321"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Registration / CIN Number</label>
                  <input
                    type="text"
                    value={companyForm.registration_number}
                    onChange={(e) => setCompanyForm({ ...companyForm, registration_number: e.target.value })}
                    placeholder="e.g. REG-2024-8849"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Official Website</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={companyForm.website}
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full saas-input pl-8"
                    />
                    <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Organization Description</label>
                <textarea
                  rows={2}
                  value={companyForm.description}
                  onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
                  placeholder="Summary of enterprise operations, mission, and scope..."
                  className="w-full saas-input resize-none"
                />
              </div>
            </div>

            {/* 2. Contact Information */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Mail className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Contact Details</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Company Email</label>
                  <input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Primary Phone</label>
                  <input
                    type="tel"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    placeholder="+1 (555) 019-2834"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Alternate Phone</label>
                  <input
                    type="tel"
                    value={companyForm.alternate_phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, alternate_phone: e.target.value })}
                    placeholder="+1 (555) 019-5821"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Primary Contact Person</label>
                  <input
                    type="text"
                    value={companyForm.contact_person}
                    onChange={(e) => setCompanyForm({ ...companyForm, contact_person: e.target.value })}
                    placeholder="e.g. Chief Revenue Officer"
                    className="w-full saas-input"
                  />
                </div>
              </div>
            </div>

            {/* 3. Address Details */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <MapPin className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Physical Address</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={companyForm.address_line_1}
                    onChange={(e) => setCompanyForm({ ...companyForm, address_line_1: e.target.value })}
                    placeholder="Street Address, PO Box"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Address Line 2</label>
                  <input
                    type="text"
                    value={companyForm.address_line_2}
                    onChange={(e) => setCompanyForm({ ...companyForm, address_line_2: e.target.value })}
                    placeholder="Suite, Building, Floor"
                    className="w-full saas-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    placeholder="City"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">State / Province</label>
                  <input
                    type="text"
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                    placeholder="State"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Country</label>
                  <input
                    type="text"
                    value={companyForm.country}
                    onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                    placeholder="Country"
                    className="w-full saas-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Postal / ZIP Code</label>
                  <input
                    type="text"
                    value={companyForm.postal_code}
                    onChange={(e) => setCompanyForm({ ...companyForm, postal_code: e.target.value })}
                    placeholder="ZIP Code"
                    className="w-full saas-input"
                  />
                </div>
              </div>
            </div>

            {/* 4. Regional & Localization Settings */}
            <div className="saas-card p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <DollarSign className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Regional & Financial Settings</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Primary Currency</label>
                  <select
                    value={companyForm.currency}
                    onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                    className="w-full saas-input"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="SGD">SGD ($) - Singapore Dollar</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Time Zone</label>
                  <select
                    value={companyForm.timezone}
                    onChange={(e) => setCompanyForm({ ...companyForm, timezone: e.target.value })}
                    className="w-full saas-input"
                  >
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Chicago">America/Chicago (CST/CDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Date Display Format</label>
                  <select
                    value={companyForm.date_format}
                    onChange={(e) => setCompanyForm({ ...companyForm, date_format: e.target.value })}
                    className="w-full saas-input"
                  >
                    <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 09/25/2026)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 25/09/2026)</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-09-25)</option>
                    <option value="MMM DD, YYYY">MMM DD, YYYY (e.g. Sep 25, 2026)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div className="saas-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20 shadow-md">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {hasUnsavedCompanyChanges ? (
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                    <Info className="w-4 h-4" /> You have unsaved company changes
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Configuration up to date
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetCompanyForm}
                  disabled={!hasUnsavedCompanyChanges || savingCompany}
                  className="saas-btn-secondary disabled:opacity-40"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset
                </button>

                <button
                  type="submit"
                  disabled={savingCompany}
                  className="saas-btn-primary px-6 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingCompany ? 'Saving Changes...' : 'Save Organization Settings'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. USER MANAGEMENT TAB (ADMIN ONLY) */}
      {/* ========================================================= */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">User Management</h3>
              <p className="text-xs text-slate-500">Add sales representatives, configure roles, and enable/disable accounts.</p>
            </div>
            <button
              onClick={openCreateUserModal}
              className="saas-btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Add Staff User
            </button>
          </div>

          <div className="saas-card overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#0c1220] border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {userList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{u.full_name}</div>
                        <div className="text-slate-400 text-[11px]">{u.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{u.role_name}</td>
                    <td className="py-3 px-4 text-slate-500">{u.department}</td>
                    <td className="py-3 px-4"><StatusBadge status={u.status} /></td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => openEditUserModal(u)} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.id !== user.id && (
                        <button onClick={() => { setSelectedUser(u); setIsDeleteUserOpen(true); }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Add/Edit User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={selectedUser ? 'Edit User' : 'Create User'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={userFormData.full_name}
                onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                className="w-full saas-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full saas-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Role *</label>
              <select
                value={userFormData.role_id}
                onChange={(e) => setUserFormData({ ...userFormData, role_id: parseInt(e.target.value) })}
                className="w-full saas-input"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Account Status</label>
              <select
                value={userFormData.status}
                onChange={(e) => setUserFormData({ ...userFormData, status: e.target.value })}
                className="w-full saas-input"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                {selectedUser ? 'New Password (Leave blank to keep current)' : 'Password *'}
              </label>
              <input
                type="password"
                required={!selectedUser}
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                className="w-full saas-input"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Department</label>
              <input
                type="text"
                value={userFormData.department}
                onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                className="w-full saas-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsUserModalOpen(false)} className="saas-btn-secondary">Cancel</button>
            <button type="submit" disabled={submittingUser} className="saas-btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      {/* Remove Avatar Dialog */}
      <ConfirmDialog
        isOpen={isRemoveAvatarOpen}
        onClose={() => setIsRemoveAvatarOpen(false)}
        onConfirm={handleRemoveAvatar}
        title="Remove Profile Picture"
        message="Are you sure you want to remove your profile picture?"
        confirmText="Remove"
      />

      {/* Remove Company Logo Dialog */}
      <ConfirmDialog
        isOpen={isRemoveLogoOpen}
        onClose={() => setIsRemoveLogoOpen(false)}
        onConfirm={handleRemoveCompanyLogo}
        title="Remove Company Logo"
        message="Are you sure you want to remove the organization logo? The default initials placeholder will be restored."
        confirmText="Remove Logo"
      />

      {/* Delete User Dialog */}
      <ConfirmDialog
        isOpen={isDeleteUserOpen}
        onClose={() => setIsDeleteUserOpen(false)}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Delete user account "${selectedUser?.full_name}"?`}
        confirmText="Delete"
      />
    </div>
  );
}
