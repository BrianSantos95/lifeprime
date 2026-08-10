import React, { useRef, useEffect } from 'react';
import { Habit } from '../types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check } from 'lucide-react';

interface HabitGridProps {
  habits: Habit[];
  dayLabels: number[];
  today: number;
  onToggle: (habitId: number, dayIndex: number) => void;
  onHabitAction: (habit: Habit) => void;
  onReorder: (newHabits: Habit[]) => void;
  sectionTitle: string;
}

// Sub-componente para tornar a linha arrastável
const SortableHabitRow = ({
  habit,
  dayLabels,
  today,
  onToggle,
  onHabitAction
}: {
  key?: React.Key;
  habit: Habit;
  dayLabels: number[];
  today: number;
  onToggle: (id: number, day: number) => void;
  onHabitAction: (h: Habit) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    position: isDragging ? 'relative' as const : undefined,
  };

  const completedCount = habit.completions.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / dayLabels.length) * 100);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex gap-4 items-center group w-fit ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Habit Info Sticky Column */}
      <div
        className="w-52 shrink-0 flex items-center gap-2 sticky left-0 bg-[#0b0e19]/90 backdrop-blur-md z-10 -ml-2 pl-2 py-1.5 rounded-xl border border-transparent group-hover:border-white/[0.04] transition-colors"
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors p-1"
        >
          <GripVertical size={14} />
        </div>

        <div
          onClick={() => onHabitAction(habit)}
          className="flex items-center gap-3 cursor-pointer hover:bg-white/[0.04] rounded-xl p-1.5 transition-colors flex-1 min-w-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.15)]">
            {habit.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate">
                {habit.name}
              </h3>
              <span className="text-[10px] text-slate-500 font-medium shrink-0">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800/80 rounded-full mt-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex gap-3.5 items-center">
        {habit.completions.map((isDone, dayIdx) => (
          <button
            key={dayIdx}
            onClick={() => onToggle(habit.id, dayIdx)}
            className={`
              w-7 h-7 rounded-xl border transition-all duration-200 shrink-0 flex items-center justify-center
              ${isDone
                ? 'bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 border-blue-400 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] scale-105'
                : 'bg-[#101726]/60 border-white/[0.08] hover:border-blue-500/40 hover:bg-white/[0.04]'
              }
              ${dayIdx + 1 === today ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#0b0e18]' : ''}
            `}
          >
            {isDone && <Check size={14} className="stroke-[3]" />}
          </button>
        ))}
      </div>
    </div>
  );
};

const HabitGrid: React.FC<HabitGridProps> = ({ habits, dayLabels, today, onToggle, onHabitAction, onReorder, sectionTitle }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = habits.findIndex((h) => h.id === active.id);
      const newIndex = habits.findIndex((h) => h.id === over.id);

      onReorder(arrayMove(habits, oldIndex, newIndex));
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const cellWidth = 38;
      const centerPos = (today * cellWidth) - (scrollContainerRef.current.clientWidth / 2);
      scrollContainerRef.current.scrollTo({ left: Math.max(0, centerPos), behavior: 'smooth' });
    }
  }, [today]);

  return (
    <section className="dashboard-card p-5 md:p-6 relative flex-1 flex flex-col min-h-0 mb-6">
      <div className="overflow-x-auto custom-scrollbar" ref={scrollContainerRef}>
        <div className="min-w-[820px] pb-2">
          {/* Header da Grade */}
          <div className="flex gap-4 mb-4 border-b border-white/[0.07] pb-3 sticky left-0 w-fit z-20">
            <div className="w-52 shrink-0 sticky left-0 bg-transparent z-30 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{sectionTitle}</span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                {habits.length}
              </span>
            </div>
            <div className="flex gap-3.5 items-center">
              {dayLabels.map(day => (
                <div key={day} className="w-7 text-center shrink-0">
                  <span className={`text-[11px] font-bold ${day === today ? 'text-blue-400 font-black' : 'text-slate-500'}`}>
                    {day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Linhas de Hábitos Sortable */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="flex flex-col gap-2.5">
              <SortableContext
                items={habits.map(h => h.id)}
                strategy={verticalListSortingStrategy}
              >
                {habits.map(habit => (
                  <SortableHabitRow
                    key={habit.id}
                    habit={habit}
                    dayLabels={dayLabels}
                    today={today}
                    onToggle={onToggle}
                    onHabitAction={onHabitAction}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>
        </div>
      </div>
    </section>
  );
};

export default HabitGrid;
