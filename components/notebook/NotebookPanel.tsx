
import React, { useState, useEffect, useRef } from 'react';
import { Document, ChatMessage } from '../../types';
import GlassCard from '../ui/GlassCard';
import { Sparkles, Send, BookOpen, Quote, FileText, Bot, Mic, PlayCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { notebookChat } from '../../services/gemini';

interface NotebookPanelProps {
  documents: Document[];
  subjectTitle: string;
}

const NotebookPanel: React.FC<NotebookPanelProps> = ({ documents, subjectTitle }) => {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
        id: 'intro',
        role: 'ai',
        content: 'Cześć! Jestem Twoim asystentem badawczym (Tier 2). Wybierz dokumenty z panelu po lewej stronie, aby rozpocząć dogłębną analizę kryminalistyczną lub prawną. Pamiętaj: cytuję tylko wskazane źródła.',
        timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds(prev => 
        prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!input.trim() || selectedDocIds.length === 0) return;

    const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: Date.now()
    };

    setChatHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    const contextDocs = documents
        .filter(d => selectedDocIds.includes(d.id))
        .map(d => ({ name: d.name, content: d.textContent || '' }));

    try {
        const response = await notebookChat(userMsg.content, contextDocs, chatHistory);
        setChatHistory(prev => [...prev, response]);
    } catch (e) {
        console.error(e);
    } finally {
        setIsThinking(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[600px] animate-in fade-in duration-500">
        {/* Left Panel: Source Selector */}
        <div className="lg:col-span-4 flex flex-col gap-4">
            <GlassCard className="flex-1 flex flex-col h-full !p-0 overflow-hidden bg-white/5">
                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                        <BookOpen size={18} />
                        <h3 className="font-serif font-bold">Źródła Badawcze</h3>
                    </div>
                    <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">{selectedDocIds.length} wybrano</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
                    {documents.length === 0 && (
                        <p className="text-sm text-text-muted p-4 italic text-center">Brak dokumentów. Wgraj je w zakładce "Dokumenty".</p>
                    )}
                    {documents.map(doc => {
                        const isSelected = selectedDocIds.includes(doc.id);
                        return (
                            <div 
                                key={doc.id}
                                onClick={() => toggleDocSelection(doc.id)}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 group ${
                                    isSelected 
                                    ? 'bg-accent/10 border-accent' 
                                    : 'bg-white/5 border-transparent hover:bg-white/10'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                    isSelected ? 'bg-accent border-accent' : 'border-white/20'
                                }`}>
                                    {isSelected && <Sparkles size={10} className="text-white" />}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-text-muted group-hover:text-text'}`}>
                                        {doc.name}
                                    </p>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] opacity-60">{doc.type}</span>
                                        {doc.cryptoEntities && doc.cryptoEntities.some(e => e.flagged) && (
                                            <span className="text-[10px] text-red-400 font-bold flex items-center gap-1">
                                                <ShieldAlert size={8} /> Risk
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                
                {/* Audio Overview Mock */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <button className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-text-muted hover:text-accent py-3 rounded-xl transition-all text-sm group">
                        <div className="p-1 bg-accent/20 rounded-full group-hover:scale-110 transition-transform">
                            <PlayCircle size={16} className="text-accent" />
                        </div>
                        Generuj Audio (Podcast)
                    </button>
                </div>
            </GlassCard>
        </div>

        {/* Right Panel: Chat Interface */}
        <div className="lg:col-span-8 flex flex-col h-full">
            <GlassCard className="flex-1 flex flex-col !p-0 overflow-hidden relative">
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center backdrop-blur-md z-10">
                     <div className="flex items-center gap-2">
                        <Bot size={18} className="text-accent" />
                        <h3 className="font-serif font-bold text-lg">Notebook Research</h3>
                     </div>
                     <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Deep Search Active
                     </div>
                </div>

                {/* Messages Area */}
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-black/10"
                >
                    {chatHistory.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                msg.role === 'ai' ? 'bg-accent/20 text-accent' : 'bg-white/10 text-text-muted'
                            }`}>
                                {msg.role === 'ai' ? <Sparkles size={16} /> : <div className="text-xs font-bold">TY</div>}
                            </div>
                            
                            <div className={`max-w-[80%] space-y-2`}>
                                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                    msg.role === 'ai' 
                                    ? 'bg-surface border border-white/10 text-text shadow-sm' 
                                    : 'bg-accent text-white shadow-lg shadow-accent/20'
                                }`}>
                                    {msg.content}
                                </div>
                                
                                {/* Citations */}
                                {msg.citations && msg.citations.length > 0 && (
                                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2">
                                        {msg.citations.map((cit, i) => (
                                            <div key={i} className="flex items-center gap-1.5 bg-black/20 border border-white/5 px-2 py-1 rounded text-[10px] text-text-muted hover:bg-black/30 transition-colors cursor-pointer">
                                                <Quote size={8} />
                                                {cit}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {isThinking && (
                        <div className="flex gap-4 animate-pulse">
                             <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                                <Sparkles size={16} className="text-accent" />
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-sm text-text-muted flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" />
                                Analizuję źródła i weryfikuję fakty...
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white/5 border-t border-white/10">
                    <div className="relative">
                        <input 
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={selectedDocIds.length > 0 ? "Zapytaj o wybrane dokumenty..." : "Najpierw wybierz źródła z panelu po lewej"}
                            disabled={selectedDocIds.length === 0 || isThinking}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-accent transition-all placeholder-text-muted/50 text-text"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking}
                            className="absolute right-2 top-2 p-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:bg-transparent disabled:text-text-muted transition-all"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </GlassCard>
        </div>
    </div>
  );
};

export default NotebookPanel;
