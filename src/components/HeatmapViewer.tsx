import React, { useState } from 'react';
import { Eye, EyeOff, Layers, AlertTriangle, CheckCircle, ZoomIn } from 'lucide-react';
import type { DocumentAnalysisResult, SuspiciousRegion } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeatmapViewerProps {
  analysisResult: DocumentAnalysisResult;
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({ analysisResult }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [showHeatmap, setShowHeatmap] = useState(true);
  const [activeRegion, setActiveRegion] = useState<SuspiciousRegion | null>(
    analysisResult.suspiciousRegions[0] || null
  );
  const [selectedOverlayMode, setSelectedOverlayMode] = useState<'ELA' | 'FONT' | 'EXIF' | 'ALL'>('ALL');

  const hasSuspiciousRegions = analysisResult.suspiciousRegions.length > 0;

  return (
    <div className={`border rounded-xl p-5 shadow-sm space-y-4 transition-colors ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-slate-100'
    }`}>
      {/* Header Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            <Layers className="w-4 h-4 text-blue-500" />
            Forensic Inspection &amp; Thermal Heatmap Viewer
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Interactive spectral layer comparison and tampered region localization
          </p>
        </div>

        {/* Layer Controls */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium border cursor-pointer transition-all ${
              showHeatmap
                ? isDark ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-rose-50 text-rose-800 border-rose-300'
                : isDark ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {showHeatmap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showHeatmap ? 'Heatmap Overlay: ON' : 'Original Document Only'}</span>
          </button>

          <select
            value={selectedOverlayMode}
            onChange={(e) => setSelectedOverlayMode(e.target.value as any)}
            className={`text-xs font-mono border rounded px-2.5 py-1.5 focus:outline-none focus:border-blue-500 ${
              isDark ? 'bg-slate-950 text-slate-300 border-slate-800' : 'bg-slate-50 text-slate-800 border-slate-300'
            }`}
          >
            <option value="ALL">All Forensics Layers</option>
            <option value="ELA">Error Level Analysis (ELA)</option>
            <option value="FONT">Font Baseline Grid</option>
            <option value="EXIF">Metadata Discontinuity</option>
          </select>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Document Viewer Canvas (2 Cols) */}
        <div className={`lg:col-span-2 relative rounded-xl border p-3 overflow-hidden flex flex-col items-center justify-center min-h-[340px] ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          {/* Status overlay badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                hasSuspiciousRegions
                  ? isDark ? 'bg-rose-950/90 text-rose-400 border-rose-800' : 'bg-rose-100 text-rose-800 border-rose-300'
                  : isDark ? 'bg-emerald-950/90 text-emerald-400 border-emerald-800' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {hasSuspiciousRegions
                ? `${analysisResult.suspiciousRegions.length} ANOMALIES DETECTED`
                : 'DOCUMENT INTEGRITY VERIFIED'}
            </span>
          </div>

          {/* Document Image & Overlay */}
          <div className={`relative inline-block max-w-full rounded-lg overflow-hidden border shadow-sm ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <img
              src={analysisResult.imageUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250"><rect width="400" height="250" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2364748b">Document Preview</text></svg>'}
              alt="Screened Document"
              className="max-w-full h-auto object-contain max-h-[380px]"
            />

            {/* Heatmap Layer Simulation Overlay */}
            {showHeatmap && hasSuspiciousRegions && (
              <div className="absolute inset-0 bg-rose-500/10 pointer-events-none mix-blend-multiply transition-all"></div>
            )}

            {/* Suspicious Bounding Boxes */}
            {showHeatmap &&
              analysisResult.suspiciousRegions.map((region) => {
                const isSelected = activeRegion?.id === region.id;
                const { x, y, width, height } = region.boundingBox;

                return (
                  <div
                    key={region.id}
                    onClick={() => setActiveRegion(region)}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: `${width}%`,
                      height: `${height}%`,
                    }}
                    className={`absolute border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/30 ring-2 ring-rose-500/50 z-20 animate-pulse'
                        : 'border-amber-500/90 bg-amber-500/20 hover:border-rose-500 hover:bg-rose-500/20 z-10'
                    }`}
                  >
                    <span className="absolute -top-5 left-0 bg-rose-950 text-rose-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border border-rose-700 whitespace-nowrap shadow-md">
                      [{region.type}]
                    </span>
                  </div>
                );
              })}
          </div>

          {/* Canvas Bottom Legend */}
          <div className={`w-full mt-3 pt-2 border-t flex flex-wrap items-center justify-between text-[11px] font-mono ${
            isDark ? 'border-slate-900 text-slate-500' : 'border-slate-200 text-slate-500'
          }`}>
            <span className="flex items-center gap-1.5">
              <ZoomIn className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
              Resolution: 2400 x 1600 px (300 DPI)
            </span>
            <div className="flex items-center space-x-3">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Clean Area
              </span>
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> ELA Anomaly Region
              </span>
            </div>
          </div>
        </div>

        {/* Right Details Panel for Suspicious Regions (1 Col) */}
        <div className={`rounded-xl border p-4 flex flex-col justify-between space-y-4 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-2 mb-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <h4 className={`text-xs font-mono font-bold uppercase flex items-center gap-1.5 ${
                isDark ? 'text-slate-300' : 'text-slate-800'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Suspicious Region Details
              </h4>
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                {analysisResult.suspiciousRegions.length} Found
              </span>
            </div>

            {hasSuspiciousRegions ? (
              <div className="space-y-2">
                {analysisResult.suspiciousRegions.map((region) => {
                  const isSelected = activeRegion?.id === region.id;
                  return (
                    <div
                      key={region.id}
                      onClick={() => setActiveRegion(region)}
                      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? isDark ? 'bg-rose-950/60 border-rose-600 text-slate-200 shadow-md' : 'bg-rose-50 border-rose-300 text-slate-900 shadow-xs'
                          : isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono font-bold mb-1">
                        <span className="text-rose-500 truncate">{region.title}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] border ${
                          isDark ? 'bg-rose-900 text-rose-200 border-rose-700' : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}>
                          {region.severity}
                        </span>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {region.description}
                      </p>
                      <div className={`mt-2 text-[10px] font-mono flex items-center justify-between ${
                        isDark ? 'text-slate-500' : 'text-slate-400'
                      }`}>
                        <span>Type: {region.type}</span>
                        <span>Pos: X:{region.boundingBox.x}% Y:{region.boundingBox.y}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`p-6 text-center text-xs space-y-2 rounded-lg border ${
                isDark ? 'bg-slate-900/50 border-slate-800/80 text-slate-500' : 'bg-white border-slate-200 text-slate-500 shadow-xs'
              }`}>
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-80" />
                <p className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>No Tampering Anomalies Detected</p>
                <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  Document optical density and Error Level Analysis match authentic baseline template.
                </p>
              </div>
            )}
          </div>

          {/* Method Confidence Badge */}
          <div className={`p-3 rounded-lg border text-[11px] font-mono space-y-1 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Spectral Model Version:</span>
              <span className="text-blue-500 font-semibold">v3.1-Spectral</span>
            </div>
            <div className={`flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Inspection Timestamp:</span>
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{analysisResult.uploadTimestamp || '--/--/----'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
