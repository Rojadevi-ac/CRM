import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import { authApi, userApi } from '../api/crmApi';
import Avatar from '../components/common/Avatar';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';

export default function Settings() {
  const { user, updateUserProfile, isAdmin, canWrite, isReadOnly } = useAuth();
  const { toast } = useToast();
  const { subscribeToEvent, unsubscribeFromEvent } = useSocket();

  if (isReadOnly) {
    return <Navigate to="/dashboard" replace />;
  }

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'password' | 'users'

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    department: user?.department || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar Upload & Preview
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isRemoveAvatarOpen, setIsRemoveAvatarOpen] = useState(false);

  // Password Form
  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPw, setChangingPw] = useState(false);

  // Admin User Management
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

  // Sync profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        phone: user.phone || '',
        department: user.department || '',
      });
    }
  }, [user]);

  // Load users and roles if Admin
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

  // Real-time socket sync for users
  useEffect(() => {
    if (!isAdmin) return;
    const handleUpdate = () => fetchAdminUsers();
    const events = ['user_created', 'user_updated', 'user_deleted'];
    events.forEach((ev) => subscribeToEvent(ev, handleUpdate));
    return () => {
      events.forEach((ev) => unsubscribeFromEvent(ev, handleUpdate));
    };
  }, [isAdmin, fetchAdminUsers]);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await userApi.updateProfile(profileForm);
      if (res.data.success) {
        updateUserProfile(res.data.data);
        toast.success('Profile details updated');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Avatar Selection & Preview
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

  // Upload Avatar
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

  // Remove Avatar
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

  // Handle Password Change
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

  // Admin: Create or Edit User
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

  // Admin: Delete User
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

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Account & System Settings
        </h1>
        <p className="text-xs text-slate-500">Manage your profile, credentials, and organizational permissions.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'profile'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5" /> Profile & Avatar
        </button>

        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'password'
              ? 'border-brand-600 text-brand-600 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="w-3.5 h-3.5" /> Security & Password
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'users'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" /> User Management (Admin)
          </button>
        )}
      </div>

      {/* 1. PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
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
                <label className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5">
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
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" /> Save Image
                  </button>
                )}

                {user?.avatar_url && !avatarPreview && (
                  <button
                    type="button"
                    onClick={() => setIsRemoveAvatarOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Profile Details Form */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Personal Details</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PASSWORD TAB */}
      {activeTab === 'password' && (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Current Password *</label>
              <input
                type="password"
                required
                value={pwForm.current_password}
                onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={changingPw}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
              >
                {changingPw ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. ADMIN USER MANAGEMENT TAB */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">User Management</h3>
              <p className="text-xs text-slate-500">Add sales representatives, configure roles, and enable/disable accounts.</p>
            </div>
            <button
              onClick={openCreateUserModal}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Staff User
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase">
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
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <Avatar src={u.avatar_url} name={u.full_name} size="sm" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{u.full_name}</div>
                        <div className="text-slate-400">{u.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{u.role_name}</td>
                    <td className="py-3 px-4 text-slate-500">{u.department}</td>
                    <td className="py-3 px-4"><StatusBadge status={u.status} /></td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button onClick={() => openEditUserModal(u)} className="p-1 text-slate-400 hover:text-brand-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.id !== user.id && (
                        <button onClick={() => { setSelectedUser(u); setIsDeleteUserOpen(true); }} className="p-1 text-slate-400 hover:text-rose-600">
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Role *</label>
              <select
                value={userFormData.role_id}
                onChange={(e) => setUserFormData({ ...userFormData, role_id: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
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
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Department</label>
              <input
                type="text"
                value={userFormData.department}
                onChange={(e) => setUserFormData({ ...userFormData, department: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t">
            <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-3 py-1.5 text-xs">Cancel</button>
            <button type="submit" disabled={submittingUser} className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg">Save</button>
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
