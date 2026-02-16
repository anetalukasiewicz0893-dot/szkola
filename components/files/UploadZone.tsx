import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isUploading?: boolean;
}

const UploadZone: React.FC<UploadZoneProps> = ({ onFilesSelected, isUploading = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center transition-all 
        flex flex-col items-center justify-center gap-4 h-full min-h-[200px] w-full
        ${isUploading ? 'opacity-70 cursor-wait bg-white/5 border-transparent' : 'cursor-pointer'}
        ${isDragging ? 'border-accent bg-accent/10' : 'border-gray-300/30 hover:border-accent/50 hover:bg-white/5'}
      `}
    >
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleChange}
        className="hidden"
        disabled={isUploading}
      />
      
      {isUploading ? (
        <div className="animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center gap-3">
          <div className="p-4 bg-accent/10 rounded-full animate-pulse">
            <Loader2 size={32} className="text-accent animate-spin" />
          </div>
          <p className="text-text font-medium">Przetwarzanie plików...</p>
        </div>
      ) : (
        <>
          <div className="p-4 bg-white/10 rounded-full transition-transform group-hover:scale-110">
            <UploadCloud size={32} className="text-accent" />
          </div>
          
          <div>
            <h3 className="text-lg font-serif font-medium">Upuść pliki tutaj lub kliknij</h3>
            <p className="text-sm text-text-muted mt-1">Obsługiwane: PDF, DOCX, TXT</p>
          </div>

          <div className="flex gap-4 mt-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-sm px-6 py-2 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-medium transition-colors"
            >
              Wybierz z dysku lokalnego
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default UploadZone;