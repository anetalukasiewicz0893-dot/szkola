import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarCheck, BookOpen, Clock } from 'lucide-react';
import { Event } from '../../types';
import GlassCard from '../ui/GlassCard';

interface CalendarWidgetProps {
  events: Event[];
  onDateClick?: (date: Date) => void;
  className?: string;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ events, onDateClick, className }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const prevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getDaysArray = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // 0 = Sunday, 1 = Monday, ...
    let startingDayOfWeek = firstDay.getDay(); 
    // Adjust to Monday start: Mon(1)->0, Tue(2)->1, ... Sun(0)->6
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days: Date[] = [];
    // Go back to the previous Monday
    // Date constructor handles negative/zero days correctly by rolling back to previous month
    const startDate = new Date(year, month, 1 - startingDayOfWeek);

    // Generate 42 days (6 weeks) to cover all possibilities of a month view
    for (let i = 0; i < 42; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        days.push(d);
    }
    return days;
  };

  const days = getDaysArray();
  const weekDays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];

  const isSameDay = (d1: Date, d2: Date) => 
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
  
  const isToday = (d: Date) => isSameDay(d, new Date());
  const isSameMonth = (d: Date) => d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();

  return (
    <GlassCard className={`!p-0 overflow-hidden flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
        <h2 className="text-base md:text-lg font-serif font-bold text-primary capitalize">
          {currentMonth.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text cursor-pointer">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-text-muted hover:text-text cursor-pointer">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b border-white/10 bg-white/5">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-[10px] md:text-xs font-semibold text-text-muted uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-white/5 min-h-[300px]">
        {days.map(day => {
          const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
          const isCurrent = isSameMonth(day);
          
          return (
            <div 
              key={day.toISOString()}
              onClick={() => onDateClick && onDateClick(day)}
              className={`
                border-b border-r border-white/5 p-0.5 md:p-1 transition-colors relative cursor-pointer group
                ${!isCurrent ? 'bg-black/5 opacity-40' : 'hover:bg-white/10'}
                ${isToday(day) ? 'bg-accent/5' : ''}
              `}
            >
              <div className={`
                text-[10px] md:text-xs font-medium w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full mb-0.5 md:mb-1 ml-auto mr-auto transition-all
                ${isToday(day) ? 'bg-accent text-white shadow-lg' : 'text-text-muted'}
              `}>
                {day.getDate()}
              </div>

              <div className="space-y-0.5 overflow-hidden mt-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    className={`
                      text-[8px] md:text-[9px] px-1 py-0.5 rounded truncate flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform
                      ${event.type === 'EXAM' 
                        ? 'bg-secondary text-white shadow-sm' 
                        : event.type === 'CLASS'
                            ? 'bg-accent/20 text-accent border border-accent/30'
                            : 'bg-white/10 text-text-muted'
                      }
                    `}
                    title={event.title}
                  >
                    <span className="shrink-0">
                        {event.type === 'EXAM' && <CalendarCheck size={8} />}
                        {event.type === 'CLASS' && <Clock size={8} />}
                        {event.type === 'STUDY_BLOCK' && <BookOpen size={8} />}
                    </span>
                    <span className="truncate">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[8px] md:text-[9px] text-text-muted text-center leading-none">
                    +{dayEvents.length - 3} więcej
                  </div>
                )}
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none hidden md:flex">
                 <div className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm transform translate-y-4 transition-transform">
                   + Dodaj
                 </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="p-3 bg-white/5 border-t border-white/10 flex flex-wrap gap-2 md:gap-4 text-[10px] md:text-xs text-text-muted justify-center">
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-secondary"></div> Egzamin
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-accent/20 border border-accent/30"></div> Zajęcia
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/10"></div> Blok Nauki
         </div>
      </div>
    </GlassCard>
  );
};

export default CalendarWidget;