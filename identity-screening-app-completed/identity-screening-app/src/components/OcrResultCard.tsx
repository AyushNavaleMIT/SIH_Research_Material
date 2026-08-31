import React, { useState } from 'react';
import { FileText, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, User, Calendar, Hash, MapPin, Eye } from 'lucide-react';
import type { OcrResult } from '../types';

interface OcrResultCardProps {
  ocr?: OcrResult;
}

export const OcrResultCard: React.FC<OcrResultCardProps> = ({ ocr }) => {
  const [showRawLines, setShowRawLines] = useState(false);

  if (!ocr) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-center space-y-2">
        <FileText className="w-6 h-6 text-slate-500 mx-auto" />
        <p className="text-xs font-bold text-slate-400">OCR Extraction Pending</p>
        <p className="text-[11px] text-slate-500 font-mono">Upload or analyze document to extract text fields.</p>
      </div>
    );
  }

  const { isReadable, overallConfidence, fields, lines, warning } = ocr;
  const isHighConf = overallConfidence >= 80;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 flex items-center justify-center text-cyan-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Optical Character Recognition (OCR)
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                RapidOCR ONNX
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Locally parsed textual identity credentials from document visual zone
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center space-x-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-mono font-bold flex items-center gap-1.5 border ${
              !isReadable
                ? 'bg-rose-950 text-rose-300 border-rose-800'
                : isHighConf
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-amber-950 text-amber-300 border-amber-800'
            }`}
          >
            {isReadable ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>{isReadable ? `READABLE (${overallConfidence.toFixed(1)}% CONF)` : 'UNREADABLE'}</span>
          </span>
        </div>
      </div>

      {/* Warning Notice if any */}
      {warning && (
        <div className="bg-amber-950/70 border border-amber-800 text-amber-300 p-2.5 rounded-lg text-xs font-mono flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{warning}</span>
        </div>
      )}

      {/* Structured Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Full Name */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
            <User className="w-3 h-3 text-cyan-400" />
            <span>FULL NAME / APPLICANT</span>
          </div>
          <p className="text-xs font-bold text-slate-100 truncate">
            {fields.name || <span className="text-slate-500 font-mono italic">Not detected</span>}
          </p>
        </div>

        {/* Document ID Number */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
            <Hash className="w-3 h-3 text-cyan-400" />
            <span>DOCUMENT / ID NUMBER</span>
          </div>
          <p className="text-xs font-mono font-bold text-slate-100 truncate">
            {fields.docNumber || <span className="text-slate-500 font-mono italic">Not detected</span>}
          </p>
        </div>

        {/* Date of Birth */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>DATE OF BIRTH (DOB)</span>
          </div>
          <p className="text-xs font-mono text-slate-200">
            {fields.dob || <span className="text-slate-500 font-mono italic">Not detected</span>}
          </p>
        </div>

        {/* Expiry Date */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>EXPIRY DATE</span>
          </div>
          <p className="text-xs font-mono text-slate-200">
            {fields.expiryDate || <span className="text-slate-500 font-mono italic">N/A</span>}
          </p>
        </div>

        {/* Document Type Detected */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
            <Eye className="w-3 h-3 text-cyan-400" />
            <span>CLASSIFIED TYPE</span>
          </div>
          <p className="text-xs font-mono font-bold text-cyan-300 truncate">
            {fields.documentType || 'UNKNOWN'}
          </p>
        </div>

        {/* Address / Location */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
          <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
            <MapPin className="w-3 h-3 text-cyan-400" />
            <span>ADDRESS / REGION</span>
          </div>
          <p className="text-xs text-slate-200 truncate">
            {fields.address || (fields.nationality ? `Nationality: ${fields.nationality}` : <span className="text-slate-500 font-mono italic">N/A</span>)}
          </p>
        </div>
      </div>

      {/* Expandable Raw OCR Text Lines */}
      {lines && lines.length > 0 && (
        <div className="border-t border-slate-800 pt-3">
          <button
            onClick={() => setShowRawLines(!showRawLines)}
            className="flex items-center justify-between w-full text-xs font-mono text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            <span>Raw OCR Text Stream ({lines.length} Text Blocks Extracted)</span>
            {showRawLines ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showRawLines && (
            <div className="mt-2 bg-slate-950 p-3 rounded-lg border border-slate-800 max-h-48 overflow-y-auto space-y-1 text-xs font-mono">
              {lines.map((line, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-300 hover:bg-slate-900 px-1 py-0.5 rounded">
                  <span className="truncate pr-2">{line.text}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {line.confidence.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
