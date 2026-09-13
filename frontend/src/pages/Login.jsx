import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const { companySettings } = useCompany();
  const navigate = useNavigate();

  const brandName = companySettings?.display_name || companySettings?.company_name || 'Enterprise CRM';
  const backendBase = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:5000';
  const logoUrl = companySettings?.logo_url ? (companySettings.logo_url.startsWith('http') ? companySettings.logo_url : `${backendBase}${companySettings.logo_url}`) : null;
  const initials = brandName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CRM';
  const description = companySettings?.description || 'Sign in to your sales management & CRM workspace';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const res = await login(email, password);
    setLoading(false);

    if (res?.success) {
      navigate('/dashboard');
    } else {
      setErrorMsg(res?.message || 'Login failed. Please check credentials.');
    }
  };

  const handleQuickLogin = (demoEmail, demoPw) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={brandName}
            className="inline-block w-14 h-14 rounded-2xl object-cover shadow-lg border border-slate-700/60 mb-3"
          />
        ) : (
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-black text-xl shadow-lg mb-3">
            {initials}
          </div>
        )}
        <h2 className="text-2xl font-bold tracking-tight text-white">
          {brandName}
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-slate-850 py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-750">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@rdcrm.com or test@crm.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-brand-600 focus:ring-0"
                />
                <span className="ml-2">Remember session</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Sign In to CRM
            </button>
          </form>

          {/* Demo Quick-Login Presets */}
          <div className="mt-6 pt-5 border-t border-slate-750">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Demo Access
            </p>
            <button
              type="button"
              onClick={() => handleQuickLogin('test@crm.com', 'ReadOnly@123')}
              className="w-full p-2.5 rounded-lg bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/60 text-left transition-colors flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-rose-300 text-xs">test@crm.com</div>
                <div className="text-[11px] text-rose-400/80">Read Only Demo Account</div>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-900/50 text-rose-200">
                Click to Fill
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
