import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, X, GripVertical } from 'lucide-react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DailyTask } from '../types';

interface WeeklyKanbanProps {
    tasks: DailyTask[];
    onAddTask: (day: string, text: string) => void;
    onDeleteTask: (taskId: string) => void;
    onToggleTask: (taskId: string) => void;
    onMoveTask: (taskId: string, newDay: string) => void;
}

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// --- Sortable Task Item ---
interface TaskItemProps {
    key?: React.Key;
    task: DailyTask;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
}

const TaskItem = ({ task, onDelete, onToggle }: TaskItemProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id, data: task });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-[#1a1a1a] p-3 rounded-lg border flex items-start justify-between gap-2 shadow-sm touch-none ${isDragging ? 'border-red-500 z-50' : 'border-zinc-800 hover:border-zinc-700'
                }`}
        >
            <div className="flex items-start gap-2 overflow-hidden flex-1">
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-zinc-700 hover:text-zinc-500 flex-shrink-0">
                    <GripVertical size={14} />
                </div>

                <button
                    onClick={() => onToggle(task.id)}
                    className={`mt-0.5 flex-shrink-0 transition-colors ${task.completed ? 'text-green-500' : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                >
                    {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                    <span className={`text-sm leading-snug break-words whitespace-pre-wrap ${task.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                        {task.text}
                    </span>
                </div>

            </div>
            <button
                onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-all flex-shrink-0"
                title="Excluir"
            >
                <Trash2 size={14} />
            </button>
        </div>
    );
};

// --- Column Component ---
interface KanbanColumnProps {
    key?: React.Key;
    day: string;
    tasks: DailyTask[];
    onAddTask: (day: string, text: string) => void;
    onDeleteTask: (id: string) => void;
    onToggleTask: (id: string) => void;
}

const KanbanColumn = ({ day, tasks, onAddTask, onDeleteTask, onToggleTask }: KanbanColumnProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');

    const { setNodeRef } = useDroppable({
        id: day,
        data: { type: 'Column', day },
    });

    const handleConfirmAdd = () => {
        if (newTaskText.trim()) {
            onAddTask(day, newTaskText);
            setNewTaskText('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirmAdd();
        } else if (e.key === 'Escape') {
            setIsAdding(false);
            setNewTaskText('');
        }
    };

    return (
        <div
            ref={setNodeRef}
            className="flex flex-col min-w-[85vw] sm:min-w-[45vw] md:min-w-[300px] bg-[#111111] rounded-xl border border-zinc-800/50 snap-center h-fit flex-shrink-0"
        >
            {/* Header */}
            <div className="p-3 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/30 rounded-t-xl sticky top-0 z-10">
                <span className="font-semibold text-zinc-300 text-sm">{day}</span>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-red-400 transition-colors"
                    title="Adicionar tarefa"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Tasks List */}
            <div className="p-2 flex flex-col gap-2 min-h-[150px]">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onDelete={onDeleteTask}
                            onToggle={onToggleTask}
                        />
                    ))}
                </SortableContext>

                {/* Adding Input */}
                {isAdding && (
                    <div className="bg-[#1a1a1a] p-2 rounded-lg border border-red-500/30 animate-in fade-in zoom-in-95 duration-200">
                        <input
                            autoFocus
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nova tarefa..."
                            className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none mb-2"
                        />
                        <div className="flex justify-end gap-1">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded"
                            >
                                <X size={14} />
                            </button>
                            <button
                                onClick={handleConfirmAdd}
                                className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                                disabled={!newTaskText.trim()}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {!isAdding && tasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-zinc-800/50 text-xs py-4 select-none italic">
                        Sem tarefas
                    </div>
                )}
            </div>
        </div>
    );
};

const WeeklyKanban: React.FC<WeeklyKanbanProps> = ({ tasks, onAddTask, onDeleteTask, onToggleTask, onMoveTask }) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts (prevent accidental clicks)
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250, // Long press for 250ms on mobile
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeTask = tasks.find(t => t.id === active.id);
        if (!activeTask) return;

        // Check if dropped over a column (Day)
        if (DAYS.includes(over.id as string)) {
            if (activeTask.day !== over.id) {
                onMoveTask(activeTask.id, over.id as string);
            }
        } else {
            // Dropped over another task
            const overTask = tasks.find(t => t.id === over.id);
            if (overTask && overTask.day !== activeTask.day) {
                onMoveTask(activeTask.id, overTask.day);
            }
            // If same day, we could reorder, but for now we just support moving between days via drag.
            // Reordering within day would require an 'order' field in DailyTask.
            // The user request specified "mover uma tarefa para outro dia" (move a task to another day).
        }
    };

    return (
        <div className="w-full">
            <h2 className="text-xl font-bold text-zinc-200 mb-6">Planejamento Semanal</h2>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-pl-4 px-4 md:px-0">
                    {DAYS.map((day) => (
                        <KanbanColumn
                            key={day}
                            day={day}
                            tasks={tasks.filter(t => t.day === day)}
                            onAddTask={onAddTask}
                            onDeleteTask={onDeleteTask}
                            onToggleTask={onToggleTask}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-[#1a1a1a] p-3 rounded-lg border border-red-500 shadow-xl opacity-90 w-[200px]">
                            <span className="text-sm text-zinc-300">
                                {tasks.find(t => t.id === activeId)?.text}
                            </span>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
};

export default WeeklyKanban;
