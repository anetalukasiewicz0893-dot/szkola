import React, { useState, useEffect } from 'react';
import { X, Save, Cpu, ExternalLink, Palette } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { User, Theme } from '../../types';

interface AppSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onThemeChange?: (theme: string) => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ isOpen, onClose, user, onThemeChange }) => {
  const [keys, setKeys] = useState({
    gemini: '',
  });
  
  const [selectedTheme, setSelectedTheme] = useState<string>('lover');

  useEffect(() => {
    if (isOpen) {
      setKeys({
        gemini: localStorage.getItem('LL_GEMINI_KEY') || '',
      });
      if (user) {
          setSelectedTheme(user.themePref);
      }
    }
  }, [isOpen, user]);

  const handleSave = () => {
    localStorage.setItem('LL_GEMINI_KEY', keys.gemini);
    
    if (onThemeChange && selectedTheme !== user?.themePref) {
        onThemeChange(selectedTheme);
    }

    onClose();
  };

  if (!isOpen) return null;

  const themes: { id: Theme; name: string; color: string }[] = [
    { id: 'debut', name: 'Debut', color: 'bg-teal-400' },
    { id: 'fearless', name: 'Fearless', color: 'bg-yellow-400' },
    { id: 'speak_now', name: 'Speak Now', color: 'bg-purple-600' },
    { id: 'red', name: 'Red', color: 'bg-red-600' },
    { id: '1989', name: '1989', color: 'bg-sky-300' },
    { id: 'reputation', name: 'Reputation', color: 'bg-neutral-800' },
    { id: 'lover', name: 'Lover', color: 'bg-pink-300' },
    { id: 'folklore', name: 'Folklore', color: 'bg-gray-400' },
    { id: 'evermore', name: 'Evermore', color: 'bg-orange-800' },
    { id: 'midnights', name: 'Midnights', color: 'bg-indigo-900' },
    { id: 'ttpd', name: 'TTPD', color: 'bg-zinc-400' },
    { id: 'academic', name: 'Academic', color: 'bg-gray-200' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-2xl !p-0 overflow-hidden shadow-2xl border border-white/20">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-primary">Konfiguracja</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* Theme Settings */}
          <div className="space-y-4">
             <div className="flex items-center gap-2 text-accent border-b border-white/10 pb-2">
                <Palette size={20} />
                <h3 className="font-semibold text-sm uppercase tracking-wider">Twoja Era (Motyw)</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {themes.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSelectedTheme(t.id)}
                        className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                            selectedTheme === t.id 
                            ? 'border-accent bg-accent/10' 
                            : 'border-white/10 hover:border-white/30 bg-white/5'
                        }`}
                    >
                        <div className={`w-8 h-8 rounded-full shadow-lg ${t.color}`} />
                        <span className={`text-xs font-medium ${selectedTheme === t.id ? 'text-accent' : 'text-text-muted'}`}>{t.name}</span>
                    </button>
                ))}
            </div>
          </div>

          {/* AI Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
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