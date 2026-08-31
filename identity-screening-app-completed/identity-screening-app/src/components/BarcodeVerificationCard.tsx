import React, { useState } from 'react';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, HelpCircle, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import type { BarcodeVerificationResult } from '../types';

interface BarcodeVerificationCardProps {
  barcode?: BarcodeVerificationResult;
}

export const BarcodeVerificationCard: React.FC<BarcodeVerificationCardProps> = ({ barcode }) => {
  const [showFullPayload, setShowFullPayload] = useState(false);

  if (!barcode) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-center space-y-2">
        <QrCode className="w-6 h-6 text-slate-500 mx-auto" />
        <p className="text-xs font-bold text-slate-400">QR / Barcode Scanner Pending</p>
        <p className="text-[11px] text-slate-500 font-mono">Upload document to detect and decode embedded QR or PDF417 barcodes.</p>
      </div>
    );
  }

  const { status, primaryFormat, barcodes, comparisonResults, statusDetail, payloadSummary } = barcode;

  const isMatch = status === 'MATCH';
  const isMismatch = status === 'MISMATCH';
  const isNotFound = status === 'NOT_FOUND';
  const isInvalid = status === 'INVALID';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700 flex items-center justify-center text-emerald-400">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              QR Code & Barcode Verification
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                zxing-cpp 2D Engine
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Multi-format 1D/2D decoding and automated cross-verification against printed OCR fields
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {isMatch && (
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              PAYLOAD MATCH ({primaryFormat})
            </span>
          )}
          {isMismatch && (
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1.5 animate-pulse">
              <XCircle className="w-3.5 h-3.5" />
              DATA MISMATCH ({primaryFormat})
            </span>
          )}
          {isNotFound && (
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              NO BARCODE DETECTED
            </span>
          )}
          {isInvalid && (
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              CORRUPTED PAYLOAD
            </span>
          )}
        </div>
      </div>

      {/* When NOT FOUND: Neutral explanation */}
      {isNotFound ? (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex items-center space-x-2 text-slate-300 font-bold">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>No 1D/2D Barcode Present</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            No QR Code or 1D/2D Barcode (e.g. PDF417, Code128) was found on this document surface.
            Absence of a barcode is common on many ID formats and does <span className="text-slate-200 font-bold">NOT</span> mark the document fake.
          </p>
        </div>
      ) : (
        <>
          {/* Detailed Status Banner */}
          <div
            className={`p-3 rounded-lg text-xs font-mono border flex items-center space-x-2.5 ${
              isMismatch
                ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                : isMatch
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-amber-950/70 border-amber-800 text-amber-300'
            }`}
          >
            {isMismatch ? (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : isMatch ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span className="leading-relaxed">{statusDetail}</span>
          </div>

          {/* Cross-Verification Comparison Table */}
          {comparisonResults && comparisonResults.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Cross-Verification with Printed Visual OCR Fields:
              </div>
              <div className="space-y-1.5">
                {comparisonResults.map((comp, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                      comp.isMatch
                        ? 'bg-slate-950 border-slate-800 text-slate-300'
                        : 'bg-rose-950/80 border-rose-700 text-rose-200'
                    }`}
                  >
                    <div>
                      <span className="font-bold block text-slate-200">{comp.field}</span>
                      <span className="text-[10px] text-slate-400">
                        Visual OCR: "{comp.ocrValue}" &bull; Barcode Data: "{comp.barcodeValue}"
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                        comp.isMatch
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-900 text-rose-100 border-rose-600'
                      }`}
                    >
                      {comp.isMatch ? 'MATCH' : 'MISMATCH'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decoded Payload Stream */}
          {barcodes && barcodes.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400 font-bold uppercase">
                  Decoded Payload Stream ({primaryFormat}):
                </span>
                <button
                  onClick={() => setShowFullPayload(!showFullPayload)}
                  className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{showFullPayload ? 'Hide' : 'Expand Full'}</span>
                  {showFullPayload ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-black/60 p-2.5 rounded border border-slate-850 font-mono text-xs text-emerald-400 break-all">
                {showFullPayload ? barcodes[0].rawText : (payloadSummary || barcodes[0].rawText.slice(0, 120) + '...')}
              </div>
            </div>
          )}

          {/* IMPORTANT SECURITY DISCLAIMER */}
          <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-lg text-xs font-mono text-amber-200/90 flex items-start space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <span className="font-bold text-amber-300">CRITICAL FORENSIC NOTICE:</span>{' '}
              Successfully decoding a valid QR code or barcode verifies data readability and format consistency, but does{' '}
              <span className="underline font-bold">NOT</span> solely prove that the physical document is genuine.
              Always inspect physical security threads, micro-printing, and Error Level Analysis (ELA).
            </p>
          </div>
        </>
      )}
    </div>
  );
};
