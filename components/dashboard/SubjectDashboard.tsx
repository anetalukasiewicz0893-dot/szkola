
import React, { useState, useEffect, useRef } from 'react';
import { User, Subject, Document, Collaborator, Book } from '../../types';
import * as db from '../../services/mockDb';
import * as gemini from '../../services/gemini';
import { extractTextFromFile } from '../../services/fileParsing';
import GlassCard from '../ui/GlassCard';
import UploadZone from '../files/UploadZone';
import FileRoster from '../files/FileRoster';
import NotebookPanel from '../notebook/NotebookPanel';
import { jsPDF } from 'jspdf';
import { 
  ArrowLeft, Save, Download, Edit2, Check, Clock, FileText, 
  Sparkles, Wand2, StickyNote, Trash2, Mail, Users, ExternalLink, Printer, Bot, BookOpen, Plus
} from 'lucide-react';
import AppSettings from '../settings/AppSettings';

interface SubjectDashboardProps {
  user: User;
  subject: Subject;
  onBack?: () => void;
  onDeleteSubject: (id: string) => void;
  onThemeChange: (theme: string) => void;
  variant?: 'full' | 'inline';
}

type Tab = 'documents' | 'notes' | 'notebook' | 'literature';

const SubjectDashboard: React.FC<SubjectDashboardProps> = ({ 
  user, 
  subject, 
  onBack, 
  onDeleteSubject, 
  onThemeChange,
  variant = 'full'
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>(subject.notes || '');
  const [isRefining, setIsRefining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [savingNotes, setSavingNotes] = useState(false);
  
  // Book Form State
  const [newBook, setNewBook] = useState({ title: '', author: '' });
  
  // Co-Op Mode State
  const [collaborators, setCollaborators] = useState<Collaborator[]>(subject.collaborators || []);
  const [showInviteUI, setShowInviteUI] = useState(false);

  // Edit Mode State
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerInfo, setHeaderInfo] = useState({ 
    professor: subject.professor, 
    ects: subject.ects,
    professorEmail: subject.professorEmail || ''
  });

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
    setBooks(await db.getBooks(subject.id));
  };

  const handleSaveHeader = async () => {
      await db.updateSubject(subject.id, {
          ects: headerInfo.ects,
          professor: headerInfo.professor,
          professorEmail: headerInfo.professorEmail
      });
      setIsEditingHeader(false);
  };

  const handleInvite = async () => {
      const newCollab: Collaborator = {
          id: Math.random().toString(),
          name: 'Student (Guest)',
          avatar: 'ST',
          role: 'editor'
      };
      const updatedCollaborators = [...collaborators, newCollab];
      setCollaborators(updatedCollaborators);
      await db.updateSubject(subject.id, { collaborators: updatedCollaborators });
      setShowInviteUI(false);
      alert("Invitation sent!");
  };

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.author) return;
    try {
      const saved = await db.saveBook({
        subjectId: subject.id,
        title: newBook.title,
        author: newBook.author
      });
      setBooks(prev => [...prev, saved]);
      setNewBook({ title: '', author: '' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteBook = async (id: string) => {
    await db.deleteBook(id);
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        let extractedText = '';
        try {
            extractedText = await extractTextFromFile(file);
        } catch (e) {
            console.error("Failed to parse file:", file.name, e);
            continue; 
        }

        const reader = new FileReader();
        await new Promise((resolve) => {
             reader.onload = async (e) => {
                 try {
                     const dataUrl = e.target?.result as string;
                     let cryptoEntities;
                     let analysisResult;
                     
                     if (gemini.isAiAvailable()) {
                        try {
                            analysisResult = await gemini.analyzeDocument(file.name, user.major, extractedText);
                            cryptoEntities = analysisResult.cryptoEntities;
                        } catch (aiError) {
                            console.error("AI Analysis failed:", aiError);
                        }
                     }

                     const newDoc = await db.saveDocument({
                        name: file.name,
                        size: (file.size / 1024).toFixed(2) + ' KB',
                        type: file.type || 'application/unknown',
                        dataUrl: dataUrl,
                        textContent: extractedText,
                        subjectId: subject.id,
                        isAnalyzed: !!cryptoEntities,
                        cryptoEntities: cryptoEntities,
                        summary: analysisResult?.executiveSummary,
                        tags: analysisResult?.tags
                     });
                     setDocuments(prev => [...prev, newDoc]);
                 } catch (saveError) {
                     console.error("Failed to save document:", saveError);
                 }
                 resolve(null);
             };
             reader.onerror = () => resolve(null);
             reader.readAsDataURL(file);
        });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to upload files.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyze = async (docId: string) => {
    if (!gemini.isAiAvailable()) {
       if(confirm("AI Intelligence is offline. Open settings to add API Key?")) {
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
        tags: analysis.tags,
        cryptoEntities: analysis.cryptoEntities
      });
      
      setDocuments(prev => prev.map(d => d.id === docId ? updated : d));
    } catch (err) {
      console.error(err);
      alert('Analysis failed.');
    } finally {
      setAnalyzingIds(prev => prev.filter(id => id !== docId));
    }
  };

  const handleDeleteDoc = async (docId: string) => {
      await db.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleDeleteSubject = () => {
    if (confirm(`Are you sure you want to delete "${subject.title}"? This cannot be undone.`)) {
      onDeleteSubject(subject.id);
    }
  };

  const handleRefineNotes = async () => {
    if (!notes) return;
    if (!gemini.isAiAvailable()) {
       if(confirm("AI Intelligence is offline. Open settings to add API Key?")) {
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
      alert("Failed to refine notes.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleExportPDF = () => {
    if (!notes) {
      alert("No notes to export.");
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
      doc.text(`Professor: ${subject.professor} | Date: ${new Date().toLocaleDateString()}`, margin, 28);
      
      doc.setDrawColor(200);
      doc.line(margin, 32, pageWidth - margin, 32);
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      const splitText = doc.splitTextToSize(notes, contentWidth);
      doc.text(splitText, margin, 42);

      doc.save(`Notes_${subject.title.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
      alert("Error generating PDF.");
    }
  };

  const isInline = variant === 'inline';

  return (
    <div className={`${isInline ? 'w-full pt-2' : 'min-h-screen p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full overflow-x-hidden'}`}>
      <div className={`${isInline ? '' : 'max-w-7xl mx-auto space-y-6 md:space-y-8'}`}>
        
        {/* Navigation & Header (Hidden in Inline Mode, except specific controls) */}
        {!isInline && (
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6">
            <div className="w-full lg:w-auto min-w-0">
               <div className="flex justify-between w-full">
                 <button 
                  onClick={onBack} 
                  className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-4 text-sm font-medium group"
                 >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
                  Back
                </button>
               </div>
              
              <div className="group w-full">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-4xl lg:text-5xl font-serif font-bold text-primary tracking-tight break-words max-w-full leading-tight">
                    {subject.title}
                  </h1>
                </div>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-3 pb-2">
               <button
                  onClick={handleDeleteSubject}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Delete Subject"
                >
                  <Trash2 size={20} />
                </button>
            </div>
          </div>
        )}

        {/* Info Bar (Visible in both, but compact in inline) */}
        <div className={`flex flex-wrap items-center gap-4 ${isInline ? 'mb-4 px-1' : 'mb-6'}`}>
            <div className="flex items-center gap-2 text-text-muted text-sm font-medium">
               {isEditingHeader ? (
                 <div className="flex flex-wrap gap-2 animate-in fade-in zoom-in-95 duration-200">
                      <input 
                          type="number"
                          value={headerInfo.ects}
                          onChange={(e) => setHeaderInfo(p => ({...p, ects: Number(e.target.value)}))}
                          className="bg-surface border border-white/20 rounded-lg px-2 py-1 text-sm text-text w-20 focus:outline-none focus:border-accent"
                          placeholder="ECTS"
                      />
                      <input 
                          value={headerInfo.professor}
                          onChange={(e) => setHeaderInfo(p => ({...p, professor: e.target.value}))}
                          className="bg-surface border border-white/20 rounded-lg px-2 py-1 text-sm text-text w-40 focus:outline-none focus:border-accent"
                          placeholder="Professor"
                      />
                       <input 
                          value={headerInfo.professorEmail}
                          onChange={(e) => setHeaderInfo(p => ({...p, professorEmail: e.target.value}))}
                          className="bg-surface border border-white/20 rounded-lg px-2 py-1 text-sm text-text w-48 focus:outline-none focus:border-accent"
                          placeholder="Email"
                      />
                      <button 
                          onClick={handleSaveHeader}
                          className="bg-accent/20 text-accent p-1 rounded-lg hover:bg-accent/30 transition-colors"
                      >
                          <Check size={14} />
                      </button>
                 </div>
               ) : (
                 <>
                    <span className="bg-surface/50 px-2 py-0.5 rounded border border-white/5 whitespace-nowrap">{headerInfo.ects} ECTS</span> 
                    <span>•</span> 
                    <span className="truncate">Prof. {headerInfo.professor || 'Unknown'}</span>
                    {headerInfo.professorEmail && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <a href={`mailto:${headerInfo.professorEmail}`} className="flex items-center gap-1 hover:text-accent transition-colors truncate">
                          <Mail size={14} /> <span className="hidden md:inline">{headerInfo.professorEmail}</span>
                        </a>
                      </>
                    )}
                    <button 
                      onClick={() => setIsEditingHeader(true)}
                      className="text-text-muted hover:text-accent p-1 ml-2 transition-colors"
                      title="Edit Info"
                    >
                      <Edit2 size={12} />
                    </button>
                 </>
               )}
            </div>

            {/* In inline mode, collaborator and delete buttons appear here if not in header */}
            {isInline && (
                <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => setShowInviteUI(!showInviteUI)} className="p-1.5 bg-white/5 rounded-lg text-text-muted hover:text-accent transition-colors" title="Collaborators">
                        <Users size={14} />
                    </button>
                    <button onClick={handleDeleteSubject} className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Class">
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>

        {/* Scrollable Tabs Container */}
        <div className="border-b border-white/10 pb-1 overflow-x-auto custom-scrollbar">
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'documents', label: 'Files & Analysis', icon: FileText },
              { id: 'literature', label: 'Books', icon: BookOpen },
              { id: 'notebook', label: 'Notebook AI', icon: Bot }, 
              { id: 'notes', label: 'Notes', icon: StickyNote },
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
        <div className="min-h-[400px]">
          
          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <div className="h-full min-h-[250px] md:min-h-[300px]">
                  <UploadZone 
                    onFilesSelected={handleFileUpload} 
                    isUploading={isUploading}
                  />
                  
                  <div className="mt-4 p-4 rounded-xl border border-white/5 bg-white/5">
                     <div className="flex items-center gap-2 text-text-muted mb-2">
                        <Sparkles size={14} className="text-accent" />
                        <span className="text-xs font-medium uppercase tracking-wider">Storage Info</span>
                     </div>
                     <p className="text-xs text-text-muted">Files are stored locally for AI analysis. We support PDF, DOCX, and TXT.</p>
                  </div>
                </div>
                
                <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar glass-panel rounded-xl p-2 bg-surface/30">
                    <div className="p-3 mb-2 flex justify-between items-center border-b border-white/10">
                        <h3 className="font-semibold text-text">Your Materials</h3>
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

          {/* LITERATURE TAB */}
          {activeTab === 'literature' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="md:col-span-1">
                       <GlassCard className="space-y-4">
                           <h3 className="font-serif font-bold text-lg text-primary">Add Recommended Book</h3>
                           <div className="space-y-3">
                               <input 
                                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                                  placeholder="Book Title"
                                  value={newBook.title}
                                  onChange={e => setNewBook({...newBook, title: e.target.value})}
                               />
                               <input 
                                  className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
                                  placeholder="Author"
                                  value={newBook.author}
                                  onChange={e => setNewBook({...newBook, author: e.target.value})}
                               />
                               <button 
                                  onClick={handleAddBook}
                                  disabled={!newBook.title || !newBook.author}
                                  className="w-full bg-accent text-white py-2 rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                               >
                                  <Plus size={16} /> Add Book
                               </button>
                           </div>
                       </GlassCard>
                   </div>
                   <div className="md:col-span-2">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {books.map(book => (
                               <GlassCard key={book.id} className="relative group hover:border-accent/50 transition-colors">
                                   <button 
                                      onClick={() => handleDeleteBook(book.id)}
                                      className="absolute top-2 right-2 p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                                   >
                                       <Trash2 size={14} />
                                   </button>
                                   <div className="flex items-start gap-3">
                                       <div className="p-3 bg-accent/10 rounded-lg text-accent">
                                           <BookOpen size={20} />
                                       </div>
                                       <div>
                                           <h4 className="font-semibold text-text line-clamp-2">{book.title}</h4>
                                           <p className="text-sm text-text-muted">{book.author}</p>
                                       </div>
                                   </div>
                               </GlassCard>
                           ))}
                           {books.length === 0 && (
                               <div className="col-span-full py-12 text-center text-text-muted border-2 border-dashed border-white/5 rounded-xl">
                                   No books added yet.
                               </div>
                           )}
                       </div>
                   </div>
              </div>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
             <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 h-[500px] md:h-[600px] flex flex-col">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <h2 className="text-xl font-serif font-bold text-primary">Case Notes</h2>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                          onClick={handleRefineNotes}
                          disabled={isRefining || !notes}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold bg-accent/10 text-accent hover:bg-accent/20 px-3 py-1.5 rounded-lg transition-colors border border-accent/20"
                      >
                          {isRefining ? <Clock size={14} className="animate-spin" /> : <Wand2 size={14} />}
                          Refine (AI)
                      </button>
                      <button 
                          onClick={handleExportPDF}
                          className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold bg-surface hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors border border-white/10"
                      >
                          <Download size={14} /> Export PDF
                      </button>
                    </div>
                </div>
                <GlassCard className="flex-1 flex flex-col relative overflow-hidden group !p-0 bg-surface/50">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-accent/40" />
                    <textarea
                      className="flex-1 bg-transparent resize-none focus:outline-none w-full h-full font-sans text-base md:text-lg placeholder-text-muted/40 p-4 md:p-6 leading-relaxed text-text"
                      placeholder="Start writing notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="p-3 border-t border-white/5 bg-white/5 flex justify-end">
                      <span className="text-xs text-text-muted flex items-center gap-1.5">
                          {savingNotes ? <Clock size={12} className="animate-spin" /> : <Save size={12} />} 
                          {savingNotes ? 'Saving...' : 'Auto-save'}
                      </span>
                    </div>
                </GlassCard>
             </div>
          )}

          {/* NOTEBOOK AI RESEARCH */}
          {activeTab === 'notebook' && (
             <NotebookPanel documents={documents} subjectTitle={subject.title} />
          )}
        </div>
      </div>
      
      <AppSettings isOpen={showSettings} onClose={() => setShowSettings(false)} user={user} onThemeChange={onThemeChange} />
    </div>
  );
};

export default SubjectDashboard;
