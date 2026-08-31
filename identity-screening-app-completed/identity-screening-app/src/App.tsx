import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import type { NavTab } from './components/Sidebar';
import { DocumentForensicsPage } from './pages/DocumentForensics';
import { FaceVerificationPage } from './pages/FaceVerification';
import { RiskDashboardPage } from './pages/RiskDashboard';
import { UnifiedWorkflowPage } from './pages/UnifiedWorkflow';
import { SAMPLE_CASES } from './data/mockData';
import type { SampleCase } from './types';

export const App: React.FC = () => {
  const [activeCaseId, setActiveCaseId] = useState<string>(SAMPLE_CASES[0].id);
  const [activeTab, setActiveTab] = useState<NavTab>('unified');
  const [isUnifiedMode, setIsUnifiedMode] = useState<boolean>(true);

  const currentCase: SampleCase =
    SAMPLE_CASES.find((c) => c.id === activeCaseId) || SAMPLE_CASES[0];

  const handleSelectCase = (caseId: string) => {
    setActiveCaseId(caseId);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'unified') {
      setIsUnifiedMode(true);
    } else {
      setIsUnifiedMode(false);
    }
  };

  const handleToggleUnifiedMode = () => {
    const nextMode = !isUnifiedMode;
    setIsUnifiedMode(nextMode);
    if (nextMode) {
      setActiveTab('unified');
    } else {
      setActiveTab('forensics');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Header Bar */}
      <Header
        activeCase={currentCase}
        allCases={SAMPLE_CASES}
        onSelectCase={handleSelectCase}
        isUnifiedMode={isUnifiedMode}
        onToggleUnifiedMode={handleToggleUnifiedMode}
      />

      {/* Main Body: Sidebar + Main Content Canvas */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isUnifiedMode={isUnifiedMode}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
          {activeTab === 'unified' && (
            <UnifiedWorkflowPage
              currentCase={currentCase}
              onSelectSample={handleSelectCase}
            />
          )}

          {activeTab === 'forensics' && (
            <DocumentForensicsPage
              currentCase={currentCase}
              onSelectSample={handleSelectCase}
            />
          )}

          {activeTab === 'face-liveness' && (
            <FaceVerificationPage currentCase={currentCase} />
          )}

          {activeTab === 'risk-dashboard' && (
            <RiskDashboardPage currentCase={currentCase} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
