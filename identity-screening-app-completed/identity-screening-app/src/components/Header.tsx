import React from 'react';
import { ShieldCheck, ShieldAlert, Cpu, UserCheck, RefreshCw } from 'lucide-react';
import type { SampleCase } from '../types';

interface HeaderProps {
  activeCase: SampleCase;
  allCases: SampleCase[];
  onSelectCase: (caseId: string) => void;
  isUnifiedMode: boolean;
  onToggleUnifiedMode: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeCase,
  allCases,
  onSelectCase,
  isUnifiedMode,
  onToggleUnifiedMode,
}) => {
  const isHighRisk = activeCase.expectedStatus === 'HIGH';

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 py-3 sticky top-0 z-30">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Title & System Badge */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-950/80 border border-cyan-500/30 rounded-lg text-cyan-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">
                SENTINEL-AI <span className="text-cyan-400 font-mono text-sm font-normal">| Identity & Forensics Engine</span>
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
                v4.8-SEC
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Forensic Node active &bull; Encrypted Session
            </p>
          </div>
        </div>

        {/* Center: Case Switcher Dropdown */}
        <div className="flex items-center space-x-3 bg-slate-950/70 border border-slate-800 p-1.5 rounded-lg">
          <span className="text-xs font-mono uppercase text-slate-400 pl-2 hidden lg:inline">Screening Subject:</span>
          <select
            value={activeCase.id}
            onChange={(e) => onSelectCase(e.target.value)}
            className="bg-slate-900 text-slate-200 text-xs font-mono font-medium border border-slate-700 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {allCases.map((c) => (
              <option key={c.id} value={c.id}>
                [{c.id}] {c.name} ({c.expectedStatus} RISK DEMO)
              </option>
            ))}
          </select>

          {/* Quick status pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
              isHighRisk
                ? 'bg-rose-950/60 text-rose-400 border-rose-800'
                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
            }`}
          >
            {isHighRisk ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {activeCase.expectedStatus} RISK
          </span>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onToggleUnifiedMode}
            className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-mono font-medium rounded-md border transition-all ${
              isUnifiedMode
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/20 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-slate-100'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUnifiedMode ? 'animate-spin-slow' : ''}`} />
            <span>{isUnifiedMode ? 'Unified Flow Mode: ON' : 'Direct Page View'}</span>
          </button>

          <div className="hidden sm:flex items-center space-x-2 border-l border-slate-800 pl-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-mono text-xs font-semibold">
              <UserCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-right text-xs">
              <p className="text-slate-200 font-medium">Analyst ID-409</p>
              <p className="text-slate-500 text-[10px] font-mono">Sec Ops Level 3</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
