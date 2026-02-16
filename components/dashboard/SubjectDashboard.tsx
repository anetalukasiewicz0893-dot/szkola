import React, { useState, useEffect } from 'react';
import { User, Subject, Document, Event, StudyBlockSuggestion, Book, CheatSheet, Quiz } from '../../types';
import * as db from '../../services/mockDb';
import * as gemini from '../../services/gemini';
import GlassCard from '../ui/GlassCard';
import UploadZone from '../files/UploadZone';
import FileRoster from '../files/FileRoster';
import ProactiveAgentWidget from '../agent/ProactiveAgentWidget';
import CalendarWidget from './CalendarWidget';
import { jsPDF } from 'jspdf';
import { 
  ArrowLeft, Save, Download, Edit2, Check, Clock, FileText, 
  Sparkles, Wand2, Calendar as CalIcon, StickyNote, Book as BookIcon, 
  GraduationCap, Trash2, Plus, Search, BrainCircuit, X, Mail, AlertTriangle 
} from 'lucide-react';
import AppSettings from '../settings/AppSettings';

interface SubjectDashboardProps {
  user: User;
  subject: Subject;
  onBack: () => void;
  onDeleteSubject: (id: string) => void;
}

type Tab = 'documents' | 'schedule' | 'notes' | 'literature' | 'exam';

// Native date helper
const isSameDay = (d1: Date, d2: Date) => 
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const SubjectDashboard: React.FC<SubjectDashboardProps> = ({ user, subject, onBack, onDeleteSubject }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [upcomingExam, setUpcomingExam] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isRefining, setIsRefining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  
  // Literature State
  const [books, setBooks] = useState<Book[]>([]);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [analyzingBookIds, setAnalyzingBookIds] = useState<string[]>([]);

  // Exam Prep State
  const [cheatSheets, setCheatSheets] = useState<CheatSheet[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isGeneratingExamContent, setIsGeneratingExamContent] = useState(false);

  // Edit Mode State
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerInfo, setHeaderInfo] = useState({ 
    professor: subject.professor, 
    code: subject.code,
    professorEmail: subject.professorEmail || ''
  });

  // Modal State for Day Management (Add/Delete/Edit Events)
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'CLASS' as 'EXAM' | 'CLASS' });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');

  useEffect(() => {
    refreshData();
  }, [subject.id]);

  const refreshData = () => {
    setDocuments(db.getDocuments(subject.id));
    const subEvents = db.getSubjectEvents(subject.id);
    setEvents(subEvents);
    setBooks(db.getBooks(subject.id));
    setCheatSheets(db.getCheatSheets(subject.id));
    setQuizzes(db.getQuizzes(subject.id));
    
    // Find next exam
    const futureExams = subEvents
      .filter(e => e.type === 'EXAM' && new Date(e.date) > new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
    if (futureExams.length > 0) {
      setUpcomingExam(futureExams[0]);
    } else {
      setUpcomingExam(null);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        const newDoc = await db.saveDocument({
          name: file.name,
          size: (file.size / 1024).toFixed(2) + ' KB',
          type: file.type,
          subjectId: subject.id,
          isAnalyzed: false,
        });
        setDocuments(prev => [...prev, newDoc]);
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

  // Calendar Logic
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setNewEvent({ title: '', type: 'CLASS' }); // Reset form default
    setEditingEventId(null);
    setShowDayModal(true);
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEvent.title) return;
    
    await db.createEvent({
        title: newEvent.title,
        date: selectedDate.toISOString(),
        type: newEvent.type,
        isCompleted: false,
        userId: user.id,
        subjectId: subject.id
    });
    
    refreshData();
    setNewEvent(prev => ({ ...prev, title: '' })); // Clear input but keep type
  };

  const handleDeleteEvent = async (eventId: string) => {
    if(confirm("Czy na pewno chcesz usunąć to wydarzenie?")) {
        await db.deleteEvent(eventId);
        refreshData();
    }
  };

  const startEditingEvent = (event: Event) => {
    setEditingEventId(event.id);
    setEditEventTitle(event.title);
  };

  const saveEditEvent = async () => {
    if (!editingEventId || !editEventTitle) return;
    await db.updateEvent(editingEventId, { title: editEventTitle });
    setEditingEventId(null);
    refreshData();
  };

  const handleAcceptPlan = async (blocks: StudyBlockSuggestion[]) => {
    for (const block of blocks) {
      await db.createEvent({
        title: block.focus,
        date: block.date,
        type: 'STUDY_BLOCK',
        isCompleted: false,
        userId: user.id,
        subjectId: subject.id
      });
    }
    refreshData();
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

  // --- LITERATURE LOGIC ---
  const handleAddBook = async () => {
    if (!newBookTitle || !newBookAuthor) return;
    
    // Just add the book, no analysis yet
    await db.saveBook({
      title: newBookTitle,
      author: newBookAuthor,
      subjectId: subject.id,
      analysis: "",
      isRecommended: false
    });

    setNewBookTitle('');
    setNewBookAuthor('');
    setBooks(db.getBooks(subject.id));
  };

  const handleAnalyzeBook = async (book: Book) => {
    if (!gemini.isAiAvailable()) {
        alert("Wymagany klucz API do analizy.");
        return;
    }

    setAnalyzingBookIds(prev => [...prev, book.id]);
    try {
        const analysis = await gemini.analyzeBook(book.title, book.author, user.major);
        await db.updateBook(book.id, { analysis });
        setBooks(db.getBooks(subject.id));
    } catch (e) {
        alert("Błąd analizy książki.");
    } finally {
        setAnalyzingBookIds(prev => prev.filter(id => id !== book.id));
    }
  };

  const handleDeleteBook = async (bookId: string) => {
      if(confirm("Usunąć tę pozycję z literatury?")) {
          await db.deleteBook(bookId);
          setBooks(db.getBooks(subject.id));
      }
  };

  // --- EXAM PREP LOGIC ---
  const handleGenerateCheatSheet = async () => {
    const topic = prompt("Jaki temat ma obejmować ściąga?");
    if (!topic) return;

    if (!gemini.isAiAvailable()) {
      alert("Wymagany klucz API");
      return;
    }
    
    setIsGeneratingExamContent(true);
    const content = await gemini.generateCheatSheet(subject.title, topic);
    await db.saveCheatSheet({
      subjectId: subject.id,
      topic,
      content
    });
    setCheatSheets(db.getCheatSheets(subject.id));
    setIsGeneratingExamContent(false);
  };

  const handleGenerateQuiz = async () => {
    if (!gemini.isAiAvailable()) {
      alert("Wymagany klucz API");
      return;
    }
    setIsGeneratingExamContent(true);
    const questions = await gemini.generateQuiz(subject.title, 'easy');
    if (questions.length > 0) {
      await db.saveQuiz({
        subjectId: subject.id,
        title: `Quiz: ${new Date().toLocaleDateString()}`,
        questions
      });
      setQuizzes(db.getQuizzes(subject.id));
    } else {
      alert("Nie udało się wygenerować quizu.");
    }
    setIsGeneratingExamContent(false);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div className="w-full lg:w-auto">
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
            
            <div className="group">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-primary tracking-tight break-words">
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
                          value={headerInfo.code}
                          onChange={(e) => setHeaderInfo(p => ({...p, code: e.target.value}))}
                          className="bg-surface border border-white/20 rounded-lg px-3 py-1.5 text-sm text-text w-24 md:w-32 focus:outline-none focus:border-accent"
                          placeholder="Kod"
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
                <div className="mt-2 text-text-muted text-base md:text-lg font-medium flex flex-wrap items-center gap-3">
                  <span className="bg-surface/50 px-2 py-0.5 rounded border border-white/5">{headerInfo.code}</span> 
                  <span>•</span> 
                  <span>Prof. {headerInfo.professor}</span>
                  {headerInfo.professorEmail && (
                    <>
                      <span>•</span>
                      <a href={`mailto:${headerInfo.professorEmail}`} className="flex items-center gap-1 hover:text-accent transition-colors">
                        <Mail size={16} /> {headerInfo.professorEmail}
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Exam Countdown Card */}
          <GlassCard className="w-full lg:w-auto !p-5 flex items-center gap-5 bg-gradient-to-r from-accent/5 to-transparent border-accent/20 hover:border-accent/40 transition-colors min-w-full md:min-w-[300px]">
            <div className="p-3 rounded-xl bg-accent/10 text-accent shrink-0">
              <Clock size={28} className="md:w-8 md:h-8" />
            </div>
            {upcomingExam ? (
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider font-bold mb-0.5">Najbliższy Egzamin</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-serif font-bold text-primary">
                    {Math.ceil((new Date(upcomingExam.date).getTime() - Date.now()) / (86400000))}
                  </p>
                  <p className="text-sm font-medium text-text-muted">Dni</p>
                </div>
                <p className="text-xs text-text-muted mt-1 bg-white/5 px-2 py-0.5 rounded inline-block">
                  {new Date(upcomingExam.date).toLocaleDateString('pl-PL', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            ) : (
              <div className="text-sm text-text-muted italic">
                Brak egzaminów. <br/> Kliknij w kalendarz.
              </div>
            )}
          </GlassCard>
        </div>

        {/* AI Agent Intervention Widget */}
        <ProactiveAgentWidget 
          user={user}
          upcomingExam={upcomingExam}
          unreadDocsCount={documents.filter(d => !d.isAnalyzed).length}
          onAcceptPlan={handleAcceptPlan}
        />

        {/* Scrollable Tabs Container */}
        <div className="border-b border-white/10 pb-1 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'documents', label: 'Dokumenty', icon: FileText },
              { id: 'schedule', label: 'Harmonogram', icon: CalIcon },
              { id: 'notes', label: 'Notatki', icon: StickyNote },
              { id: 'literature', label: 'Literatura', icon: BookIcon },
              { id: 'exam', label: 'Centrum Egzaminacyjne', icon: GraduationCap },
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
               <div className="h-full min-h-[300px]">
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

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="lg:col-span-2">
                   <CalendarWidget 
                      events={events} 
                      onDateClick={handleDateClick} 
                      className="shadow-lg shadow-black/5 min-h-[500px]"
                   />
                </div>
                <div className="space-y-4">
                   <GlassCard className="bg-gradient-to-b from-surface to-background/50">
                      <h3 className="font-serif text-lg mb-4 text-primary font-bold">Postęp Nauki</h3>
                      <div className="space-y-5">
                        <div>
                          <div className="flex justify-between items-center text-sm mb-2">
                            <span className="text-text-muted">Przeanalizowane</span>
                            <span className="font-bold text-text">{documents.filter(d => d.isAnalyzed).length}/{documents.length}</span>
                          </div>
                          <div className="w-full bg-black/10 rounded-full h-2.5 overflow-hidden border border-white/5">
                            <div 
                                className="bg-accent h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(232,121,249,0.5)]" 
                                style={{ width: `${documents.length ? (documents.filter(d => d.isAnalyzed).length / documents.length) * 100 : 0}%` }} 
                            />
                          </div>
                        </div>
                        
                        <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                           <div className="text-center p-2 rounded bg-white/5">
                              <div className="text-2xl font-serif font-bold text-primary">{events.filter(e => e.type === 'CLASS').length}</div>
                              <div className="text-[10px] text-text-muted uppercase tracking-wider">Zajęcia</div>
                           </div>
                           <div className="text-center p-2 rounded bg-white/5">
                              <div className="text-2xl font-serif font-bold text-secondary">{events.filter(e => e.type === 'EXAM').length}</div>
                              <div className="text-[10px] text-text-muted uppercase tracking-wider">Egzaminy</div>
                           </div>
                        </div>
                      </div>
                    </GlassCard>
                </div>
             </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-[600px] flex flex-col">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-serif font-bold text-primary">Notatki ze sprawy</h2>
                    <div className="flex gap-2">
                      <button 
                          onClick={handleRefineNotes}
                          disabled={isRefining || !notes}
                          className="flex items-center gap-2 text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 px-3 py-1.5 rounded-lg transition-colors border border-accent/20"
                      >
                          {isRefining ? <Clock size={14} className="animate-spin" /> : <Wand2 size={14} />}
                          Ulepsz (AI)
                      </button>
                      <button 
                          onClick={handleExportPDF}
                          className="flex items-center gap-2 text-xs font-bold bg-surface hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/10"
                      >
                          <Download size={14} /> Eksportuj PDF
                      </button>
                    </div>
                </div>
                <GlassCard className="flex-1 flex flex-col relative overflow-hidden group !p-0 bg-surface/50">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-accent/40" />
                    <textarea
                      className="flex-1 bg-transparent resize-none focus:outline-none w-full h-full font-sans text-lg placeholder-text-muted/40 p-6 leading-relaxed text-text"
                      placeholder="Zacznij pisać notatki..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="p-3 border-t border-white/5 bg-white/5 flex justify-end">
                      <span className="text-xs text-text-muted flex items-center gap-1.5">
                          <Save size={12} /> Auto-zapis
                      </span>
                    </div>
                </GlassCard>
             </div>
          )}

          {/* LITERATURE TAB */}
          {activeTab === 'literature' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <GlassCard className="space-y-4">
                   <h3 className="font-serif text-lg font-bold text-primary flex items-center gap-2">
                     <Plus size={20} /> Dodaj Pozycję
                   </h3>
                   <div className="space-y-3">
                     <input 
                       className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                       placeholder="Tytuł Książki"
                       value={newBookTitle}
                       onChange={e => setNewBookTitle(e.target.value)}
                     />
                     <input 
                       className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none"
                       placeholder="Autor"
                       value={newBookAuthor}
                       onChange={e => setNewBookAuthor(e.target.value)}
                     />
                     <button
                       onClick={handleAddBook}
                       className="w-full py-2 bg-white/10 text-text rounded-lg font-medium hover:bg-white/20 flex justify-center items-center gap-2"
                     >
                       <Save size={16} /> Zapisz
                     </button>
                   </div>
                </GlassCard>
              </div>
              <div className="md:col-span-2 space-y-4">
                <h3 className="font-serif text-lg font-bold text-primary">Rekomendowana Literatura</h3>
                {books.length === 0 ? (
                  <div className="text-center py-10 text-text-muted italic bg-white/5 rounded-xl border border-dashed border-white/20">
                    Brak literatury. Dodaj książkę.
                  </div>
                ) : (
                  books.map(book => {
                    const isAnalyzing = analyzingBookIds.includes(book.id);
                    return (
                        <GlassCard key={book.id} className="group relative">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="font-bold text-lg">{book.title}</h4>
                                <p className="text-sm text-text-muted italic">{book.author}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {!book.analysis && (
                                    <button 
                                        onClick={() => handleAnalyzeBook(book)}
                                        disabled={isAnalyzing}
                                        className="bg-accent text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-1"
                                    >
                                        {isAnalyzing ? <Clock size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                        Analizuj
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDeleteBook(book.id)}
                                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        {book.analysis && (
                            <div className="mt-3 text-sm text-text/80 leading-relaxed bg-white/5 p-3 rounded-lg border-l-2 border-accent">
                                {book.analysis}
                            </div>
                        )}
                        </GlassCard>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* EXAM / CENTRE TAB (Renamed) */}
          {activeTab === 'exam' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                 <button 
                   onClick={handleGenerateCheatSheet}
                   disabled={isGeneratingExamContent}
                   className="p-6 bg-gradient-to-br from-surface to-background border border-white/10 rounded-2xl hover:border-accent/50 hover:shadow-lg transition-all text-left group"
                 >
                   <div className="flex items-center gap-3 mb-2">
                     <div className="p-3 rounded-full bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                       <FileText size={24} />
                     </div>
                     <h3 className="font-bold text-lg">Generuj Ściągę (AI)</h3>
                   </div>
                   <p className="text-sm text-text-muted">Stwórz skondensowane notatki na wybrany temat.</p>
                 </button>

                 <button 
                   onClick={handleGenerateQuiz}
                   disabled={isGeneratingExamContent}
                   className="p-6 bg-gradient-to-br from-surface to-background border border-white/10 rounded-2xl hover:border-accent/50 hover:shadow-lg transition-all text-left group"
                 >
                   <div className="flex items-center gap-3 mb-2">
                     <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                       <GraduationCap size={24} />
                     </div>
                     <h3 className="font-bold text-lg">Symulacja Quizu (AI)</h3>
                   </div>
                   <p className="text-sm text-text-muted">Sprawdź swoją wiedzę z 5 losowymi pytaniami.</p>
                 </button>
               </div>

               {isGeneratingExamContent && (
                 <div className="text-center py-8">
                   <Clock size={32} className="animate-spin mx-auto text-accent mb-2" />
                   <p className="text-text-muted">Generuję materiały edukacyjne...</p>
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                   <h3 className="font-serif text-lg font-bold text-primary mb-4">Twoje Ściągi</h3>
                   {cheatSheets.length === 0 ? <p className="text-text-muted italic text-sm">Brak materiałów.</p> : (
                     <div className="space-y-3">
                       {cheatSheets.map(cs => (
                         <div key={cs.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                           <h4 className="font-bold text-sm mb-2">{cs.topic}</h4>
                           <div className="text-xs text-text-muted max-h-32 overflow-y-auto whitespace-pre-line">
                             {cs.content}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>

                 <div>
                   <h3 className="font-serif text-lg font-bold text-primary mb-4">Twoje Quizy</h3>
                   {quizzes.length === 0 ? <p className="text-text-muted italic text-sm">Brak quizów.</p> : (
                      <div className="space-y-3">
                        {quizzes.map(q => (
                          <div key={q.id} className="bg-white/5 p-4 rounded-xl border border-white/10">
                            <h4 className="font-bold text-sm mb-2">{q.title}</h4>
                            <div className="space-y-2">
                               {q.questions.map((ques, idx) => (
                                 <div key={idx} className="text-xs">
                                   <p className="font-medium text-text">{idx+1}. {ques.question}</p>
                                   <p className="text-text-muted ml-4">- {ques.options[ques.correctIndex]}</p>
                                 </div>
                               ))}
                            </div>
                          </div>
                        ))}
                      </div>
                   )}
                 </div>
               </div>
            </div>
          )}

        </div>
      </div>
      
      {/* Day Management Modal (List/Delete/Add Events) */}
      {showDayModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
           <GlassCard className="w-full max-w-md !p-0 overflow-hidden shadow-2xl border border-white/20">
               <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                   <h3 className="font-bold text-primary flex items-center gap-2">
                      <CalIcon size={18} /> {selectedDate.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                   </h3>
                   <button onClick={() => setShowDayModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text">
                       <X size={18} />
                   </button>
               </div>
               
               <div className="p-5 space-y-6">
                   {/* List Existing Events */}
                   <div>
                      <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Wydarzenia</h4>
                      {events.filter(e => isSameDay(new Date(e.date), selectedDate)).length === 0 ? (
                          <p className="text-sm text-text-muted italic">Brak zaplanowanych zajęć ani egzaminów.</p>
                      ) : (
                          <div className="space-y-2">
                             {events.filter(e => isSameDay(new Date(e.date), selectedDate)).map(event => (
                                 <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 transition-colors">
                                     <div className="flex-1 flex items-center gap-3">
                                         <div className={`p-2 rounded-lg ${
                                           event.type === 'EXAM' ? 'bg-secondary/20 text-secondary' : 
                                           event.type === 'CLASS' ? 'bg-accent/20 text-accent' : 
                                           'bg-white/10 text-text-muted'
                                         }`}>
                                             {event.type === 'EXAM' ? <GraduationCap size={16} /> : 
                                              event.type === 'CLASS' ? <Clock size={16} /> : 
                                              <BookIcon size={16} />}
                                         </div>
                                         
                                         {editingEventId === event.id ? (
                                           <div className="flex-1 flex gap-2">
                                              <input 
                                                className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1 text-sm focus:border-accent focus:outline-none"
                                                value={editEventTitle}
                                                onChange={e => setEditEventTitle(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => {
                                                  if(e.key === 'Enter') saveEditEvent();
                                                  if(e.key === 'Escape') setEditingEventId(null);
                                                }}
                                              />
                                              <button onClick={saveEditEvent} className="text-green-500 hover:bg-green-500/10 p-1.5 rounded"><Check size={16}/></button>
                                              <button onClick={() => setEditingEventId(null)} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded"><X size={16}/></button>
                                           </div>
                                         ) : (
                                            <div>
                                                <p className="font-medium text-sm text-text">{event.title}</p>
                                                <p className="text-[10px] text-text-muted uppercase">{
                                                    event.type === 'EXAM' ? 'Egzamin' : 
                                                    event.type === 'CLASS' ? 'Zajęcia' : 'Nauka'
                                                }</p>
                                            </div>
                                         )}
                                     </div>
                                     
                                     {editingEventId !== event.id && (
                                       <div className="flex gap-1">
                                          <button 
                                            onClick={() => startEditingEvent(event)}
                                            className="p-2 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                                            title="Edytuj"
                                          >
                                            <Edit2 size={16} />
                                          </button>
                                          <button 
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            title="Usuń"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                       </div>
                                     )}
                                 </div>
                             ))}
                          </div>
                      )}
                   </div>

                   {/* Add New Event Form */}
                   <div className="pt-6 border-t border-white/10">
                      <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Dodaj Nowe</h4>
                      <div className="space-y-3">
                          <div className="flex gap-2">
                              {/* Type Selection */}
                              <button 
                                onClick={() => setNewEvent({...newEvent, type: 'CLASS'})}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${newEvent.type === 'CLASS' ? 'bg-accent text-white border-accent' : 'bg-transparent border-white/20 text-text-muted hover:border-white/40'}`}
                              >
                                Zajęcia
                              </button>
                              <button 
                                onClick={() => setNewEvent({...newEvent, type: 'EXAM'})}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${newEvent.type === 'EXAM' ? 'bg-secondary text-white border-secondary' : 'bg-transparent border-white/20 text-text-muted hover:border-white/40'}`}
                              >
                                Egzamin
                              </button>
                          </div>
                          <div className="flex gap-2">
                              <input 
                                  className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent focus:outline-none placeholder:text-text-muted/50"
                                  placeholder="Tytuł wydarzenia..."
                                  value={newEvent.title}
                                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                                  onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                              />
                              <button 
                                  onClick={handleAddEvent}
                                  disabled={!newEvent.title}
                                  className="bg-primary/20 text-primary border border-primary/50 px-3 py-2 rounded-lg font-bold text-sm hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                  <Plus size={18} />
                              </button>
                          </div>
                      </div>
                   </div>
               </div>
           </GlassCard>
        </div>
      )}

      <AppSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default SubjectDashboard;