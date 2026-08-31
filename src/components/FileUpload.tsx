import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
  selectedFileName?: string;
  qualityGateWarning?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  isAnalyzing,
  selectedFileName,
  qualityGateWarning,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndPassFile = (file: File) => {
    setErrorMessage(null);
    const validExtensions = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validExtensions.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|pdf)$/i)) {
      setErrorMessage('Unsupported format. Please upload a valid PDF, JPG, PNG, or WebP document.');
      return;
    }

    if (file.size > 30 * 1024 * 1024) {
      setErrorMessage('File size exceeds maximum allowable limit of 30MB.');
      return;
    }

    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Upload Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isAnalyzing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : isDark
            ? 'border-slate-700 bg-slate-950/60 hover:border-blue-500/50 hover:bg-slate-900/60 shadow-md'
            : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/40 shadow-sm'
        } ${isAnalyzing ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isAnalyzing}
        />

        <div className="flex flex-col items-center justify-center space-y-3 max-w-md mx-auto">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${
            isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-100 border-blue-200 text-blue-600'
          }`}>
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <p className={`text-sm md:text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              {selectedFileName ? (
                <span className="text-blue-600 dark:text-blue-400 flex items-center justify-center gap-1.5 font-mono">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {selectedFileName}
                </span>
              ) : (
                'Drop your identity document here or click to browse'
              )}
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Supports e-Aadhaar, e-PAN, Passports, Driving Licenses (Official PDF, JPG, PNG, WebP up to 30MB)
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border ${
              isDark ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-white text-slate-700 border-slate-300 shadow-xs'
            }`}>
              Select Document
            </span>
          </div>
        </div>
      </div>

      {/* Validation Error Message */}
      {errorMessage && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
          isDark ? 'bg-rose-950/30 border-rose-500/40 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Quality Gate Warning Callout */}
      {qualityGateWarning && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
          isDark ? 'bg-amber-950/30 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <ShieldCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>{qualityGateWarning}</span>
        </div>
      )}
    </div>
  );
};
