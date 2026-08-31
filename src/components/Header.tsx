import React, { useState } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Shield, 
  HelpCircle, 
  X, 
  FileText, 
  LogOut, 
  User, 
  Building2, 
  LayoutDashboard, 
  Fingerprint,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  currentView?: 'SCREENING' | 'ORG_DASHBOARD';
  onSwitchView?: (view: 'SCREENING' | 'ORG_DASHBOARD') => void;
  onResetSession?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView = 'SCREENING',
  onSwitchView,
  onResetSession,
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showGuideModal, setShowGuideModal] = useState(false);

  const isDark = theme === 'dark';

  return (
    <>
      <header className={`backdrop-blur-md border-b px-6 py-3 sticky top-0 z-30 shadow-sm transition-colors duration-150 ${
        isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-slate-100'
      }`}>
        <div className="flex flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          {/* Left: Brand Identity & Active Profile */}
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${
              isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className={`text-base font-bold tracking-tight flex items-center gap-1.5 ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  <span>SENTINEL</span>
                  <span className="text-blue-500 font-mono text-sm font-semibold">AI</span>
                  <span className={`font-normal text-xs ml-1 hidden sm:inline ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}>| Forensic Identity Screening</span>
                </h1>
              </div>

              {/* User / Org Badge */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                  {user.role === 'ORGANISATION' ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Building2 className="w-3 h-3" />
                      <span>{user.orgName || 'Organisation Portal'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                      <User className="w-3 h-3" />
                      <span>{user.fullName || user.username || 'Individual Session'}</span>
                    </span>
                  )}
                  <span className="text-slate-400 dark:text-slate-600">•</span>
                  <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">Active Session</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Navigation, Theme & Controls */}
          <div className="flex items-center space-x-2.5">
            {/* View Switcher for Organisation Users */}
            {user?.role === 'ORGANISATION' && onSwitchView && (
              <div className={`flex items-center p-1 rounded-lg border text-xs ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => onSwitchView('ORG_DASHBOARD')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all cursor-pointer ${
                    currentView === 'ORG_DASHBOARD'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutDashboard className="w-3 h-3" />
                  <span className="hidden sm:inline">Audit Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSwitchView('SCREENING')}
                  className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-medium transition-all cursor-pointer ${
                    currentView === 'SCREENING'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Fingerprint className="w-3 h-3" />
                  <span className="hidden sm:inline">Verify Document</span>
                </button>
              </div>
            )}

            {/* Bright / Dark Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
              }`}
              title={isDark ? 'Switch to Bright Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                isDark
                  ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-800 border-slate-700'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-300'
              }`}
              title="Verification process instructions & help"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Guide</span>
            </button>

            {onResetSession && currentView === 'SCREENING' && (
              <button
                type="button"
                onClick={onResetSession}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer shadow-sm"
                title="Start a new identity screening session"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Verification</span>
              </button>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={logout}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  isDark
                    ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 border-slate-800 hover:border-rose-500/30'
                    : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50 border-slate-200 hover:border-rose-200'
                }`}
                title="Sign Out of Session"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Verification Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h3 className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  Identity Verification Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`space-y-3.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Sentinel-AI performs multi-factor identity screening through 5 sequential gates:
              </p>

              <div className="space-y-2.5">
                <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>1. Document Structure &amp; Checksums:</span>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Upload Aadhaar, e-Aadhaar PDF, PAN, Passport, or DL. Mathematical Verhoeff check digits ($C=0$) and ICAO MRZ checksums are validated.</p>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>2. Active 3D Liveness:</span>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Complete real-time natural blinks and head movements to prevent photo, video playback, and deepfake injection spoofs.</p>
                  </div>
                </div>

                <div className={`p-2.5 rounded-xl border flex items-start gap-2.5 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>3. Biometric Face Match:</span>
                    <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Deep 128D neural facial embeddings match the live selfie against the extracted portrait on the identity document.</p>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-[11px] ${
                isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Privacy &amp; Data Protection:</span> Multi-tenant data partition ensures records belonging to one institution or user are strictly isolated.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
