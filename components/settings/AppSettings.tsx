import React, { useState, useEffect } from 'react';
import { X, Save, Cpu, ExternalLink } from 'lucide-react';
import GlassCard from '../ui/GlassCard';

interface AppSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState({
    gemini: '',
  });

  useEffect(() => {
    if (isOpen) {
      setKeys({
        gemini: localStorage.getItem('LL_GEMINI_KEY') || '',
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('LL_GEMINI_KEY', keys.gemini);
    
    if (confirm("Ustawienia zapisane. Odświeżyć aplikację?")) {
        window.location.reload();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-lg !p-0 overflow-hidden shadow-2xl border border-white/20">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-primary">Konfiguracja</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* AI Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-accent">
                    <Cpu size={20} />
                    <h3 className="font-semibold text-sm uppercase tracking-wider">Gemini Intelligence</h3>
                </div>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-1 text-accent hover:underline">
                    Pobierz Klucz <ExternalLink size={10} />
                </a>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-muted ml-1">API Key</label>
              <input 
                type="password"
                value={keys.gemini}
                onChange={e => setKeys({...keys, gemini: e.target.value})}
                placeholder="AIzaSy..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-text transition-all"
              />
              <p className="text-[10px] text-text-muted/60 ml-1">Odblokowuje analizę dokumentów, planowanie nauki, literaturę i generowanie quizów.</p>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white/5 border-t border-white/10 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-white/5 transition-colors"
            >
                Anuluj
            </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-accent text-white px-6 py-2 rounded-lg font-medium shadow-lg shadow-accent/20 hover:bg-accent/90 hover:scale-105 transition-all"
          >
            <Save size={16} /> Zapisz
          </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default AppSettings;