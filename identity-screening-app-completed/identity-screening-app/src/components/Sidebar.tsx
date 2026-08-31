import React from 'react';
import {
  FileSearch,
  UserCheck,
  BarChart3,
  Sliders,
  ShieldCheck,
  Database,
  Terminal,
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
      label: 'Unified Screening Wizard',
      module: 'Workflow',
      icon: Sliders,
      badge: 'Interactive Flow',
      badgeColor: 'bg-cyan-950/80 text-cyan-400 border-cyan-800',
    },
    {
      id: 'forensics' as NavTab,
      label: 'AI Document Forensics',
      module: 'Module 6',
      icon: FileSearch,
      badge: 'E.L.A / Tampering',
      badgeColor: 'bg-indigo-950/80 text-indigo-400 border-indigo-800',
    },
    {
      id: 'face-liveness' as NavTab,
      label: 'Face Match & Active Liveness',
      module: 'Module 7',
      icon: UserCheck,
      badge: 'Biometric 3D',
      badgeColor: 'bg-purple-950/80 text-purple-400 border-purple-800',
    },
    {
      id: 'risk-dashboard' as NavTab,
      label: 'Explainable Risk Engine',
      module: 'Module 8',
      icon: BarChart3,
      badge: 'XAI Decision',
      badgeColor: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-4 space-y-6">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-3 px-3">
            Core Modules
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
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
                      <span className="text-[10px] font-mono text-slate-500">{item.module}</span>
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

        {/* System Monitoring & Stats Panel */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold mb-3 px-3">
            System Telemetry
          </div>
          <div className="space-y-2 px-3 text-xs">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Model Inference:</span>
                <span className="text-emerald-400 font-mono font-medium">18 ms</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[24%]"></div>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">GPU Memory:</span>
                <span className="text-cyan-400 font-mono font-medium">3.8 GB / 16GB</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 py-1 border-b border-slate-800/50">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Anti-Spoofing Model
              </span>
              <span className="text-slate-200 font-mono">v2.4</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 py-1 border-b border-slate-800/50">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                OCR Template Registry
              </span>
              <span className="text-slate-200 font-mono">3,490</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-[11px] font-mono text-slate-500">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            NODE-04
          </span>
          <span className="text-emerald-400">READY</span>
        </div>
      </div>
    </aside>
  );
};
