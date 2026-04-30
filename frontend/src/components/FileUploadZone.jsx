import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X } from 'lucide-react';

export default function FileUploadZone({ onFileDrop, accept, label, file, onClear }) {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) onFileDrop(acceptedFiles[0]);
  }, [onFileDrop]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  });

  if (file) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-800/60 border border-brand-500/30">
        <FileText className="w-5 h-5 text-brand-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
          <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <button onClick={onClear} className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
        isDragActive
          ? 'border-brand-400 bg-brand-500/10'
          : 'border-surface-700 hover:border-brand-500/50 hover:bg-surface-800/30'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className={`w-8 h-8 mb-3 ${isDragActive ? 'text-brand-400' : 'text-slate-500'}`} />
      <p className="text-sm font-medium text-slate-300">{label || 'Drop file here or click to browse'}</p>
      <p className="text-xs text-slate-500 mt-1">
        {accept ? Object.values(accept).flat().join(', ') : 'Any file type'}
      </p>
    </div>
  );
}
