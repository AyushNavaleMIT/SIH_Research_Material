import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { AuthLanding } from './pages/AuthLanding';
import { UnifiedWorkflowPage } from './pages/UnifiedWorkflow';
import { OrganisationDashboard } from './pages/OrganisationDashboard';
import { SAMPLE_CASES } from './data/mockData';
import type { SampleCase } from './types';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const [currentView, setCurrentView] = useState<'SCREENING' | 'ORG_DASHBOARD'>(
    user?.role === 'ORGANISATION' ? 'ORG_DASHBOARD' : 'SCREENING'
  );
  const [sessionKey, setSessionKey] = useState<number>(0);
  const [activeCaseId, setActiveCaseId] = useState<string>(SAMPLE_CASES[0].id);

  const currentCase: SampleCase =
    SAMPLE_CASES.find((c) => c.id === activeCaseId) || SAMPLE_CASES[0];

  const handleResetSession = () => {
    setSessionKey((prev) => prev + 1);
    setActiveCaseId(SAMPLE_CASES[0].id);
    setCurrentView('SCREENING');
  };

  const isDark = theme === 'dark';

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen font-sans antialiased transition-colors duration-150 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}>
        <AuthLanding onAuthenticated={() => {
          if (user?.role === 'ORGANISATION') {
            setCurrentView('ORG_DASHBOARD');
          } else {
            setCurrentView('SCREENING');
          }
        }} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white transition-colors duration-150 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header Bar with Auth, Theme and Navigation Controls */}
      <Header
        currentView={currentView}
        onSwitchView={setCurrentView}
        onResetSession={handleResetSession}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
        {currentView === 'ORG_DASHBOARD' && user?.role === 'ORGANISATION' ? (
          <OrganisationDashboard
            onStartNewScreening={() => {
              setSessionKey((prev) => prev + 1);
              setCurrentView('SCREENING');
            }}
          />
        ) : (
          <UnifiedWorkflowPage
            key={sessionKey}
            currentCase={currentCase}
            onSelectSample={setActiveCaseId}
          />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
