import React, { useState, useEffect, useRef } from 'react';
import { User, Subject, Document } from '../../types';
import * as db from '../../services/mockDb';
import * as gemini from '../../services/gemini';
import { extractTextFromFile } from '../../services/fileParsing';
import GlassCard from '../ui/GlassCard';
import UploadZone from '../files/UploadZone';
import FileRoster from '../files/FileRoster';
import { jsPDF } from 'jspdf';
import { 
  ArrowLeft, Save, Download, Edit2, Check, Clock, FileText, 
  Sparkles, Wand2, StickyNote, Trash2, Mail, GraduationCap, Coins, ExternalLink, Printer, Bot, Send, Headphones, List, FileType
} from 'lucide-react';
import AppSettings from '../settings/AppSettings';

interface SubjectDashboardProps {
  user: User;
  subject: Subject;
  onBack: () => void;
  onDeleteSubject: (id: string) => void;
  onThemeChange: (theme: string) => void;
}

type Tab = 'documents' | 'notebook_ai' | 'notes' | 'exam_center';

interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    text: string;
    timestamp: Date;
}

const SubjectDashboard: React.FC<SubjectDashboardProps> = ({ user, subject, onBack, onDeleteSubject, onThemeChange }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>(subject.notes || '');
  const [isRefining, setIsRefining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Notebook AI State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
      { id: '1', role: 'model', text: 'Cześć! Jestem Notebook AI. Przeanalizowałem Twoje materiały. W czym mogę pomóc?', timestamp: new Date() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatThinking, setIsChatThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Notebook AI Extension State
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [generatedTopics, setGeneratedTopics] = useState('');
  const [podcastAudioUrl, setPodcastAudioUrl] = useState<string | null>(null);
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false);
  
  // Edit Mode State
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerInfo, setHeaderInfo] = useState({ 
    professor: subject.professor, 
    ects: subject.ects,
    professorEmail: subject.professorEmail || ''
  });

  // Girl Math Calc
  const retakeCost = 100; // PLN per ECTS
  const totalEarnings = (headerInfo.ects || 0) * retakeCost;

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

  useEffect(() => {
      if (activeTab === 'notebook_ai') {
          scrollToBottom();
      }
  }, [chatMessages, activeTab]);

  const scrollToBottom = () => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const refreshData = async () => {
    setDocuments(await db.getDocuments(subject.id));
  };

  const handleSaveHeader = async () => {
      // Persist changes to DB
      await db.updateSubject(subject.id, {
          ects: headerInfo.ects,
          professor: headerInfo.professor,
          professorEmail: headerInfo.professorEmail
      });
      setIsEditingHeader(false);
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        // Parse content
        const extractedText = await extractTextFromFile(file);

        // Create a data URL for simulation/download
        const reader = new FileReader();
        await new Promise((resolve) => {
             reader.onload = async (e) => {
                 const dataUrl = e.target?.result as string;
                 const newDoc = await db.saveDocument({
                    name: file.name,
                    size: (file.size / 1024).toFixed(2) + ' KB',
                    type: file.type || 'application/unknown',
                    dataUrl: dataUrl,
                    textContent: extractedText,
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
      const analysis = await gemini.analyzeDocument(doc.name, user.major, doc.textContent);
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
      await db.updateSubject(subject.id, { notes: refined });
    } catch (e) {
      alert("Nie udało się ulepszyć notatek.");
    } finally {
      setIsRefining(false);
    }
  };

  // --- Notebook AI Handlers ---
  
  const getCombinedContext = () => {
      return documents.map(d => d.textContent || "").join("\n\n---\n\n");
  };

  const handleNotebookSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || isChatThinking) return;

      const userMsg = chatInput;
      setChatInput('');
      setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg, timestamp: new Date() }]);
      setIsChatThinking(true);

      const allText = getCombinedContext();
      
      const response = await gemini.chatWithNotebook(
          userMsg, 
          allText, 
          chatMessages.map(m => ({ role: m.role, text: m.text }))
      );

      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: response, timestamp: new Date() }]);
      setIsChatThinking(false);
  };

  const handleGenerateSummary = async () => {
      setIsGeneratingExtra(true);
      const res = await gemini.generateNotebookSummary(getCombinedContext());
      setGeneratedSummary(res);
      setIsGeneratingExtra(false);
  };

  const handleGenerateTopics = async () => {
      setIsGeneratingExtra(true);
      const res = await gemini.generateNotebookTopics(getCombinedContext());
      setGeneratedTopics(res);
      setIsGeneratingExtra(false);
  };

  const handleGeneratePodcast = async () => {
      setIsGeneratingExtra(true);
      const audioUrl = await gemini.generatePodcastAudio(getCombinedContext());
      setPodcastAudioUrl(audioUrl);
      setIsGeneratingExtra(false);
  };


  // --- Export Handlers ---

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

  const handleDownloadSummary = (doc: Document) => {
      if (!doc.summary) {
          alert("Brak analizy do pobrania. Najpierw wygeneruj fiszkę.");
          return;
      }
      try {
        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 15;
        const contentWidth = pageWidth - margin * 2;
        
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text("Analiza AI: " + doc.name, margin, 20);
        
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Przedmiot: ${subject.title} | Data: ${new Date().toLocaleDateString()}`, margin, 28);
        pdf.line(margin, 32, pageWidth - margin, 32);

        pdf.setFontSize(12);
        const splitText = pdf.splitTextToSize(doc.summary, contentWidth);
        pdf.text(splitText, margin, 42);

        pdf.save(`${doc.name}_analiza.pdf`);
      } catch (e) {
          console.error(e);
          alert("Błąd generowania pliku PDF.");
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
                          onClick={handleSaveHeader}
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
              { id: 'notebook_ai', label: 'Notebook AI', icon: Bot },
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
                  
                  {/* Subtle Calculator */}
                  <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/5">
                     <div className="flex items-center gap-2 text-text-muted mb-2">
                        <Sparkles size={14} className="text-accent" />
                        <span className="text-xs font-medium uppercase tracking-wider">Girl Math</span>
                     </div>
                     <div className="flex items-baseline justify-between">
                         <p className="text-xs text-text-muted">Jeśli zdasz w 1. terminie, zarobisz:</p>
                         <span className="font-bold text-accent">{totalEarnings} PLN</span>
                     </div>
                     <a 
                        href="https://www.zalando.pl" 
                        target="_blank" 
                        rel="noreferrer"
                        className="block mt-2 text-center text-[10px] text-text-muted hover:text-accent transition-colors flex items-center justify-center gap-1"
                     >
                         Idź na zakupy <ExternalLink size={10}/>
                     </a>
                  </div>
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

          {/* NOTEBOOK AI TAB */}
          {activeTab === 'notebook_ai' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* Left: Notebook Options */}
               <div className="lg:col-span-1 space-y-4">
                  <GlassCard className="h-full bg-surface/30">
                     <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Sparkles size={14} /> Przewodnik AI
                     </h3>
                     
                     <div className="space-y-3">
                         <button 
                             onClick={handleGenerateSummary}
                             disabled={documents.length === 0 || isGeneratingExtra}
                             className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                         >
                             <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
                                 <FileType size={18} />
                             </div>
                             <div>
                                 <div className="font-medium text-sm">Podsumowanie Źródeł</div>
                                 <div className="text-[10px] text-text-muted">Stwórz "briefing doc" z materiałów</div>
                             </div>
                         </button>

                         <button 
                             onClick={handleGenerateTopics}
                             disabled={documents.length === 0 || isGeneratingExtra}
                             className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                         >
                             <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
                                 <List size={18} />
                             </div>
                             <div>
                                 <div className="font-medium text-sm">Kluczowe Zagadnienia</div>
                                 <div className="text-[10px] text-text-muted">Najważniejsze tematy i pytania</div>
                             </div>
                         </button>

                         <button 
                             onClick={handleGeneratePodcast}
                             disabled={documents.length === 0 || isGeneratingExtra}
                             className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left"
                         >
                             <div className="p-2 bg-orange-500/20 text-orange-400 rounded-lg">
                                 <Headphones size={18} />
                             </div>
                             <div>
                                 <div className="font-medium text-sm">Audio Podcast (Deep Dive)</div>
                                 <div className="text-[10px] text-text-muted">Posłuchaj rozmowy o materiałach</div>
                             </div>
                         </button>
                     </div>

                     {isGeneratingExtra && (
                         <div className="mt-4 flex items-center justify-center gap-2 text-xs text-accent">
                             <span className="w-2 h-2 bg-accent rounded-full animate-ping" />
                             Generowanie treści...
                         </div>
                     )}
                     
                     {/* Generated Content Display Area */}
                     {(generatedSummary || generatedTopics || podcastAudioUrl) && (
                         <div className="mt-4 pt-4 border-t border-white/10 overflow-y-auto max-h-[300px] custom-scrollbar">
                             {podcastAudioUrl && (
                                 <div className="mb-4">
                                     <h4 className="text-xs font-bold text-orange-400 mb-2">Deep Dive Audio</h4>
                                     <audio controls src={podcastAudioUrl} className="w-full h-8" />
                                 </div>
                             )}
                             {generatedSummary && (
                                 <div className="mb-4">
                                     <h4 className="text-xs font-bold text-blue-400 mb-2">Podsumowanie</h4>
                                     <div className="text-xs text-text-muted whitespace-pre-line leading-relaxed">{generatedSummary}</div>
                                 </div>
                             )}
                             {generatedTopics && (
                                 <div className="mb-4">
                                     <h4 className="text-xs font-bold text-purple-400 mb-2">Zagadnienia</h4>
                                     <div className="text-xs text-text-muted whitespace-pre-line leading-relaxed">{generatedTopics}</div>
                                 </div>
                             )}
                         </div>
                     )}

                  </GlassCard>
               </div>

               {/* Right: Chat Interface */}
               <div className="lg:col-span-2 flex flex-col h-[600px] glass-panel rounded-2xl overflow-hidden relative">
                   {documents.length === 0 ? (
                       <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-surface/80 backdrop-blur-sm z-10">
                           <Bot size={48} className="text-text-muted mb-4 opacity-50" />
                           <h3 className="text-xl font-serif font-bold text-primary mb-2">Notebook AI potrzebuje wiedzy</h3>
                           <p className="text-text-muted max-w-md">
                               Wgraj dokumenty (PDF, PPTX, DOCX) w zakładce "Dokumenty", aby móc z nimi rozmawiać. 
                               AI automatycznie przetworzy ich treść.
                           </p>
                           <button onClick={() => setActiveTab('documents')} className="mt-4 text-accent hover:underline">
                               Przejdź do dokumentów
                           </button>
                       </div>
                   ) : null}

                   <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4">
                      {chatMessages.map(msg => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`
                                  max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed
                                  ${msg.role === 'user' 
                                    ? 'bg-accent text-white rounded-br-none' 
                                    : 'bg-white/10 text-text border border-white/10 rounded-bl-none'
                                  }
                              `}>
                                  {msg.text}
                              </div>
                          </div>
                      ))}
                      {isChatThinking && (
                          <div className="flex justify-start">
                              <div className="bg-white/10 rounded-2xl p-4 rounded-bl-none flex gap-2 items-center">
                                  <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce" />
                                  <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce delay-75" />
                                  <span className="w-2 h-2 bg-accent/50 rounded-full animate-bounce delay-150" />
                              </div>
                          </div>
                      )}
                      <div ref={chatEndRef} />
                   </div>

                   <div className="p-4 bg-white/5 border-t border-white/10">
                       <form onSubmit={handleNotebookSubmit} className="relative flex items-center gap-2">
                           <div className="absolute left-3 text-text-muted">
                               <Sparkles size={16} />
                           </div>
                           <input 
                              type="text" 
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Zapytaj o treść wykładów, definicje..."
                              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-12 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm"
                              disabled={documents.length === 0}
                           />
                           <button 
                              type="submit"
                              disabled={!chatInput.trim() || isChatThinking || documents.length === 0}
                              className="absolute right-2 p-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                           >
                               <Send size={16} />
                           </button>
                       </form>
                       <p className="text-[10px] text-text-muted text-center mt-2">Notebook AI bazuje na treści Twoich plików.</p>
                   </div>
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
                 
                 {/* File Analysis for Exam Prep - NOW FULL WIDTH in this view or distinct */}
                 <div className="space-y-6 col-span-1 md:col-span-2">
                    <GlassCard>
                        <h3 className="font-serif text-lg font-bold text-primary mb-4 flex items-center gap-2">
                             <GraduationCap size={20} /> Analiza Materiałów
                        </h3>
                        <p className="text-sm text-text-muted mb-4">
                            Wybierz wgrany plik, aby wygenerować podsumowanie egzaminacyjne. 
                            Obsługiwane: PPTX, DOCX, TXT.
                        </p>
                        
                        <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                            {documents.length === 0 ? (
                                <p className="text-sm italic text-text-muted">Brak plików. Wgraj coś w zakładce Dokumenty.</p>
                            ) : (
                                documents.map(doc => (
                                    <div key={doc.id} className="p-3 bg-white/5 rounded-lg border border-white/5 transition-colors hover:bg-white/10">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="p-2 bg-secondary/10 rounded text-secondary shrink-0">
                                                    <FileText size={16} />
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-sm font-medium truncate">{doc.name}</p>
                                                    {doc.isAnalyzed && <span className="text-[10px] text-green-500 flex items-center gap-1"><Check size={8}/> Gotowe</span>}
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                {doc.isAnalyzed && doc.summary && (
                                                    <button 
                                                        onClick={() => handleDownloadSummary(doc)}
                                                        className="text-xs bg-surface border border-white/10 hover:border-accent hover:text-accent px-3 py-1.5 rounded transition-all flex items-center gap-1"
                                                        title="Pobierz PDF"
                                                    >
                                                        <Printer size={12} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleAnalyze(doc.id)}
                                                    className="text-xs bg-white/10 hover:bg-accent hover:text-white px-3 py-1.5 rounded transition-colors shrink-0"
                                                >
                                                    {doc.isAnalyzed ? 'Generuj ponownie' : 'Generuj Fiszkę'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Display Summary if Analyzed */}
                                        {doc.isAnalyzed && doc.summary && (
                                            <div className="mt-2 pt-2 border-t border-white/10">
                                                <p className="text-xs text-text-muted font-bold mb-1">Podsumowanie AI:</p>
                                                <p className="text-xs text-text/80 leading-relaxed italic line-clamp-3">
                                                    "{doc.summary}"
                                                </p>
                                            </div>
                                        )}
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
      
      <AppSettings isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} onThemeChange={onThemeChange} />
    </div>
  );
};

export default SubjectDashboard;