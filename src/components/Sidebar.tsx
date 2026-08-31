import React from 'react';
import {
  FileSearch,
  UserCheck,
  BarChart3,
  Sliders,
  ShieldCheck
} from 'lucide-react';

export type NavTab = 'forensics' | 'face-liveness' | 'risk-dashboard' | 'unified';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isUnifiedMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    {
      id: 'unified' as NavTab,
      label: '5-Step Verification',
      desc: 'End-to-End Screening Flow',
      icon: Sliders,
    },
    {
      id: 'forensics' as NavTab,
      label: 'Document Forensics',
      desc: 'ELA, OCR & Quality Gate',
      icon: FileSearch,
    },
    {
      id: 'face-liveness' as NavTab,
      label: 'Biometrics & Liveness',
      desc: '1:1 Match & 3D Challenges',
      icon: UserCheck,
    },
    {
      id: 'risk-dashboard' as NavTab,
      label: 'Risk & Audit Engine',
      desc: 'Explainable Multi-Modal XAI',
      icon: BarChart3,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)] p-4">
      <div className="space-y-6">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-3 px-3">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 text-left">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <div>
                      <span className="block font-semibold">{item.label}</span>
                      <span className="text-[10px] text-slate-400">{item.desc}</span>
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Verification Checkpoints Summary */}
        <div className="pt-4 border-t border-slate-800">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-2.5 px-3">
            Security Capabilities
          </div>
          <div className="space-y-1.5 px-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-2 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Aadhaar Verhoeff Checksum</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>ICAO Doc 9303 MRZ Engine</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>YuNet + SFace 128D Match</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Person-Perspective Liveness</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>SHA-256 Case Evidence Digest</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-center">
        <div className="font-semibold text-slate-300">Identity Screening Engine</div>
        <div className="text-[10px] text-slate-400 mt-0.5">Offline Structural Verification</div>
      </div>
    </aside>
  );
};
