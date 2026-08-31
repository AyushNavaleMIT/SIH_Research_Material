import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Info,
  Calendar,
  User,
  CreditCard,
  MapPin
} from 'lucide-react';
import type { OcrResult } from '../types';

interface OcrResultCardProps {
  ocr?: OcrResult;
}

export const OcrResultCard: React.FC<OcrResultCardProps> = ({ ocr }) => {
  const [showRawLines, setShowRawLines] = useState(false);

  if (!ocr) {
    return (
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 text-xs text-center">
        No OCR text extraction available for this document.
      </div>
    );
  }

  const fields = ocr.fields || {};
  const aadhaar = ocr.aadhaar_validation;
  const pan = ocr.pan_validation;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg space-y-4 p-4 md:p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Optical Character Recognition (OCR)
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                RapidOCR ONNX
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Confidence Score: <span className="font-semibold text-slate-200">{ocr.overallConfidence.toFixed(1)}%</span> • {ocr.lines?.length || 0} Text Lines Resolved
            </p>
          </div>
        </div>

        <div>
          {ocr.isReadable ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> READABLE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5" /> UNREADABLE
            </span>
          )}
        </div>
      </div>

      {/* Warning Notice if low confidence or blur */}
      {ocr.warning && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>{ocr.warning}</div>
        </div>
      )}

      {/* Aadhaar Dedicated Verification Banner */}
      {aadhaar && aadhaar.is_aadhaar && (
        <div className="p-3.5 rounded-lg bg-cyan-950/40 border border-cyan-700/50 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-200">
                Indian Aadhaar Structural &amp; Checksum Verification
              </span>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                aadhaar.is_verhoeff_valid
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {aadhaar.is_verhoeff_valid ? 'VERHOEFF CHECKSUM PASS' : 'CHECKSUM MISMATCH'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {aadhaar.structure_checks?.map((chk, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                {chk.passed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-200">{chk.name}</div>
                  <div className="text-[11px] text-slate-400">{chk.details}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 italic bg-slate-900/40 p-2 rounded border border-slate-800/60">
            <strong>Disclaimer:</strong> {aadhaar.disclaimer}
          </div>
        </div>
      )}

      {/* PAN Dedicated Verification Banner */}
      {pan && pan.is_pan && (
        <div className="p-3.5 rounded-lg bg-indigo-950/40 border border-indigo-700/50 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-200">
              Income Tax PAN Syntactic Validation
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              SYNTAX VERIFIED
            </span>
          </div>
          <div className="text-xs text-slate-300">
            Entity Type: <span className="font-semibold text-cyan-300">{pan.entity_type}</span>
          </div>
        </div>
      )}

      {/* Extracted Key Identity Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Document Type */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-slate-400" /> Document Type
          </div>
          <div className="text-xs font-bold text-slate-200 truncate">
            {fields.documentType || 'NATIONAL_ID'}
          </div>
        </div>

        {/* Applicant Name */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" /> Full Name
          </div>
          <div className="text-xs font-bold text-cyan-300 truncate">
            {fields.name || 'Not Detected'}
          </div>
        </div>

        {/* Document Number */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-slate-400" /> Document ID / Number
          </div>
          <div className="text-xs font-mono font-bold text-slate-200 truncate">
            {fields.docNumber || 'Not Detected'}
          </div>
        </div>

        {/* Date of Birth */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" /> Date of Birth
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {fields.dob || 'Not Detected'}
          </div>
        </div>

        {/* Gender */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Gender / Sex
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {fields.gender || 'Not Specified'}
          </div>
        </div>

        {/* Expiry / Issue Date */}
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
            Expiry / Validity
          </div>
          <div className="text-xs font-semibold text-slate-200">
            {fields.expiryDate || 'N/A (Standard Non-Expiring)'}
          </div>
        </div>
      </div>

      {/* Address */}
      {fields.address && (
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-0.5">
              Extracted Address
            </div>
            <div className="text-xs text-slate-300">
              {fields.address}
            </div>
          </div>
        </div>
      )}

      {/* Raw OCR Text Lines Accordion */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowRawLines(!showRawLines)}
          className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer"
        >
          <span>View all recognized OCR text strings ({ocr.lines?.length || 0})</span>
          {showRawLines ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showRawLines && (
          <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto space-y-1 text-xs font-mono">
            {ocr.lines?.map((line, index) => (
              <div key={index} className="flex items-center justify-between text-slate-300 py-0.5 border-b border-slate-900/60 last:border-0">
                <span className="truncate pr-2">{line.text}</span>
                <span className="text-[10px] text-slate-400 flex-shrink-0">{line.confidence.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
