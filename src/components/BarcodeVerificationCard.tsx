import React from 'react';
import { QrCode, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { BarcodeVerificationResult } from '../types';

interface BarcodeVerificationCardProps {
  barcode?: BarcodeVerificationResult;
}

export const BarcodeVerificationCard: React.FC<BarcodeVerificationCardProps> = ({ barcode }) => {
  if (!barcode) {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 text-xs text-center">
        No barcode or QR analysis data available.
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (barcode.status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> DATA MATCH
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> DATA CONFLICT
          </span>
        );
      case 'INVALID':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> CORRUPTED PAYLOAD
          </span>
        );
      case 'NOT_FOUND':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            NOT DETECTED
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg p-4 md:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              2D Barcode &amp; QR Code Verification
              {barcode.primaryFormat && (
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  {barcode.primaryFormat}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              {barcode.statusDetail}
            </p>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      {/* Cross-Verification Details */}
      {barcode.comparisonResults && barcode.comparisonResults.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Visual OCR vs 2D Barcode Cross-Match Matrix
          </div>

          <div className="space-y-2">
            {barcode.comparisonResults.map((item, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                  item.isMatch
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.isMatch ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  )}
                  <span className="font-bold">{item.field}</span>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-mono">OCR: </span>
                    <span className="font-semibold">{item.ocrValue}</span>
                  </div>
                  <span>vs</span>
                  <div>
                    <span className="text-slate-400 font-mono">Barcode: </span>
                    <span className="font-semibold text-cyan-300">{item.barcodeValue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payload summary */}
      {barcode.payloadSummary && (
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 truncate">
          <span className="text-slate-400">Decoded Payload: </span>
          <span className="text-slate-300">{barcode.payloadSummary}</span>
        </div>
      )}

      {/* Forensic Disclaimer */}
      {barcode.isGenuineProofWarning && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
          <span>{barcode.isGenuineProofWarning}</span>
        </div>
      )}
    </div>
  );
};
