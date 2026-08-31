import React from 'react';
import { Binary, CheckCircle2, XCircle, AlertCircle, HelpCircle, ShieldCheck } from 'lucide-react';
import type { MrzValidationResult } from '../types';

interface MrzValidationCardProps {
  mrz?: MrzValidationResult;
}

export const MrzValidationCard: React.FC<MrzValidationCardProps> = ({ mrz }) => {
  if (!mrz) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-center space-y-2">
        <Binary className="w-6 h-6 text-slate-500 mx-auto" />
        <p className="text-xs font-bold text-slate-400">MRZ Inspection Pending</p>
        <p className="text-[11px] text-slate-500 font-mono">Upload passport or travel document to inspect ICAO 9303 checksums.</p>
      </div>
    );
  }

  const { status, format, rawLines, parsedFields, checksums, message } = mrz;

  const isVerified = status === 'VERIFIED';
  const isFailed = status === 'FAILED';
  const isNotApplicable = status === 'NOT_APPLICABLE';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-700 flex items-center justify-center text-indigo-400">
            <Binary className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              ICAO 9303 MRZ Checksum Validation
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                {format || 'ICAO Standard'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic 7-3-1 weight check digit mathematical verification on travel documents
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {isVerified && (
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              MRZ VERIFIED (PASS)
            </span>
          )}
          {isFailed && (
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1.5 animate-pulse">
              <XCircle className="w-3.5 h-3.5" />
              CHECKSUM FAILED (TAMPERED)
            </span>
          )}
          {isNotApplicable && (
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              MRZ NOT APPLICABLE
            </span>
          )}
          {status === 'INVALID' && (
            <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              MALFORMED MRZ
            </span>
          )}
        </div>
      </div>

      {/* When NOT APPLICABLE: Clear explanation stating document is NOT marked fake */}
      {isNotApplicable ? (
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
          <div className="flex items-center space-x-2 text-slate-300 font-bold">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Document Type: Non-MRZ Format</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            This uploaded document (e.g. Standard National ID or Driver License) does not require an ICAO Machine Readable Zone.
            The screening engine treats this state as neutral and does <span className="text-slate-200 font-bold">NOT</span> mark the document fake.
          </p>
        </div>
      ) : (
        <>
          {/* Summary Message Banner */}
          <div
            className={`p-3 rounded-lg text-xs font-mono border flex items-center space-x-2.5 ${
              isVerified
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {isVerified ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="leading-relaxed">{message}</span>
          </div>

          {/* Checksum Breakdown Matrix */}
          {checksums && checksums.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                ICAO Check Digit Mathematical Verification Table (Weights: 7, 3, 1 Modulo 10):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checksums.map((chk, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                      chk.valid
                        ? 'bg-slate-950 border-slate-800 text-slate-300'
                        : 'bg-rose-950/80 border-rose-700 text-rose-200'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="font-bold block truncate text-slate-200">{chk.name}</span>
                      <span className="text-[10px] text-slate-400">
                        Field: "{chk.data}" &bull; Exp: {chk.expected} | Calc: {chk.calculated}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 border ${
                        chk.valid
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-rose-900 text-rose-100 border-rose-600'
                      }`}
                    >
                      {chk.valid ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parsed MRZ Identity Fields */}
          {parsedFields && (
            <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-2 text-xs font-mono">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Decoded MRZ Identity Zone:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Surname:</span>
                  <span className="font-bold text-slate-200">{parsedFields.surname || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Given Names:</span>
                  <span className="font-bold text-slate-200">{parsedFields.givenNames || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Doc Number:</span>
                  <span className="font-bold text-cyan-300">{parsedFields.documentNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">DOB (Parsed):</span>
                  <span className="font-bold text-slate-200">{parsedFields.dob || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Raw MRZ String Lines */}
          {rawLines && rawLines.length > 0 && (
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono text-slate-500 uppercase">Optical MRZ Stream:</div>
              <div className="bg-black/60 p-2 rounded border border-slate-850 font-mono text-xs text-cyan-400 tracking-widest overflow-x-auto space-y-1">
                {rawLines.map((line, idx) => (
                  <div key={idx} className="whitespace-pre">{line}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
