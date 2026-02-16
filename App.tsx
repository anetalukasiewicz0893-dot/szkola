import React, { useState, useEffect } from 'react';
import SubjectDashboard from './components/dashboard/SubjectDashboard';
import AppSettings from './components/settings/AppSettings';
import GlassCard from './components/ui/GlassCard';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { User, Subject, Document } from './types';
import * as db from './services/mockDb';
import UploadZone from './components/files/UploadZone';
import { Plus, FileText, ChevronRight, User as UserIcon, Clock, Sparkles, Brain, Trash2, Settings, X, Hourglass, CheckCircle, Coins, Download, Calendar } from 'lucide-react';

const TAYLOR_QUOTES = [
  "Long story short, I survived.",
  "This is a new year. A new beginning. And things will change.",
  "I ask the traffic lights if it'll be all right. They say 'I don't know'.",
  "Just keep on dancing like we're 22.",
  "Karma is a god.",
  "Breathe in, breathe through, breathe deep, breathe out.",
  "It's me, hi, I'm the problem, it's me.",
  "The best people in life are free.",
  "Never be so kind, you forget to be clever."
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateSubject, setShowCreateSubject] = useState(false);
  const [showGlobalDocs, setShowGlobalDocs] = useState(false);
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Quote & Timer State
  const [quote, setQuote] = useState("");
  const [daysLeft, setDaysLeft] = useState(0);

  // Create Subject Form State
  const [newSubject, setNewSubject] = useState({
    title: '',
    ects: 0,
    professor: '',
    professorEmail: ''
  });

  // Global Upload State
  const [uploadSubjectId, setUploadSubjectId] = useState('');
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);

  // Initialize App
  useEffect(() => {
    const loadData = async () => {
      const storedUser = db.getUser();
      
      if (!storedUser) {
        setShowOnboarding(true);
        setLoading(false);
        return;
      }
      
      setUser(storedUser);
      applyTheme(storedUser.themePref);
      
      // Async Fetch
      const loadedSubjects = await db.getSubjects();
      setSubjects(loadedSubjects);

      // Restore active subject if exists
      const lastActiveId = localStorage.getItem('ll_active_subject_id');
      if (lastActiveId) {
        const found = loadedSubjects.find(s => s.id === lastActiveId);
        if (found) setActiveSubject(found);
      }
      
      setLoading(false);
    };
    loadData();
    
    // Set Random Quote
    setQuote(TAYLOR_QUOTES[Math.floor(Math.random() * TAYLOR_QUOTES.length)]);
  }, []);

  // Timer Logic: Strictly count down to June 27th (Sesja)
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      let targetDate = new Date(currentYear, 5, 27); // Month is 0-indexed: 5 is June. 27th.

      // If today is past June 27th, aim for next year
      if (now > targetDate) {
        targetDate = new Date(currentYear + 1, 5, 27);
      }

      const difference = targetDate.getTime() - now.getTime();
      setDaysLeft(Math.ceil(difference / (1000 * 60 * 60 * 24)));
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Fetch docs when modal opens
  useEffect(() => {
      const fetchDocs = async () => {
        if (showGlobalDocs) {
            setAllDocs(await db.getAllDocuments());
        }
      };
      fetchDocs();
  }, [showGlobalDocs]);

  const applyTheme = (theme: string) => {
    document.body.setAttribute('data-theme', theme);
  };

  const handleOnboardingComplete = async (newUser: User) => {
    setLoading(true);
    await db.saveUser(newUser);
    await db.seedDataForUser(newUser.id);
    
    setUser(newUser);
    applyTheme(newUser.themePref);
    setSubjects(await db.getSubjects());
    
    setShowOnboarding(false);
    setLoading(false);
  };

  const handleThemeChange = (newTheme: string) => {
    if (user) {
        const updatedUser = { ...user, themePref: newTheme as any };
        setUser(updatedUser);
        db.saveUser(updatedUser);
        applyTheme(newTheme);
    }
  };

  const handleCreateSubjectSubmit = async () => {
    if (!newSubject.title) {
        alert("Proszę podać tytuł przedmiotu.");
        return;
    }

    const sub = await db.createSubject({
      title: newSubject.title,
      ects: Number(newSubject.ects) || 0,
      professor: newSubject.professor || 'TBD',
      professorEmail: newSubject.professorEmail,
      userId: user!.id
    });
    setSubjects(prev => [...prev, sub]);
    setShowCreateSubject(false);
    setNewSubject({ title: '', ects: 0, professor: '', professorEmail: '' });
  };

  const handleDeleteSubject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Native confirm used for safety, could be a modal
    if (confirm("Czy na pewno chcesz usunąć ten przedmiot? Wszystkie dane (pliki, notatki, wydarzenia) zostaną utracone bezpowrotnie.")) {
      await db.deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      // If deleted subject was active (shouldn't happen via this button but for safety)
      if (activeSubject?.id === id) {
          handleBackToDashboard();
      }
    }
  };

  const handleDeleteSubjectFromDashboard = async (id: string) => {
      await db.deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
      handleBackToDashboard();
  };

  const handleSubjectSelect = (subject: Subject) => {
    setActiveSubject(subject);
    localStorage.setItem('ll_active_subject_id', subject.id);
  };

  const handleBackToDashboard = async () => {
    setActiveSubject(null);
    localStorage.removeItem('ll_active_subject_id');
    // Refresh subjects to ensure any notes updates are reflected
    setSubjects(await db.getSubjects());
  };

  // Global File Upload Logic
  const handleGlobalFileUpload = async (files: File[]) => {
      if (!uploadSubjectId) {
          alert("Wybierz przedmiot, do którego chcesz przypisać pliki.");
          return;
      }
      setIsUploadingGlobal(true);
      try {
        for (const file of files) {
          // Convert to base64 for simulation
           const reader = new FileReader();
           await new Promise((resolve) => {
               reader.onload = async (e) => {
                   const dataUrl = e.target?.result as string;
                   await db.saveDocument({
                    name: file.name,
                    size: (file.size / 1024).toFixed(2) + ' KB',
                    type: file.type,
                    dataUrl: dataUrl,
                    subjectId: uploadSubjectId,
                    isAnalyzed: false,
                  });
                  resolve(null);
               };
               reader.readAsDataURL(file);
           });
        }
        setAllDocs(await db.getAllDocuments());
        alert("Pliki dodane pomyślnie.");
      } catch (e) {
          console.error(e);
          alert("Błąd wgrywania.");
      } finally {
          setIsUploadingGlobal(false);
      }
  };

  const handleDownloadFile = (doc: Document) => {
      if (doc.dataUrl) {
          const link = document.createElement('a');
          link.href = doc.dataUrl;
          link.download = doc.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      } else {
          alert("Pobieranie niedostępne dla tego pliku.");
      }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background text-primary">
        <div className="animate-pulse flex flex-col items-center">
           <Brain size={48} className="text-accent" />
           <span className="mt-4 font-serif text-xl">Ładowanie Knowledge Hub...</span>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
      return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Render Subject Detail View
  if (activeSubject && user) {
    return (
        <SubjectDashboard 
            user={user} 
            subject={activeSubject} 
            onBack={handleBackToDashboard} 
            onDeleteSubject={handleDeleteSubjectFromDashboard}
            onThemeChange={handleThemeChange}
        />
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors duration-500 font-sans text-text overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start justify-between w-full md:w-auto">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-primary truncate">
                KRYMINOLOGIA UW
              </h1>
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-text-muted font-medium text-xs md:text-sm lg:text-base tracking-wide uppercase">{user?.university}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="md:hidden p-2 text-text-muted hover:text-accent bg-surface rounded-full border border-white/10"
            >
              <Settings size={20} />
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowGlobalDocs(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-surface text-text-muted hover:text-accent border border-white/10 hover:border-accent/30 px-4 py-2.5 rounded-full transition-all text-sm md:text-base shadow-sm hover:shadow-lg"
              title="Wszystkie Dokumenty"
            >
              <FileText size={18} /> <span className="inline">Dokumenty</span>
            </button>
             <button 
              onClick={() => setShowSettings(true)}
              className="hidden md:flex items-center justify-center gap-2 bg-surface text-text-muted hover:text-accent border border-white/10 hover:border-accent/30 px-4 py-2.5 rounded-full transition-all shadow-sm hover:shadow-lg"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={() => setShowCreateSubject(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-accent text-white hover:bg-accent/90 px-6 py-2.5 rounded-full shadow-lg shadow-accent/20 transition-all font-medium text-sm md:text-base"
            >
              <Plus size={20} /> <span className="hidden sm:inline">Nowy Przedmiot</span><span className="sm:hidden">Nowy</span>
            </button>
          </div>
        </div>

        {/* Hero Card: Quote + Sesja Timer */}
        <GlassCard className="relative overflow-hidden flex flex-col md:flex-row items-center justify-between p-6 md:p-8 border-accent/20 gap-8 min-h-[220px]">
          {/* Background Ambient */}
          <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-accent/20 blur-[80px] rounded-full" />
          
          {/* Quote Section */}
          <div className="relative z-10 flex-1 text-center md:text-left flex flex-col justify-center max-w-2xl">
            <div className="mb-3 text-accent opacity-80 flex justify-center md:justify-start">
                <Sparkles size={24} />
            </div>
            <p className="font-hand text-2xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary leading-snug drop-shadow-sm px-2 md:px-0">
              "{quote}"
            </p>
            <p className="text-xs text-text-muted mt-3 uppercase tracking-widest font-semibold opacity-70">— Taylor Swift</p>
          </div>

          {/* Divider (Mobile only) */}
          <div className="w-full h-px bg-white/10 md:hidden" />

          {/* Sesja Countdown - Refactored */}
          <div className="relative z-10 shrink-0">
             <div className="bg-surface/60 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col items-center min-w-[160px] md:min-w-[200px]">
                 <div className="flex items-center gap-2 mb-3 text-accent font-bold text-sm uppercase tracking-wider">
                    <Calendar size={16} /> Sesja (27.06)
                 </div>
                 
                 <div className="flex flex-col items-center">
                    <div className="text-6xl md:text-7xl font-serif font-bold text-primary leading-none tracking-tight">
                        {daysLeft}
                    </div>
                    <div className="text-sm font-medium text-text-muted mt-2 uppercase tracking-[0.2em]">
                        Dni
                    </div>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-white/10 w-full flex justify-center">
                     <span className="text-[10px] text-text-muted opacity-80 flex items-center gap-1">
                        <Hourglass size={10} className="animate-pulse" /> Czas ucieka
                     </span>
                 </div>
             </div>
          </div>
        </GlassCard>

        {/* Subject List Only - Full Width */}
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((sub, index) => {
                 const gradients = [
                   'from-pink-500 to-rose-500',
                   'from-blue-500 to-indigo-500',
                   'from-purple-500 to-violet-500',
                   'from-green-500 to-emerald-500'
                 ];
                 const gradient = gradients[index % gradients.length];

                 return (
                  <div 
                    key={sub.id}
                    onClick={() => handleSubjectSelect(sub)}
                    className="glass-panel rounded-2xl overflow-hidden cursor-pointer group hover:bg-surface/80 transition-all duration-300 border border-white/10 hover:border-accent/30 hover:shadow-xl relative"
                  >
                    <div className={`h-2 bg-gradient-to-r ${gradient}`} />
                    <div className="p-4 md:p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="min-w-0 pr-2">
                          <h3 className="font-bold text-base md:text-lg font-serif group-hover:text-accent transition-colors truncate">{sub.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded text-text-muted">{sub.ects} ECTS</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all shrink-0">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-1.5 text-xs text-text-muted truncate max-w-full">
                          <UserIcon size={14} className="shrink-0" />
                          <span className="truncate">{sub.professor}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSubject(e, sub.id)}
                      className="absolute bottom-4 right-4 md:bottom-5 md:right-5 p-2 rounded-full bg-red-500/10 text-red-500 transition-colors hover:bg-red-500 hover:text-white z-10"
                      title="Usuń Przedmiot"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                 );
              })}
              
              {subjects.length === 0 && (
                <div className="col-span-full py-12 text-center text-text-muted border-2 border-dashed border-white/20 rounded-xl">
                  Brak przedmiotów. Dodaj nowy przedmiot, aby rozpocząć.
                </div>
              )}
            </div>
          </div>
      </div>
      
      {/* Settings Modal */}
      <AppSettings isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} onThemeChange={handleThemeChange} />

      {/* Create Subject Modal */}
      {showCreateSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <GlassCard className="max-w-md w-full !p-0 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-serif font-bold text-lg">Nowy Przedmiot</h3>
                    <button onClick={() => setShowCreateSubject(false)}><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <input 
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-accent"
                        placeholder="Nazwa przedmiotu (np. Prawo Karne)"
                        value={newSubject.title}
                        onChange={e => setNewSubject({...newSubject, title: e.target.value})}
                    />
                    <div className="grid grid-cols-2 gap-4">
                         <input 
                            type="number"
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-accent"
                            placeholder="ECTS"
                            value={newSubject.ects || ''}
                            onChange={e => setNewSubject({...newSubject, ects: Number(e.target.value)})}
                        />
                         <input 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-accent"
                            placeholder="Profesor"
                            value={newSubject.professor}
                            onChange={e => setNewSubject({...newSubject, professor: e.target.value})}
                        />
                    </div>
                     <input 
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-accent"
                        placeholder="Email (opcjonalnie)"
                        value={newSubject.professorEmail}
                        onChange={e => setNewSubject({...newSubject, professorEmail: e.target.value})}
                    />
                </div>
                <div className="p-4 bg-white/5 border-t border-white/10 flex justify-end">
                    <button 
                        onClick={handleCreateSubjectSubmit}
                        className="bg-accent text-white px-6 py-2 rounded-lg font-medium shadow-lg hover:bg-accent/90 transition-all"
                    >
                        Utwórz
                    </button>
                </div>
            </GlassCard>
        </div>
      )}

      {/* Global Docs Modal */}
      {showGlobalDocs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <GlassCard className="max-w-4xl w-full !p-0 overflow-hidden h-[80vh] flex flex-col">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-2">
                         <FileText size={20} className="text-accent" />
                        <h3 className="font-serif font-bold text-lg">Wszystkie Materiały</h3>
                    </div>
                    <button onClick={() => setShowGlobalDocs(false)}><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-1/3 p-4 border-b md:border-b-0 md:border-r border-white/10 bg-white/5">
                         <h4 className="font-bold text-sm text-text-muted uppercase tracking-wider mb-4">Szybki Upload</h4>
                         <div className="mb-4">
                             <label className="text-xs text-text-muted mb-1 block">Wybierz Przedmiot</label>
                             <select 
                                value={uploadSubjectId}
                                onChange={(e) => setUploadSubjectId(e.target.value)}
                                className="w-full bg-black/20 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent mb-4"
                             >
                                 <option value="">-- Wybierz --</option>
                                 {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                             </select>
                             <UploadZone onFilesSelected={handleGlobalFileUpload} isUploading={isUploadingGlobal} />
                         </div>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                         <div className="grid grid-cols-1 gap-2">
                             {allDocs.length === 0 ? (
                                 <div className="text-center py-12 text-text-muted italic">Brak dokumentów w systemie.</div>
                             ) : (
                                 allDocs.map(doc => (
                                     <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                         <div className="flex items-center gap-3 overflow-hidden">
                                             <div className="p-2 bg-secondary/20 rounded text-secondary"><FileText size={16}/></div>
                                             <div className="min-w-0">
                                                 <p className="font-medium text-sm truncate">{doc.name}</p>
                                                 <p className="text-xs text-text-muted">
                                                     {subjects.find(s => s.id === doc.subjectId)?.title || 'Nieznany przedmiot'} • {doc.size}
                                                 </p>
                                             </div>
                                         </div>
                                         <div className="flex gap-2">
                                            {doc.dataUrl && (
                                                <button onClick={() => handleDownloadFile(doc)} className="p-2 hover:bg-white/10 rounded-lg text-text-muted hover:text-accent">
                                                    <Download size={16} />
                                                </button>
                                            )}
                                         </div>
                                     </div>
                                 ))
                             )}
                         </div>
                    </div>
                </div>
            </GlassCard>
          </div>
      )}
    </div>
  );
};

export default App;