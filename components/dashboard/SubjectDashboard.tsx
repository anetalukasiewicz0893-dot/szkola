import React, { useState, useEffect } from 'react';
import { User, Subject, Document } from '../../types';
import * as db from '../../services/mockDb';
import * as gemini from '../../services/gemini';
import GlassCard from '../ui/GlassCard';
import UploadZone from '../files/UploadZone';
import FileRoster from '../files/FileRoster';
import { jsPDF } from 'jspdf';
import { 
  ArrowLeft, Save, Download, Edit2, Check, Clock, FileText, 
  Sparkles, Wand2, StickyNote, Trash2, Mail, GraduationCap, Coins, ExternalLink 
} from 'lucide-react';
import AppSettings from '../settings/AppSettings';

interface SubjectDashboardProps {
  user: User;
  subject: Subject;
  onBack: () => void;
  onDeleteSubject: (id: string) => void;
}

type Tab = 'documents' | 'notes' | 'exam_center';

const SubjectDashboard: React.FC<SubjectDashboardProps> = ({ user, subject, onBack, onDeleteSubject }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>(subject.notes || '');
  const [isRefining, setIsRefining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Edit Mode State
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerInfo, setHeaderInfo] = useState({ 
    professor: subject.professor, 
    ects: subject.ects,
    professorEmail: subject.professorEmail || ''
  });

  // Girl Math Calc
  const retakeCost = 100; // PLN per ECTS
  const totalSavings = (headerInfo.ects || 0) * retakeCost;

  // Auto-save Notes Logic
  useEffect(() => {
    const saveTimer = setTimeout(async () => {
        if (notes !== (subject.notes || '')) {
            setSavingNotes(true);
            await db.updateSubject(subject.id, { notes });
            setSavingNotes(false);
        }
    }, 1500); // Save after 1.5s of inactivity

    return () => clearTimeout(saveTimer);
  }, [notes, subject.id]); 

  useEffect(() => {
    refreshData();
  }, [subject.id]);

  const refreshData = async () => {
    setDocuments(await db.getDocuments(subject.id));
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        // Create a data URL for simulation
        const reader = new FileReader();
        await new Promise((resolve) => {
             reader.onload = async (e) => {
                 const dataUrl = e.target?.result as string;
                 const newDoc = await db.saveDocument({
                    name: file.name,
                    size: (file.size / 1024).toFixed(2) + ' KB',
                    type: file.type,
                    dataUrl: dataUrl,
                    subjectId: subject.id,
                    isAnalyzed: false,
                 });
                 setDocuments(prev => [...prev, newDoc]);
                 resolve(null);
             };
             reader.readAsDataURL(file);
        });
      }
    } catch (e) {
      console.error(e);
      alert("Nie udało się wgrać plików.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async (docId: string) => {
    if (!gemini.isAiAvailable()) {
       if(confirm("AI Intelligence jest offline. Otworzyć ustawienia, aby dodać klucz API?")) {
          setShowSettings(true);
       }
      return;
    }

    setAnalyzingIds(prev => [...prev, docId]);
    const doc = documents.find(d => d.id === docId);
    if (!doc) return;

    try {
      const analysis = await gemini.analyzeDocument(doc.name, user.major);
      const updated = await db.updateDocument(docId, {
        isAnalyzed: true,
        summary: analysis.executiveSummary,
        tags: analysis.tags
      });
      
      setDocuments(prev => prev.map(d => d.id === docId ? updated : d));
    } catch (err) {
      console.error(err);
      alert('Analiza nie powiodła się.');
    } finally {
      setAnalyzingIds(prev => prev.filter(id => id !== docId));
    }
  };

  const handleDeleteDoc = async (docId: string) => {
      await db.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleDeleteSubject = () => {
    if (confirm(`Czy na pewno chcesz usunąć przedmiot "${subject.title}"? Tej operacji nie można cofnąć.`)) {
      onDeleteSubject(subject.id);
    }
  };

  const handleRefineNotes = async () => {
    if (!notes) return;
    if (!gemini.isAiAvailable()) {
       if(confirm("AI Intelligence jest offline. Otworzyć ustawienia, aby dodać klucz API?")) {
          setShowSettings(true);
       }
      return;
    }

    setIsRefining(true);
    try {
      const refined = await gemini.refineNotes(notes, 'structure');
      setNotes(refined);
      // Trigger save immediately
      await db.updateSubject(subject.id, { notes: refined });
    } catch (e) {
      alert("Nie udało się ulepszyć notatek.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleExportPDF = () => {
    if (!notes) {
      alert("Brak notatek do eksportu.");
      return;
    }
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text(subject.title, margin, 20);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Prowadzący: ${subject.professor} | Data: ${new Date().toLocaleDateString()}`, margin, 28);
      
      doc.setDrawColor(200);
      doc.line(margin, 32, pageWidth - margin, 32);
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      const splitText = doc.splitTextToSize(notes, contentWidth);
      doc.text(splitText, margin, 42);

      doc.save(`Notatki_${subject.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Błąd generowania PDF.");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="w-full lg:w-auto min-w-0">
             <div className="flex justify-between w-full">
               <button 
                onClick={onBack} 
                className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-4 text-sm font-medium group"
               >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                Powrót
              </button>
              <button
                onClick={handleDeleteSubject}
                className="lg:hidden p-2 text-red-500 bg-red-500/10 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
             </div>
            
            <div className="group w-full">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-serif font-bold text-primary tracking-tight break-words max-w-full leading-tight">
                  {subject.title}
                </h1>
                <button 
                    onClick={() => setIsEditingHeader(!isEditingHeader)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent p-1"
                >
                    <Edit2 size={18} />
                </button>
                <button
                   onClick={handleDeleteSubject}
                   className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-red-500/10 rounded-lg ml-4"
                   title="Usuń Przedmiot"
                 >
                   <Trash2 size={20} />
                 </button>
              </div>
              
              {isEditingHeader ? (
                <div className="flex flex-col gap-2 mt-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex flex-wrap gap-2">
                      <input 
                          type="number"
                          value={headerInfo.ects}
                          onChange={(e) => setHeaderInfo(p => ({...p, ects: Number(e.target.value)}))}
                          className="bg-surface border border-white/20 rounded-lg px-3 py-1.5 text-sm text-text w-24 md:w-32 focus:outline-none focus:border-accent"
                          placeholder="ECTS"
                      />
                      <input 
                          value={headerInfo.professor}
                          onChange={(e) => setHeaderInfo(p => ({...p, professor: e.target.value}))}
                          className="bg-surface border border-white/20 rounded-lg px-3 py-1.5 text-sm text-text w-48 md:w-64 focus:outline-none focus:border-accent"
                          placeholder="Profesor"
                      />
                      <input 
                          value={headerInfo.professorEmail}
                          onChange={(e) => setHeaderInfo(p => ({...p, professorEmail: e.target.value}))}
                          className="bg-surface border border-white/20 rounded-lg px-3 py-1.5 text-sm text-text w-48 md:w-64 focus:outline-none focus:border-accent"
                          placeholder="Email (opcjonalnie)"
                      />
                      <button 
                          onClick={() => setIsEditingHeader(false)}
                          className="bg-accent/20 text-accent p-1.5 rounded-lg hover:bg-accent/30 transition-colors"
                      >
                          <Check size={16} />
                      </button>
                    </div>
                </div>
              ) : (
                <div className="mt-2 text-text-muted text-sm md:text-lg font-medium flex flex-wrap items-center gap-3">
                  <span className="bg-surface/50 px-2 py-0.5 rounded border border-white/5 whitespace-nowrap">{headerInfo.ects} ECTS</span> 
                  <span className="hidden sm:inline">•</span> 
                  <span className="truncate">Prof. {headerInfo.professor}</span>
                  {headerInfo.professorEmail && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <a href={`mailto:${headerInfo.professorEmail}`} className="flex items-center gap-1 hover:text-accent transition-colors truncate">
                        <Mail size={16} /> <span className="hidden md:inline">{headerInfo.professorEmail}</span>
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Tabs Container */}
        <div className="border-b border-white/10 pb-1 overflow-x-auto custom-scrollbar">
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'documents', label: 'Dokumenty', icon: FileText },
              { id: 'notes', label: 'Notatki', icon: StickyNote },
              { id: 'exam_center', label: 'Centrum Egzaminacyjne', icon: GraduationCap },
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 
                  ${activeTab === tab.id ? 'bg-surface text-primary border-b-2 border-accent' : 'text-text-muted hover:text-text hover:bg-white/5'}
                `}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[500px]">
          
          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="h-full min-h-[250px] md:min-h-[300px]">
                  <UploadZone 
                    onFilesSelected={handleFileUpload} 
                    isUploading={isUploading}
                  />
                </div>
                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar glass-panel rounded-xl p-2 bg-surface/30">
                    <div className="p-3 mb-2 flex justify-between items-center border-b border-white/10">
                        <h3 className="font-semibold text-text">Twoje Materiały</h3>
                        <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full">{documents.length}</span>
                    </div>
                    <FileRoster 
                      documents={documents} 
                      onAnalyze={handleAnalyze} 
                      onDelete={handleDeleteDoc}
                      analyzingIds={analyzingIds} 
                    />
                </div>
            </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-[500px] md:h-[600px] flex flex-col">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-serif font-bold text-primary">Notatki ze sprawy</h2>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                          onClick={handleRefineNotes}
                          disabled={isRefining || !notes}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 px-3 py-1.5 rounded-lg transition-colors border border-accent/20"
                      >
                          {isRefining ? <Clock size={14} className="animate-spin" /> : <Wand2 size={14} />}
                          Ulepsz (AI)
                      </button>
                      <button 
                          onClick={handleExportPDF}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold bg-surface hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/10"
                      >
                          <Download size={14} /> Eksportuj PDF
                      </button>
                    </div>
                </div>
                <GlassCard className="flex-1 flex flex-col relative overflow-hidden group !p-0 bg-surface/50">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-accent/40" />
                    <textarea
                      className="flex-1 bg-transparent resize-none focus:outline-none w-full h-full font-sans text-base md:text-lg placeholder-text-muted/40 p-4 md:p-6 leading-relaxed text-text"
                      placeholder="Zacznij pisać notatki..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="p-3 border-t border-white/5 bg-white/5 flex justify-end">
                      <span className="text-xs text-text-muted flex items-center gap-1.5">
                          {savingNotes ? <Clock size={12} className="animate-spin" /> : <Save size={12} />} 
                          {savingNotes ? 'Zapisywanie...' : 'Auto-zapis'}
                      </span>
                    </div>
                </GlassCard>
             </div>
          )}

          {/* EXAM CENTER (New Tab) */}
          {activeTab === 'exam_center' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* Girl Math Calculator */}
                 <GlassCard className="relative overflow-hidden bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-accent/20">
                     <div className="absolute top-0 right-0 p-4 opacity-20">
                         <Coins size={64} className="text-accent" />
                     </div>
                     <h3 className="text-xl font-serif font-bold text-primary mb-4 flex items-center gap-2">
                        <Sparkles size={20} className="text-accent" /> Girl Math Calculator
                     </h3>
                     
                     <div className="space-y-4">
                         <div className="bg-white/10 p-4 rounded-xl">
                             <p className="text-sm text-text-muted mb-1">Jeśli zdasz w pierwszym terminie, oszczędzasz:</p>
                             <div className="text-3xl font-bold text-accent">{totalSavings} PLN</div>
                             <p className="text-xs text-text-muted mt-1">(1 ECTS ≈ {retakeCost} PLN za warunek)</p>
                         </div>
                         
                         <div className="p-4 rounded-xl border border-white/10 bg-surface/50">
                             <p className="font-medium text-text mb-2">Możesz za to kupić:</p>
                             <ul className="space-y-2 text-sm text-text-muted">
                                 <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> ok. {Math.floor(totalSavings / 300)} sukienek na Zalando</li>
                                 <li className="flex items-center gap-2"><Check size={14} className="text-green-500"/> ok. {Math.floor(totalSavings / 40)} kaw w Starbucksie</li>
                             </ul>
                         </div>

                         <a 
                            href="https://www.zalando.pl" 
                            target="_blank" 
                            rel="noreferrer"
                            className="block w-full text-center py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                         >
                             Idź na zakupy <ExternalLink size={16}/>
                         </a>
                     </div>
                 </GlassCard>

                 {/* File Analysis for Exam Prep */}
                 <div className="space-y-6">
                    <GlassCard>
                        <h3 className="font-serif text-lg font-bold text-primary mb-4 flex items-center gap-2">
                             <GraduationCap size={20} /> Analiza Materiałów
                        </h3>
                        <p className="text-sm text-text-muted mb-4">
                            Wybierz wgrany plik, aby wygenerować podsumowanie egzaminacyjne.
                        </p>
                        
                        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {documents.length === 0 ? (
                                <p className="text-sm italic text-text-muted">Brak plików. Wgraj coś w zakładce Dokumenty.</p>
                            ) : (
                                documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="p-2 bg-secondary/10 rounded text-secondary shrink-0">
                                                <FileText size={16} />
                                            </div>
                                            <div className="truncate">
                                                <p className="text-sm font-medium truncate">{doc.name}</p>
                                                {doc.isAnalyzed && <span className="text-[10px] text-green-500 flex items-center gap-1"><Check size={8}/> Gotowe</span>}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleAnalyze(doc.id)}
                                            className="text-xs bg-white/10 hover:bg-accent hover:text-white px-3 py-1.5 rounded transition-colors shrink-0"
                                        >
                                            Generuj Fiszkę
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </GlassCard>
                 </div>

             </div>
          )}
        </div>
      </div>
      
      <AppSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default SubjectDashboard;