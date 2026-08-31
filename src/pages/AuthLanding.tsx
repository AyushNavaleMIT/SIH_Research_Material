import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Building2, 
  ArrowRight, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { UserRole, OrganisationType } from '../types';

interface AuthLandingProps {
  onAuthenticated: () => void;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onAuthenticated }) => {
  const { login, register, setUserTypeGuest } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [selectedRole, setSelectedRole] = useState<UserRole>('INDIVIDUAL');
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [showModal, setShowModal] = useState<boolean>(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [orgType, setOrgType] = useState<OrganisationType>('BANK');
  const [authorizedPerson, setAuthorizedPerson] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAuthModal = (role: UserRole, mode: 'LOGIN' | 'REGISTER') => {
    setSelectedRole(role);
    setAuthMode(mode);
    setErrorMsg(null);
    setShowModal(true);
  };

  const handleQuickDemoLogin = async (role: UserRole) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (role === 'INDIVIDUAL') {
        await login('user@sentinel.ai', 'DemoUser@123');
      } else {
        await login('bank@sentinel.ai', 'DemoBank@123');
      }
      setShowModal(false);
      onAuthenticated();
    } catch (err: any) {
      // Fallback to offline guest mode if backend is not yet reachable
      setUserTypeGuest(role);
      setShowModal(false);
      onAuthenticated();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (authMode === 'LOGIN') {
        await login(email, password);
      } else {
        const payload: any = {
          email,
          password,
          role: selectedRole,
        };
        if (selectedRole === 'INDIVIDUAL') {
          payload.full_name = fullName || 'Applicant Subject';
        } else {
          payload.org_name = orgName || 'Authorized Institution';
          payload.org_id = orgId || `ORG-${Math.floor(1000 + Math.random() * 9000)}`;
          payload.org_type = orgType;
          payload.authorized_person = authorizedPerson || 'Compliance Examiner';
        }
        await register(payload);
      }
      setShowModal(false);
      onAuthenticated();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      {/* Top Banner */}
      <div className="max-w-3xl w-full text-center space-y-3 mb-8">
        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border ${
          isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <ShieldCheck className="w-4 h-4" />
          <span>AI Forensic Identity Screening &amp; Verification Platform</span>
        </div>
        <h1 className={`text-3xl md:text-4xl font-bold tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
          Secure Identity Verification Portal
        </h1>
        <p className={`text-sm md:text-base max-w-2xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Multi-signal document forensics, mathematical check digits, real-time MediaPipe liveness detection, and 1:1 facial biometric matching.
        </p>
      </div>

      {/* Two Entry Pathway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {/* Pathway 1: INDIVIDUAL */}
        <div className={`p-7 rounded-2xl border shadow-lg transition-all flex flex-col justify-between space-y-6 ${
          isDark 
            ? 'border-slate-800 bg-slate-900/90 hover:border-blue-500/40' 
            : 'border-slate-200 bg-white hover:border-blue-300 shadow-slate-100'
        }`}>
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              isDark ? 'bg-blue-500/15 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <User className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">
                Self-Service Verification
              </span>
              <h2 className={`text-xl font-bold mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Individual Account</h2>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Verify your own identity document (Aadhaar, e-Aadhaar, PAN, Passport), complete live selfie liveness checks, and obtain an official verification audit report.
              </p>
            </div>

            <div className={`space-y-2 pt-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Single-subject identity screening</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Personal verification certificate &amp; audit history</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Strict data privacy &amp; encrypted SHA-256 evidence</span>
              </div>
            </div>
          </div>

          <div className={`space-y-2 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => openAuthModal('INDIVIDUAL', 'LOGIN')}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <span>Login as Individual</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <button
                type="button"
                onClick={() => openAuthModal('INDIVIDUAL', 'REGISTER')}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
              >
                Create Individual Account
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('INDIVIDUAL')}
                className={`cursor-pointer font-mono text-[11px] ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Demo Quick Login
              </button>
            </div>
          </div>
        </div>

        {/* Pathway 2: ORGANISATION */}
        <div className={`p-7 rounded-2xl border shadow-lg transition-all flex flex-col justify-between space-y-6 ${
          isDark 
            ? 'border-slate-800 bg-slate-900/90 hover:border-emerald-500/40' 
            : 'border-slate-200 bg-white hover:border-emerald-300 shadow-slate-100'
        }`}>
          <div className="space-y-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
              isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
            }`}>
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                Enterprise &amp; Institutions
              </span>
              <h2 className={`text-xl font-bold mt-0.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>Organisation Portal</h2>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                For banks, healthcare providers, educational institutions, corporations, and authorized compliance desks conducting applicant KYC &amp; document screening.
              </p>
            </div>

            <div className={`space-y-2 pt-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Multi-tenant audit history &amp; screening dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Compliance case dossiers &amp; Cybercrime reporting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Strict tenant data isolation &amp; RBAC protection</span>
              </div>
            </div>
          </div>

          <div className={`space-y-2 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <button
              type="button"
              onClick={() => openAuthModal('ORGANISATION', 'LOGIN')}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
            >
              <span>Login as Organisation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <button
                type="button"
                onClick={() => openAuthModal('ORGANISATION', 'REGISTER')}
                className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
              >
                Register New Institution
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('ORGANISATION')}
                className={`cursor-pointer font-mono text-[11px] ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Demo Bank Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Regulatory & Authentication Disclaimer */}
      <div className={`max-w-3xl w-full text-center mt-10 p-4 rounded-xl border text-[11px] space-y-1 ${
        isDark ? 'border-slate-800/80 bg-slate-900/40 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
      }`}>
        <div className={`font-semibold flex items-center justify-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
          <Lock className="w-3.5 h-3.5 text-blue-500" />
          <span>Statutory Compliance &amp; Authentication Scope Disclaimer</span>
        </div>
        <p>
          Sentinel AI performs forensic document integrity screening, mathematical check digit validation, and biometric liveness analysis. Account registration on this platform does not constitute sovereign UIDAI/Income Tax direct statutory certification.
        </p>
      </div>

      {/* Auth Modal (Login / Sign Up) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className={`border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 my-8 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  selectedRole === 'INDIVIDUAL' 
                    ? isDark ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-50 text-blue-600'
                    : isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {selectedRole === 'INDIVIDUAL' ? <User className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {authMode === 'LOGIN' ? 'Sign In' : 'Create Account'} ({selectedRole === 'INDIVIDUAL' ? 'Individual' : 'Organisation'})
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {selectedRole === 'INDIVIDUAL' ? 'Personal identity screening portal' : 'Authorized institutional screening access'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`text-xs px-2 py-1 rounded-md cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200 bg-slate-800' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Role Switcher Tabs inside Modal */}
            <div className={`grid grid-cols-2 gap-2 p-1 rounded-xl border text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setSelectedRole('INDIVIDUAL')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  selectedRole === 'INDIVIDUAL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole('ORGANISATION')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  selectedRole === 'ORGANISATION'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Organisation
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                isDark ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {authMode === 'REGISTER' && selectedRole === 'INDIVIDUAL' && (
                <div>
                  <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className={`w-full p-2.5 rounded-lg border focus:border-blue-500 focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              )}

              {authMode === 'REGISTER' && selectedRole === 'ORGANISATION' && (
                <>
                  <div>
                    <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Organisation / Company Name</label>
                    <input
                      type="text"
                      required
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. HDFC Bank, Max Healthcare, TechCorp"
                      className={`w-full p-2.5 rounded-lg border focus:border-emerald-500 focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Institution Type</label>
                      <select
                        value={orgType}
                        onChange={(e) => setOrgType(e.target.value as OrganisationType)}
                        className={`w-full p-2.5 rounded-lg border focus:border-emerald-500 focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="BANK">Bank / Financial</option>
                        <option value="HOSPITAL">Hospital / Healthcare</option>
                        <option value="COMPANY">Corporate / Enterprise</option>
                        <option value="EDUCATIONAL">Educational Institution</option>
                        <option value="AUTHORIZED_AGENCY">Authorized Agency</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Org Reference ID</label>
                      <input
                        type="text"
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        placeholder="e.g. ORG-9921"
                        className={`w-full p-2.5 rounded-lg border focus:border-emerald-500 focus:outline-none ${
                          isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Authorized Officer Name</label>
                    <input
                      type="text"
                      required
                      value={authorizedPerson}
                      onChange={(e) => setAuthorizedPerson(e.target.value)}
                      placeholder="e.g. Compliance Officer, KYC Examiner"
                      className={`w-full p-2.5 rounded-lg border focus:border-emerald-500 focus:outline-none ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </>
              )}

              <div>
                <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {selectedRole === 'ORGANISATION' ? 'Work Email Address' : 'Email Address'}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className={`w-full p-2.5 rounded-lg border focus:border-blue-500 focus:outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 6 characters)"
                    className={`w-full p-2.5 pr-9 rounded-lg border focus:border-blue-500 focus:outline-none ${
                      isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-lg text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all ${
                  selectedRole === 'INDIVIDUAL'
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{authMode === 'LOGIN' ? 'Sign In to Portal' : 'Create & Access Portal'}</span>
                )}
              </button>
            </form>

            {/* Footer Switch */}
            <div className={`pt-2 text-center border-t text-xs ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
              {authMode === 'LOGIN' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('REGISTER');
                      setErrorMsg(null);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Register here
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('LOGIN');
                      setErrorMsg(null);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Sign In
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
