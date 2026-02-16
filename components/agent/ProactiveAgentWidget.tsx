import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, CalendarCheck, Share2, Download, Check } from 'lucide-react';
import GlassCard from '../ui/GlassCard';
import { generateStudyPlan } from '../../services/gemini';
import { User, Event, StudyBlockSuggestion } from '../../types';

interface ProactiveAgentWidgetProps {
  user: User;
  unreadDocsCount: number;
  upcomingExam: Event | null;
  onAcceptPlan: (blocks: StudyBlockSuggestion[]) => void;
}

const ProactiveAgentWidget: React.FC<ProactiveAgentWidgetProps> = ({ 
  user, 
  unreadDocsCount, 
  upcomingExam,
  onAcceptPlan
}) => {
  const [suggestion, setSuggestion] = useState<StudyBlockSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Logic to trigger the agent
  useEffect(() => {
    if (!upcomingExam || !user.agentEnabled) return;

    const today = new Date();
    const examDate = new Date(upcomingExam.date);
    const daysLeft = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    // Threshold: Less than 14 days and more than 3 unread docs, OR less than 3 days and > 0 docs
    const criticalThreshold = (daysLeft < 14 && unreadDocsCount > 3) || (daysLeft < 3 && unreadDocsCount > 0);

    if (criticalThreshold && !suggestion) {
      setIsVisible(true);
      handleGeneratePlan(daysLeft);
    }
  }, [upcomingExam, unreadDocsCount, user.agentEnabled]);

  const handleGeneratePlan = async (daysLeft: number) => {
    if (!upcomingExam) return;
    setLoading(true);
    try {
      const plan = await generateStudyPlan(
        user.major,
        daysLeft,
        unreadDocsCount,
        upcomingExam.title
      );
      setSuggestion(plan);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (!suggestion) return;
    const text = suggestion.map(s => `${new Date(s.date).toLocaleDateString()}: ${s.focus} (${s.durationMinutes}min)`).join('\n');
    const shareUrl = `mailto:?subject=Plan Nauki: ${upcomingExam?.title}&body=${encodeURIComponent(text)}`;
    
    // Fallback to clipboard if mailto isn't desired, but prompt asked for link/email.
    // We will do clipboard copy + alert for simplicity in a web app context
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Also try opening mail client
    window.location.href = shareUrl;
  };

  const handleDownloadICS = () => {
    if (!suggestion) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LoverAndLaw//PlanNauki//PL\n";
    
    suggestion.forEach(block => {
      const start = new Date(block.date);
      const end = new Date(start.getTime() + block.durationMinutes * 60000);
      
      const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `DTSTART:${formatDate(start)}\n`;
      icsContent += `DTEND:${formatDate(end)}\n`;
      icsContent += `SUMMARY:${block.focus}\n`;
      icsContent += `DESCRIPTION:${block.rationale}\n`;
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'plan_nauki.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <GlassCard className="border-l-4 border-l-accent !bg-gradient-to-r from-accent/10 to-transparent">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-accent/20 rounded-full text-accent shadow-[0_0_15px_rgba(232,121,249,0.3)]">
              <BrainCircuit size={24} />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start">
                  <h3 className="text-lg font-serif font-bold text-primary mb-1">
                    Interwencja Planera AI
                  </h3>
                  {suggestion && (
                    <div className="flex gap-2">
                        <button onClick={handleShare} className="p-1.5 hover:bg-white/10 rounded-full text-text-muted hover:text-accent transition-colors" title="Udostępnij / Wyślij">
                            {copied ? <Check size={16} /> : <Share2 size={16} />}
                        </button>
                        <button onClick={handleDownloadICS} className="p-1.5 hover:bg-white/10 rounded-full text-text-muted hover:text-accent transition-colors" title="Pobierz Kalendarz (.ics)">
                            <Download size={16} />
                        </button>
                    </div>
                  )}
              </div>
              
              {!suggestion && loading && (
                <div className="flex items-center gap-2 text-sm text-text-muted mt-2">
                   <span className="animate-pulse">Analizuję obciążenie i terminy...</span>
                </div>
              )}

              {suggestion && (
                <div className="mt-2">
                  <p className="text-sm text-text-muted mb-4">
                    <span className="font-semibold text-accent">Alert:</span> Masz {unreadDocsCount} nieprzeczytanych dokumentów, a termin "{upcomingExam?.title}" jest za {Math.ceil((new Date(upcomingExam!.date).getTime() - Date.now()) / (86400000))} dni.
                    Przygotowałem plan naprawczy.
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    {suggestion.slice(0, 3).map((block, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm bg-white/5 p-2 rounded border border-white/10">
                        <CalendarCheck size={14} className="text-secondary" />
                        <span className="font-medium">{new Date(block.date).toLocaleDateString('pl-PL')}</span>
                        <span className="text-text-muted">— {block.focus} ({block.durationMinutes}m)</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        onAcceptPlan(suggestion);
                        setIsVisible(false);
                      }}
                      className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-accent/30 transition-all hover:scale-105"
                    >
                      Akceptuj Plan
                    </button>
                    <button
                      onClick={() => setIsVisible(false)}
                      className="px-4 py-2 bg-transparent text-text-muted text-sm font-medium hover:text-text transition-colors"
                    >
                      Odrzuć
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProactiveAgentWidget;