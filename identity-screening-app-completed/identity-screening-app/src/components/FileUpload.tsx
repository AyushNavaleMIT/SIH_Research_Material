import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { SampleCase } from '../types';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onSelectSample: (caseId: string) => void;
  selectedCase: SampleCase;
  isAnalyzing: boolean;
  onStartAnalysis: () => void;
  onErrorAlert?: (message: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  onSelectSample,
  selectedCase,
  isAnalyzing,
  onStartAnalysis,
  onErrorAlert,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const allowedExts = [".jpg", ".jpeg", ".png"];
    if (!allowedExts.includes(ext)) {
      const msg = "Unsupported file type. Please upload a valid document image in JPG, JPEG, or PNG format.";
      if (onErrorAlert) onErrorAlert(msg);
      return false;
    }
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setCustomFile(file);
        onFileUpload(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setCustomFile(file);
        onFileUpload(file);
      }
    }
  };

  const handleAnalyzeClick = () => {
    if (customFile) {
      if (validateFile(customFile)) {
        onFileUpload(customFile);
      }
    } else {
      onStartAnalysis();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            Document Forensic Scanner Upload
          </h3>
          <p className="text-xs text-slate-400">
            Upload Passport, National ID card, or Driver License (JPG, JPEG, PNG up to 25MB)
          </p>
        </div>
        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-2 py-1 rounded">
          ICAO 9303 Compliant
        </span>
      </div>

      {/* Preset Demo Selection */}
      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
        <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center justify-between">
          <span>Quick Demo Datasets:</span>
          <span className="text-slate-500">Select preset sample or upload custom image</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={() => {
              setCustomFile(null);
              onSelectSample('CASE-2026-8801');
            }}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
              selectedCase.id === 'CASE-2026-8801' && !customFile
                ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="truncate">
              <span className="block font-bold text-slate-200">Authentic Cyberia Passport</span>
              <span className="text-[10px] text-slate-500">Expected: LOW Risk</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-900/80 text-emerald-300 border border-emerald-700">
              PASSPORT
            </span>
          </button>

          <button
            onClick={() => {
              setCustomFile(null);
              onSelectSample('CASE-2026-9942');
            }}
            className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs font-mono transition-all ${
              selectedCase.id === 'CASE-2026-9942' && !customFile
                ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="truncate">
              <span className="block font-bold text-slate-200">Tampered Pacifica License</span>
              <span className="text-[10px] text-slate-500">Expected: HIGH Risk (Spliced)</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-900/80 text-rose-300 border border-rose-700">
              TAMPERED
            </span>
          </button>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/40'
            : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-850 border border-slate-700 flex items-center justify-center text-cyan-400 mb-1">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-200">
            Drag & drop document image here or <span className="text-cyan-400 underline">Browse Files</span>
          </p>
          <p className="text-[11px] text-slate-500">
            Supported formats: High-res JPG, JPEG, PNG (Max 25MB)
          </p>
        </div>
      </div>

      {/* Document Selected Info & Trigger Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 gap-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0">
            {customFile ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-slate-200 truncate">
              {customFile ? customFile.name : selectedCase.docAnalysis.fileName}
            </p>
            <p className="text-[10px] text-slate-400 font-mono">
              {customFile
                ? `${(customFile.size / 1024).toFixed(1)} KB &bull; Custom Upload`
                : `${selectedCase.docAnalysis.documentType} &bull; ${selectedCase.docAnalysis.uploadTimestamp}`}
            </p>
          </div>
        </div>

        <button
          onClick={handleAnalyzeClick}
          disabled={isAnalyzing}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
            isAnalyzing
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 active:scale-95'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Analyzing Forensics...' : 'Analyze Document'}</span>
        </button>
      </div>

      {/* Analysis Progress Loading State */}
      {isAnalyzing && (
        <div className="bg-slate-950/90 border border-cyan-500/40 p-4 rounded-xl space-y-3 animate-pulse">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-cyan-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              Executing Error Level Analysis & FastAPI Forensic Server...
            </span>
            <span className="text-slate-400">Processing...</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-cyan-400 h-full w-[78%] transition-all duration-300"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-slate-400 pt-1">
            <div className="text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> ELA Compression
            </div>
            <div className="text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Texture Variance
            </div>
            <div className="text-cyan-400 flex items-center gap-1 font-bold">
              &bull; OpenCV Engine
            </div>
            <div className="text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Heatmap Generator
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
