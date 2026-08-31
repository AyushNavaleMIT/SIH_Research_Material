import React, { useState } from 'react';
import { Eye, EyeOff, Layers, AlertTriangle, CheckCircle, ZoomIn } from 'lucide-react';
import type { DocumentAnalysisResult, SuspiciousRegion } from '../types';

interface HeatmapViewerProps {
  analysisResult: DocumentAnalysisResult;
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({ analysisResult }) => {
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [activeRegion, setActiveRegion] = useState<SuspiciousRegion | null>(
    analysisResult.suspiciousRegions[0] || null
  );
  const [selectedOverlayMode, setSelectedOverlayMode] = useState<'ELA' | 'FONT' | 'EXIF' | 'ALL'>('ALL');

  const hasSuspiciousRegions = analysisResult.suspiciousRegions.length > 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Forensic Inspection & Thermal Heatmap Viewer
          </h3>
          <p className="text-xs text-slate-400">
            Interactive spectral layer comparison and tampered region localization
          </p>
        </div>

        {/* Layer Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono font-medium border transition-all ${
              showHeatmap
                ? 'bg-rose-950/80 text-rose-300 border-rose-800 shadow-md shadow-rose-950/50'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            {showHeatmap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showHeatmap ? 'Heatmap Overlay: ON' : 'Original Document Only'}</span>
          </button>

          <select
            value={selectedOverlayMode}
            onChange={(e) => setSelectedOverlayMode(e.target.value as any)}
            className="bg-slate-950 text-slate-300 text-xs font-mono border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
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
        <div className="lg:col-span-2 relative bg-slate-950 rounded-xl border border-slate-800 p-3 overflow-hidden flex flex-col items-center justify-center min-h-[340px]">
          {/* Status overlay badge */}
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                hasSuspiciousRegions
                  ? 'bg-rose-950/90 text-rose-400 border-rose-800 shadow-lg'
                  : 'bg-emerald-950/90 text-emerald-400 border-emerald-800'
              }`}
            >
              {hasSuspiciousRegions
                ? `${analysisResult.suspiciousRegions.length} ANOMALIES DETECTED`
                : 'DOCUMENT INTEGRITY VERIFIED'}
            </span>
          </div>

          {/* Document Image & Overlay */}
          <div className="relative inline-block max-w-full rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
            <img
              src={analysisResult.imageUrl}
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
                        ? 'border-rose-400 bg-rose-500/30 ring-4 ring-rose-500/50 z-20 animate-pulse'
                        : 'border-amber-400/90 bg-amber-500/20 hover:border-rose-400 hover:bg-rose-500/20 z-10'
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
          <div className="w-full mt-3 pt-2 border-t border-slate-900 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-500">
            <span className="flex items-center gap-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
              Resolution: 2400 x 1600 px (300 DPI)
            </span>
            <div className="flex items-center space-x-3">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Clean Area
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span> ELA Anomaly Region
              </span>
            </div>
          </div>
        </div>

        {/* Right Details Panel for Suspicious Regions (1 Col) */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Suspicious Region Details
              </h4>
              <span className="text-[10px] font-mono text-slate-500">
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
                          ? 'bg-rose-950/60 border-rose-600 text-slate-200 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono font-bold mb-1">
                        <span className="text-rose-400 truncate">{region.title}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-900 text-rose-200 border border-rose-700">
                          {region.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {region.description}
                      </p>
                      <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                        <span>Type: {region.type}</span>
                        <span>Pos: X:{region.boundingBox.x}% Y:{region.boundingBox.y}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 space-y-2 bg-slate-900/50 rounded-lg border border-slate-800/80">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                <p className="font-bold text-slate-300">No Tampering Anomalies Detected</p>
                <p className="text-[11px] text-slate-500">
                  Document optical density and Error Level Analysis match authentic baseline template.
                </p>
              </div>
            )}
          </div>

          {/* Method Confidence Badge */}
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[11px] font-mono space-y-1">
            <div className="flex justify-between text-slate-400">
              <span>Spectral Model Version:</span>
              <span className="text-cyan-400">v3.1-ResNet50</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Inspection Timestamp:</span>
              <span className="text-slate-300">{analysisResult.uploadTimestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
