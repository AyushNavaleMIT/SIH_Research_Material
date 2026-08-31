import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  FileText, 
  Search, 
  Plus, 
  RefreshCw,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ScreeningApiService } from '../services/api';
import type { VerificationHistoryRecord } from '../types';
import { CybercrimeReportModal } from '../components/CybercrimeReportModal';

interface OrganisationDashboardProps {
  onStartNewScreening: () => void;
}

export const OrganisationDashboard: React.FC<OrganisationDashboardProps> = ({ onStartNewScreening }) => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [history, setHistory] = useState<VerificationHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<VerificationHistoryRecord | null>(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const records = await ScreeningApiService.getVerificationHistory();
      setHistory(records);
    } catch {
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filteredHistory = history.filter((r) => {
    const matchesSearch = 
      r.case_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.document_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterDecision === 'ALL') return matchesSearch;
    return matchesSearch && r.final_decision === filterDecision;
  });

  const totalCount = history.length;
  const verifiedCount = history.filter(r => r.final_decision === 'VERIFIED').length;
  const suspiciousCount = history.filter(r => r.final_decision === 'SUSPICIOUS' || r.final_decision === 'RECAPTURE REQUIRED').length;
  const highRiskCount = history.filter(r => r.final_decision === 'HIGH RISK').length;

  const handleOpenDossier = (record: VerificationHistoryRecord) => {
    setSelectedRecord(record);
    setIsDossierModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Institution Header Card */}
      <div className={`p-6 rounded-2xl border shadow-sm backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
        isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white shadow-slate-100'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${
            isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
          }`}>
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${
                isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {user?.orgType || 'AUTHORIZED KYC DESK'}
              </span>
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Org ID: {user?.orgId || 'ORG-PRIMARY'}
              </span>
            </div>
            <h1 className={`text-xl font-bold mt-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {user?.orgName || 'Institutional Screening Dashboard'}
            </h1>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Authorized Compliance Officer: <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{user?.authorizedPerson || user?.username}</span> • Multi-tenant data partition isolated.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchHistory}
            className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onStartNewScreening}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Applicant Screening</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className={`p-4 rounded-xl border space-y-1 ${
          isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-xs'
        }`}>
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Screened</span>
          <div className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{totalCount}</div>
          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Document sessions</span>
        </div>

        <div className={`p-4 rounded-xl border space-y-1 ${
          isDark ? 'border-emerald-500/20 bg-slate-900/80' : 'border-emerald-200 bg-emerald-50/50 shadow-xs'
        }`}>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Verified Authenticity</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{verifiedCount}</div>
          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Passed checksums &amp; liveness</span>
        </div>

        <div className={`p-4 rounded-xl border space-y-1 ${
          isDark ? 'border-amber-500/20 bg-slate-900/80' : 'border-amber-200 bg-amber-50/50 shadow-xs'
        }`}>
          <span className="text-[11px] text-amber-600 dark:text-amber-400">Review / Recapture</span>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{suspiciousCount}</div>
          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Inconclusive OCR or blur</span>
        </div>

        <div className={`p-4 rounded-xl border space-y-1 ${
          isDark ? 'border-rose-500/20 bg-slate-900/80' : 'border-rose-200 bg-rose-50/50 shadow-xs'
        }`}>
          <span className="text-[11px] text-rose-600 dark:text-rose-400">High Risk / Flagged</span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{highRiskCount}</div>
          <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Tampering / Checksum failure</span>
        </div>
      </div>

      {/* Audit History Card */}
      <div className={`p-6 rounded-2xl border shadow-sm space-y-4 ${
        isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white shadow-slate-100'
      }`}>
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            <h2 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              Screening Audit Trail &amp; Verification Records
            </h2>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex items-center gap-2 text-xs">
            <div className="relative">
              <input
                type="text"
                placeholder="Search applicant or Case ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-lg border text-xs focus:border-blue-500 focus:outline-none w-48 sm:w-60 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <Search className={`w-3.5 h-3.5 absolute left-2.5 top-2.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>

            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className={`p-1.5 rounded-lg border text-xs focus:border-blue-500 focus:outline-none ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              <option value="ALL">All Decisions</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="HIGH RISK">High Risk</option>
            </select>
          </div>
        </div>

        {/* Records Table */}
        {filteredHistory.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ShieldCheck className={`w-10 h-10 mx-auto ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
            <div className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>No Verification Records Found</div>
            <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Start a new applicant screening session to verify identity documents, check live blinks, and log cryptographic audit records.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={onStartNewScreening}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs cursor-pointer"
              >
                Launch 5-Step Screening
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-mono text-[10px] uppercase ${
                  isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}>
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Applicant Name</th>
                  <th className="py-2.5 px-3">Document</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Decision</th>
                  <th className="py-2.5 px-3">Risk Score</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {filteredHistory.map((rec) => {
                  const isPass = rec.final_decision === 'VERIFIED';
                  const isHigh = rec.final_decision === 'HIGH RISK';

                  return (
                    <tr key={rec.case_id} className={`transition-colors ${
                      isDark ? 'hover:bg-slate-950/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className={`py-3 px-3 font-mono font-semibold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                        {rec.case_id}
                      </td>
                      <td className={`py-3 px-3 text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {rec.timestamp}
                      </td>
                      <td className={`py-3 px-3 font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {rec.applicant_name}
                      </td>
                      <td className={`py-3 px-3 font-mono text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {rec.document_type}
                      </td>
                      <td className={`py-3 px-3 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {rec.source_display || 'Document'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                            isPass
                              ? isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isHigh
                              ? isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'
                              : isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isPass ? '✓' : isHigh ? '✕' : '⚠'} {rec.final_decision}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className={isHigh ? 'text-rose-600 dark:text-rose-400 font-bold' : isPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                          {rec.overall_risk_score.toFixed(1)}
                        </span>
                        <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>/100</span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDossier(rec)}
                          className={`px-2.5 py-1 rounded-md font-medium text-[11px] border cursor-pointer inline-flex items-center gap-1 ${
                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
                          }`}
                        >
                          <Eye className="w-3 h-3 text-blue-500" />
                          <span>Dossier</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cybercrime / Dossier Modal for Selected Record */}
      {isDossierModalOpen && selectedRecord && (
        <CybercrimeReportModal
          isOpen={isDossierModalOpen}
          onClose={() => {
            setIsDossierModalOpen(false);
            setSelectedRecord(null);
          }}
          docResult={{
            documentId: selectedRecord.case_id,
            documentType: selectedRecord.document_type,
            fileName: `${selectedRecord.case_id}_evidence.jpg`,
            uploadTimestamp: selectedRecord.timestamp,
            imageUrl: '',
            tamperingScore: selectedRecord.overall_risk_score,
            status: selectedRecord.overall_status,
            finalDecision: selectedRecord.final_decision,
            evidenceSha256: selectedRecord.evidence_sha256,
            analysisMethods: [],
            suspiciousRegions: [],
            detectedText: [],
            suspiciousReasons: selectedRecord.reasons,
          }}
          riskDecision={{
            caseId: selectedRecord.case_id,
            applicantName: selectedRecord.applicant_name,
            documentType: selectedRecord.document_type,
            timestamp: selectedRecord.timestamp,
            overallRiskScore: selectedRecord.overall_risk_score,
            overallStatus: selectedRecord.overall_status,
            finalDecision: selectedRecord.final_decision,
            recommendedAction: selectedRecord.final_decision === 'VERIFIED' ? 'PASS' : selectedRecord.final_decision === 'HIGH RISK' ? 'REJECT' : 'MANUAL_REVIEW',
            evidenceSha256: selectedRecord.evidence_sha256,
            breakdown: {} as any,
            reasons: [],
          }}
        />
      )}
    </div>
  );
};
