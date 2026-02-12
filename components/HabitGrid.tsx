import React, { useRef, useEffect } from 'react';
import { Habit } from '../types';

interface HabitGridProps {
  habits: Habit[];
  dayLabels: number[];
  today: number;
  onToggle: (habitId: number, dayIndex: number) => void;
  onHabitAction: (habit: Habit) => void;
  sectionTitle: string;
}

const HabitGrid: React.FC<HabitGridProps> = ({ habits, dayLabels, today, onToggle, onHabitAction, sectionTitle }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to today on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Approximate width of a cell is roughly 2.5rem (w-6 + gaps) + padding
      // Simple calculation to center today
      const cellWidth = 40;
      const centerPos = (today * cellWidth) - (scrollContainerRef.current.clientWidth / 2);
      scrollContainerRef.current.scrollTo({ left: Math.max(0, centerPos), behavior: 'smooth' });
    }
  }, [today]);

  return (
    <section className="bg-[#111111] border border-zinc-900 rounded-2xl p-6 relative flex-1 flex flex-col min-h-0">
      <div className="overflow-x-auto custom-scrollbar" ref={scrollContainerRef}>
        <div className="min-w-[800px] pb-2">
          {/* Header da Grade */}
          <div className="flex gap-4 mb-6 border-b border-zinc-900 pb-4 sticky left-0 w-fit">
            <div className="w-48 shrink-0 sticky left-0 bg-[#111111] z-10">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{sectionTitle}</span>
            </div>
            <div className="flex gap-4">
              {dayLabels.map(day => (
                <div key={day} className="w-8 text-center shrink-0">
                  <span className={`text-[10px] font-bold ${day === today ? 'text-red-500' : 'text-zinc-600'}`}>
                    {day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Linhas de Hábitos */}
          <div className="flex flex-col gap-4">
            {habits.map(habit => (
              <div key={habit.id} className="flex gap-4 items-center group w-fit">
                {/* Habit Info Sticky Column */}
                <div
                  onClick={() => onHabitAction(habit)}
                  className="w-48 shrink-0 flex items-center gap-3 sticky left-0 bg-[#111111] z-10 cursor-pointer hover:bg-zinc-900/50 rounded-lg -ml-2 pl-2 py-1 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center ${habit.color} border border-zinc-800/50`}>
                    {habit.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-200 group-hover:text-white transition-colors truncate w-28">
                      {habit.name}
                    </h3>
                    <div className="w-full h-1 bg-zinc-900 rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/80 transition-all duration-500 ease-out"
                        style={{ width: `${(habit.completions.filter(Boolean).length / dayLabels.length) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex gap-4">
                  {habit.completions.map((isDone, dayIdx) => (
                    <button
                      key={dayIdx}
                      onClick={() => onToggle(habit.id, dayIdx)}
                      className={`
                        w-8 h-8 rounded-md border transition-all duration-200 shrink-0 flex items-center justify-center
                        ${isDone
                          ? 'bg-emerald-600 border-emerald-500 shadow-[0_0_10px_rgba(5,150,105,0.4)]'
                          : 'bg-[#1a1a1a] border-zinc-800 hover:border-zinc-700'
                        }
                        ${dayIdx + 1 === today ? 'ring-1 ring-red-500 ring-offset-1 ring-offset-[#111]' : ''}
                      `}
                    >
                      {isDone && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HabitGrid;