import React, { useState, useEffect } from 'react';
import SubjectDashboard from './components/dashboard/SubjectDashboard';
import AppSettings from './components/settings/AppSettings';
import GlassCard from './components/ui/GlassCard';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { User, Subject, Document } from './types';
import * as db from './services/mockDb';
import UploadZone from './components/files/UploadZone';
import { Plus, BookOpen, FileText, Calendar, ChevronRight, User as UserIcon, Clock, Sparkles, Brain, Trash2, Settings, X, CheckCircle } from 'lucide-react';

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
  
  // Create Subject Form State
  const [newSubject, setNewSubject] = useState({
    title: '',
    code: '',
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
      
      const loadedSubjects = db.getSubjects();
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
  }, []);

  useEffect(() => {
      if (showGlobalDocs) {
          setAllDocs(db.getAllDocuments());
      }
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
    setSubjects(db.getSubjects());
    
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
      code: newSubject.code || 'TBD',
      professor: newSubject.professor || 'TBD',
      professorEmail: newSubject.professorEmail,
      userId: user!.id
    });
    setSubjects(prev => [...prev, sub]);
    setShowCreateSubject(false);
    setNewSubject({ title: '', code: '', professor: '', professorEmail: '' });
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

  const handleBackToDashboard = () => {
    setActiveSubject(null);
    localStorage.removeItem('ll_active_subject_id');
    // Refresh subjects to ensure any notes updates are reflected
    setSubjects(db.getSubjects());
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
          await db.saveDocument({
            name: file.name,
            size: (file.size / 1024).toFixed(2) + ' KB',
            type: file.type,
            subjectId: uploadSubjectId,
            isAnalyzed: false,
          });
        }
        setAllDocs(db.getAllDocuments());
        alert("Pliki dodane pomyślnie.");
      } catch (e) {
          alert("Błąd wgrywania.");
      } finally {
          setIsUploadingGlobal(false);
      }
  };

  // Calculate Mock Stats
  const totalDocs = subjects.length * 2; // Simulated
  const totalEvents = 5; // Simulated

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
                Twoja Przestrzeń
              </h1>
              <p className="text-text-muted mt-1 font-medium text-xs md:text-sm lg:text-base tracking-wide uppercase">{user?.university}</p>
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

        {/* Daily Quote Card */}
        <GlassCard className="text-center relative overflow-hidden min-h-[120px] md:min-h-[160px] flex items-center justify-center py-6 md:py-8 border-accent/20">
          <div className="absolute top-2 left-2 md:top-4 md:left-4 opacity-20 text-primary">
             <Sparkles size={24} className="md:w-12 md:h-12" />
          </div>
          <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 opacity-20 text-primary rotate-180">
             <Sparkles size={24} className="md:w-12 md:h-12" />
          </div>
          <p className="font-hand text-xl md:text-3xl lg:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary relative z-10 leading-snug p-2 md:p-4 drop-shadow-sm">
            "Long story short, I survived... finals week"
          </p>
        </GlassCard>

        {/* Stats & Subject List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Quick Stats & List */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <GlassCard className="text-center hover:scale-[1.02] transition-transform cursor-default p-3 md:p-4 border-white/20">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 mx-auto text-accent mb-2" />
                <p className="text-lg md:text-2xl font-bold font-serif">{subjects.length}</p>
                <p className="text-[10px] md:text-xs text-text-muted uppercase tracking-wider">Przedmioty</p>
              </GlassCard>
              <GlassCard className="text-center hover:scale-[1.02] transition-transform cursor-default p-3 md:p-4 border-white/20">
                <FileText className="w-5 h-5 md:w-6 md:h-6 mx-auto text-secondary mb-2" />
                <p className="text-lg md:text-2xl font-bold font-serif">{totalDocs}</p>
                <p className="text-[10px] md:text-xs text-text-muted uppercase tracking-wider">Dokumenty</p>
              </GlassCard>
              <GlassCard className="text-center hover:scale-[1.02] transition-transform cursor-default p-3 md:p-4 border-white/20">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 mx-auto text-primary mb-2" />
                <p className="text-lg md:text-2xl font-bold font-serif">{totalEvents}</p>
                <p className="text-[10px] md:text-xs text-text-muted uppercase tracking-wider">Wydarzenia</p>
              </GlassCard>
            </div>

            {/* Subject List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjects.map((sub, index) => {
                 // Generate a deterministic gradient color based on index
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
                          <p className="text-xs md:text-sm text-text-muted font-medium truncate">{sub.code}</p>
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

                      <div className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-white/5">
                        <div className="flex items-center gap-2 text-text-muted">
                          <Calendar size={14} />
                          <span className="text-xs font-medium">Kolejny Egzamin</span>
                        </div>
                        <div className="inline-flex items-center gap-1 text-xs font-bold text-accent">
                          <Clock size={12} />
                          TBA
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

          {/* Right Column: AI Widget & Calendar Preview */}
          <div className="space-y-6">
            
            {/* Status Widget */}
            <div className="glass-panel rounded-2xl overflow-hidden p-5 bg-gradient-to-br from-accent/10 to-transparent border-accent/20 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/30">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-none">Status</h3>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between text-sm p-2 rounded bg-white/5 border border-white/5">
                    <span className="text-text-muted">Nadchodzące Terminy</span>
                    <span className="font-bold text-primary">3</span>
                 </div>
                 <div className="flex items-center justify-between text-sm p-2 rounded bg-white/5 border border-white/5">
                    <span className="text-text-muted">Kolejka Analizy</span>
                    <span className="font-bold text-secondary">Pusta</span>
                 </div>
              </div>
            </div>

            {/* Mini Calendar Visualization (Static Preview) */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg font-serif">Ten Tydzień</h3>
                <p className="text-xs text-text-muted">Podgląd</p>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Pn','Wt','Śr','Cz','Pt','Sb','Nd'].map((d, i) => (
                  <div key={i} className={`p-1 md:p-2 rounded-lg text-xs ${i === 3 ? 'bg-accent text-white font-bold shadow-md' : 'text-text-muted hover:bg-white/5'}`}>
                    <div className="mb-1 text-[10px] md:text-xs">{d}</div>
                    <div className="text-[10px] md:text-xs">{12 + i}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                 <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-text-muted">Egzamin</span>
                 </div>
                 <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <span className="text-text-muted">Zajęcia</span>
                 </div>
              </div>
            </GlassCard>

          </div>
        </div>
      </div>
      
      {/* Create Subject Modal */}
      {showCreateSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <GlassCard className="w-full max-w-md !p-0 overflow-hidden shadow-2xl border border-white/20 m-4">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5">
              <h2 className="text-xl font-serif font-bold text-primary">Nowy Przedmiot</h2>
              <button 
                onClick={() => setShowCreateSubject(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1">Nazwa Przedmiotu</label>
                <input 
                  value={newSubject.title}
                  onChange={e => setNewSubject({...newSubject, title: e.target.value})}
                  placeholder="np. Prawo Cywilne"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted block mb-1">Kod Kursu</label>
                <input 
                  value={newSubject.code}
                  onChange={e => setNewSubject({...newSubject, code: e.target.value})}
                  placeholder="np. KPC-101"
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-medium text-text-muted block mb-1">Prowadzący</label>
                    <input 
                      value={newSubject.professor}
                      onChange={e => setNewSubject({...newSubject, professor: e.target.value})}
                      placeholder="Prof. Iksiński"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-text-muted block mb-1">Email Prowadzącego</label>
                    <input 
                      value={newSubject.professorEmail}
                      onChange={e => setNewSubject({...newSubject, professorEmail: e.target.value})}
                      placeholder="email@uni.edu"
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                    />
                 </div>
              </div>
            </div>

            <div className="p-5 bg-white/5 border-t border-white/10 flex justify-end gap-3">
               <button 
                  onClick={() => setShowCreateSubject(false)}
                  className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-white/5 transition-colors"
               >
                  Anuluj
               </button>
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

      {/* Global Documents Modal */}
      {showGlobalDocs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <GlassCard className="w-full max-w-4xl max-h-[85vh] !p-0 overflow-hidden shadow-2xl border border-white/20 flex flex-col m-2">
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
              <h2 className="text-lg md:text-xl font-serif font-bold text-primary flex items-center gap-2">
                <FileText size={20} className="md:w-6 md:h-6 text-accent" /> Baza Dokumentów
              </h2>
              <button 
                onClick={() => setShowGlobalDocs(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                
                {/* Upload Section */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-text">Szybkie Dodawanie</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-xs font-medium text-text-muted mb-1">Wybierz Przedmiot</label>
                            <select 
                                value={uploadSubjectId}
                                onChange={(e) => setUploadSubjectId(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:outline-none"
                            >
                                <option value="">-- Wybierz --</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-text-muted mt-1">Pliki zostaną przypisane do tego przedmiotu.</p>
                        </div>
                        <div className="md:col-span-2">
                             <UploadZone onFilesSelected={handleGlobalFileUpload} isUploading={isUploadingGlobal} />
                        </div>
                    </div>
                </div>
                
                {/* File List */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-text border-b border-white/10 pb-2">Wszystkie Pliki ({allDocs.length})</h3>
                    {allDocs.length === 0 ? (
                        <p className="text-text-muted italic text-sm">Brak dokumentów w systemie.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {allDocs.map(doc => {
                                const subjectName = subjects.find(s => s.id === doc.subjectId)?.title || "Nieznany";
                                return (
                                    <div key={doc.id} className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-start justify-between">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText size={16} className="text-secondary shrink-0" />
                                                <p className="font-medium text-sm truncate" title={doc.name}>{doc.name}</p>
                                            </div>
                                            <p className="text-[10px] text-text-muted bg-white/5 px-1.5 py-0.5 rounded inline-block truncate max-w-full">
                                                {subjectName}
                                            </p>
                                        </div>
                                        {doc.isAnalyzed && <CheckCircle size={14} className="text-green-500 shrink-0 ml-2" />}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
          </GlassCard>
        </div>
      )}

      <AppSettings isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} onThemeChange={handleThemeChange} />
    </div>
  );
};

export default App;