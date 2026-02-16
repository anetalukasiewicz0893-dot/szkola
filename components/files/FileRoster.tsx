
import React from 'react';
import { Document } from '../../types';
import { FileText, Sparkles, Loader2, CheckCircle, Trash2, Download, ShieldAlert, BadgeCent } from 'lucide-react';
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

  const handleDownload = (doc: Document) => {
      if (doc.dataUrl) {
          const link = document.createElement('a');
          link.href = doc.dataUrl;
          link.download = doc.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else {
          alert("Pobieranie niedostępne dla tego pliku (brak danych w pamięci sesji).");
      }
  };

  return (
    <div className="space-y-3 mt-6">
      {documents.map((doc) => {
        const isAnalyzing = analyzingIds.includes(doc.id);
        const cryptoWarnings = doc.cryptoEntities?.filter(e => e.flagged).length || 0;
        
        return (
          <GlassCard key={doc.id} className="!p-4 flex items-center justify-between group">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="p-2 bg-secondary/20 rounded-lg text-secondary shrink-0 relative">
                <FileText size={20} />
                {cryptoWarnings > 0 && (
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-3 h-3 flex items-center justify-center rounded-full animate-pulse">!</span>
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-text-muted">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                  {doc.isAnalyzed && (
                    <span className="text-[10px] bg-green-500/20 text-green-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={8} /> Tier 1 OK
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              
              {/* Crypto Entity Badges */}
              {doc.cryptoEntities && doc.cryptoEntities.length > 0 && (
                  <div className="hidden md:flex gap-1 mr-2">
                     {doc.cryptoEntities.slice(0, 3).map((e, i) => (
                         <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${e.flagged ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-blue-500/10 border-blue-500 text-blue-500'}`}>
                             {e.flagged ? <ShieldAlert size={8} /> : <BadgeCent size={8} />}
                             {e.value.substring(0, 8)}{e.value.length > 8 ? '...' : ''}
                         </span>
                     ))}
                     {doc.cryptoEntities.length > 3 && (
                         <span className="text-[9px] text-text-muted">+{doc.cryptoEntities.length - 3}</span>
                     )}
                  </div>
              )}

              {doc.tags && doc.tags.length > 0 && (
                <div className="hidden sm:flex gap-1">
                  {doc.tags.slice(0, 1).map(tag => (
                    <span key={tag} className="text-[10px] bg-white/10 px-2 py-1 rounded text-text-muted">#{tag}</span>
                  ))}
                </div>
              )}
              
              <button 
                  onClick={() => handleDownload(doc)}
                  className="p-2 text-text-muted hover:text-primary hover:bg-white/10 rounded-lg transition-colors"
                  title="Pobierz"
              >
                  <Download size={14} />
              </button>

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
                      <Sparkles size={12} /> Scan
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
