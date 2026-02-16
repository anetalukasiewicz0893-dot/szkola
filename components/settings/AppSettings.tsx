import React, { useState, useEffect } from 'react';
import { X, Save, Cpu, ExternalLink, Palette, Database, Check, Loader2, AlertTriangle } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { User, Theme } from '../../types';
import { initializeWorkspace } from '../../services/notion';

interface AppSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onThemeChange?: (theme: string) => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ isOpen, onClose, user, onThemeChange }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'notion'>('general');
  const [keys, setKeys] = useState({
    gemini: '',
  });
  const [notionConfig, setNotionConfig] = useState({
      token: '',
      parentPageId: '',
      subjectsDb: '',
      eventsDb: '',
      docsDb: ''
  });
  const [dataSource, setDataSource] = useState('LOCAL');
  const [isInitializing, setIsInitializing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('lover');

  useEffect(() => {
    if (isOpen) {
      setKeys({
        gemini: localStorage.getItem('LL_GEMINI_KEY') || '',
      });
      setNotionConfig({
          token: localStorage.getItem('LL_NOTION_TOKEN') || '',
          parentPageId: localStorage.getItem('LL_NOTION_PARENT_PAGE') || '',
          subjectsDb: localStorage.getItem('LL_NOTION_DB_SUBJECTS') || '',
          eventsDb: localStorage.getItem('LL_NOTION_DB_EVENTS') || '',
          docsDb: localStorage.getItem('LL_NOTION_DB_DOCS') || '',
      });
      setDataSource(localStorage.getItem('LL_DATA_SOURCE') || 'LOCAL');
      if (user) {
          setSelectedTheme(user.themePref);
      }
    }
  }, [isOpen, user]);

  const handleSave = () => {
    localStorage.setItem('LL_GEMINI_KEY', keys.gemini);
    localStorage.setItem('LL_NOTION_TOKEN', notionConfig.token);
    localStorage.setItem('LL_DATA_SOURCE', dataSource);
    
    if (onThemeChange && selectedTheme !== user?.themePref) {
        onThemeChange(selectedTheme);
    }

    // Force reload if data source changed to refresh app state
    if (dataSource !== (localStorage.getItem('LL_DATA_SOURCE_PREV') || 'LOCAL')) {
         localStorage.setItem('LL_DATA_SOURCE_PREV', dataSource);
         window.location.reload(); 
    } else {
        onClose();
    }
  };

  const handleInitNotion = async () => {
      if (!notionConfig.token || !notionConfig.parentPageId) {
          alert("Podaj Token integracji oraz ID strony nadrzędnej.");
          return;
      }
      setIsInitializing(true);
      try {
          const ids = await initializeWorkspace(notionConfig.token, notionConfig.parentPageId);
          setNotionConfig(prev => ({
              ...prev,
              subjectsDb: ids.subjectsDbId,
              eventsDb: ids.eventsDbId,
              docsDb: ids.docsDbId
          }));
          
          // Save immediately
          localStorage.setItem('LL_NOTION_DB_SUBJECTS', ids.subjectsDbId);
          localStorage.setItem('LL_NOTION_DB_EVENTS', ids.eventsDbId);
          localStorage.setItem('LL_NOTION_DB_DOCS', ids.docsDbId);
          localStorage.setItem('LL_NOTION_PARENT_PAGE', notionConfig.parentPageId);
          localStorage.setItem('LL_NOTION_TOKEN', notionConfig.token);
          
          setDataSource('NOTION'); // Auto switch
          alert("Workspace Notion został utworzony pomyślnie! Bazy danych są gotowe.");
      } catch (e: any) {
          alert("Błąd inicjalizacji Notion: " + e.message + "\nUpewnij się, że integracja ma dostęp do podanej strony.");
      } finally {
          setIsInitializing(false);
      }
  };

  if (!isOpen) return null;

  const themes: { id: Theme; name: string; color: string }[] = [
    { id: 'lover', name: 'Lover', color: 'bg-pink-300' },
    { id: 'reputation', name: 'Reputation', color: 'bg-neutral-800' },
    { id: 'midnights', name: 'Midnights', color: 'bg-indigo-900' },
    { id: 'evermore', name: 'Evermore', color: 'bg-orange-800' },
    { id: 'academic', name: 'Academic', color: 'bg-gray-200' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <GlassCard className="w-full max-w-lg !p-0 overflow-hidden shadow-2xl border border-white/20">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex gap-4 text-sm font-medium">
             <button 
                onClick={() => setActiveTab('general')}
                className={`pb-1 border-b-2 transition-colors ${activeTab === 'general' ? 'border-accent text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
             >
                Ogólne
             </button>
             <button 
                onClick={() => setActiveTab('notion')}
                className={`pb-1 border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'notion' ? 'border-accent text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
             >
                <Database size={14} /> Integracja Notion
             </button>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {activeTab === 'general' && (
              <>
                {/* Theme Settings */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-accent border-b border-white/10 pb-2">
                        <Palette size={20} />
                        <h3 className="font-semibold text-sm uppercase tracking-wider">Twoja Era (Motyw)</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
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
            </>
          )}

          {activeTab === 'notion' && (
              <div className="space-y-5">
                  <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl text-sm">
                      <p className="font-bold text-accent mb-1 flex items-center gap-2"><AlertTriangle size={16}/> Ważne</p>
                      <p className="text-text-muted">Aplikacja używa publicznego proxy CORS do komunikacji z Notion API z przeglądarki. W środowisku produkcyjnym należy użyć własnego backendu.</p>
                  </div>

                  <div className="flex items-center justify-between">
                      <span className="font-medium">Źródło Danych</span>
                      <div className="flex bg-white/10 p-1 rounded-lg">
                          <button 
                            onClick={() => setDataSource('LOCAL')}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${dataSource === 'LOCAL' ? 'bg-white/20 text-white' : 'text-text-muted hover:text-text'}`}
                          >
                              Lokalne
                          </button>
                          <button 
                            onClick={() => setDataSource('NOTION')}
                            disabled={!notionConfig.subjectsDb}
                            className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${dataSource === 'NOTION' ? 'bg-accent text-white' : 'text-text-muted hover:text-text disabled:opacity-50'}`}
                          >
                              Notion
                          </button>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <label className="text-xs font-medium text-text-muted ml-1">Notion Integration Token</label>
                      <input 
                        type="password"
                        value={notionConfig.token}
                        onChange={e => setNotionConfig({...notionConfig, token: e.target.value})}
                        placeholder="secret_..."
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
                      />
                  </div>

                  <div className="space-y-3">
                      <label className="text-xs font-medium text-text-muted ml-1">Parent Page ID (gdzie utworzyć dashboard)</label>
                      <input 
                        value={notionConfig.parentPageId}
                        onChange={e => setNotionConfig({...notionConfig, parentPageId: e.target.value})}
                        placeholder="32 znakowy ID strony"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
                      />
                      <p className="text-[10px] text-text-muted/60">Upewnij się, że dodałeś integrację (Connections) do tej strony w Notion.</p>
                  </div>

                  {!notionConfig.subjectsDb ? (
                      <button 
                        onClick={handleInitNotion}
                        disabled={isInitializing}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                      >
                         {isInitializing ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                         Inicjalizuj Workspace
                      </button>
                  ) : (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                          <div className="bg-green-500 rounded-full p-1"><Check size={12} className="text-white"/></div>
                          <div className="text-xs">
                              <p className="font-bold text-green-400">Połączono</p>
                              <p className="text-text-muted opacity-80">Bazy danych są skonfigurowane.</p>
                          </div>
                      </div>
                  )}
              </div>
          )}

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