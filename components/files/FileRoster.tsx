import React from 'react';
import { Document } from '../../types';
import { FileText, Sparkles, Loader2, CheckCircle, Trash2 } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface FileRosterProps {
  documents: Document[];
  onAnalyze: (docId: string) => void;
  onDelete: (docId: string) => void;
  analyzingIds: string[];
}

const FileRoster: React.FC<FileRosterProps> = ({ documents, onAnalyze, onDelete, analyzingIds }) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted italic">
        Brak materiałów. Wgraj pliki, aby rozpocząć.
      </div>
    );
  }

  const handleDelete = (e: React.MouseEvent, docName: string, docId: string) => {
    e.stopPropagation();
    if (confirm(`Czy na pewno chcesz usunąć plik "${docName}"?`)) {
        onDelete(docId);
    }
  };

  return (
    <div className="space-y-3 mt-6">
      {documents.map((doc) => {
        const isAnalyzing = analyzingIds.includes(doc.id);
        
        return (
          <GlassCard key={doc.id} className="!p-4 flex items-center justify-between group">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="p-2 bg-secondary/20 rounded-lg text-secondary shrink-0">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  {doc.isAnalyzed && (
                    <span className="text-[10px] bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={8} /> Przeanalizowano
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {doc.tags && doc.tags.length > 0 && (
                <div className="hidden sm:flex gap-1">
                  {doc.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] bg-white/10 px-2 py-1 rounded text-text-muted">#{tag}</span>
                  ))}
                </div>
              )}
              
              {!doc.isAnalyzed && (
                <button
                  onClick={() => onAnalyze(doc.id)}
                  disabled={isAnalyzing}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${isAnalyzing 
                      ? 'bg-accent/10 text-accent cursor-wait' 
                      : 'bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/20'
                    }
                  `}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} /> Analizuj
                    </>
                  )}
                </button>
              )}

              <button
                onClick={(e) => handleDelete(e, doc.name, doc.id)}
                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Usuń plik"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};

export default FileRoster;