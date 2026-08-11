import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, X, GripVertical, Pencil, Check } from 'lucide-react';
import {
    DndContext,
    closestCorners,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    CollisionDetection,
    useDroppable,
} from '@dnd-kit/core';
import {
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
    onMoveTask: (taskId: string, newDay: string, newIndex: number) => void;
    onEditTask: (taskId: string, text: string) => void;
}

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// --- Sortable Task Item ---
interface TaskItemProps {
    key?: React.Key;
    task: DailyTask;
    onDelete: (id: string) => void;
    onToggle: (id: string) => void;
    onEdit: (id: string, text: string) => void;
}

const TaskItem = ({ task, onDelete, onToggle, onEdit }: TaskItemProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(task.text);
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

    const saveEdit = () => {
        const trimmedText = text.trim();
        if (trimmedText && trimmedText !== task.text) onEdit(task.id, trimmedText);
        if (!trimmedText) setText(task.text);
        setIsEditing(false);
    };

    return (        <div
            ref={setNodeRef}
            style={style}
            className={`group bg-[#101728]/70 backdrop-blur-md p-3 rounded-xl border flex items-start justify-between gap-2 shadow-sm touch-none transition-all duration-200 ${isDragging ? 'border-blue-500 z-50 shadow-[0_0_20px_rgba(59,130,246,0.4)]' : 'border-white/[0.07] hover:border-white/[0.14]'
                }`}
        >
            <div className="flex items-start gap-2 overflow-hidden flex-1">
                {/* Drag Handle */}
                <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 flex-shrink-0">
                    <GripVertical size={14} />
                </div>

                <button
                    onClick={() => onToggle(task.id)}
                    className={`mt-0.5 flex-shrink-0 transition-colors ${task.completed ? 'text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'text-slate-600 hover:text-blue-400'
                        }`}
                >
                    {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            autoFocus
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') saveEdit();
                                if (event.key === 'Escape') {
                                    setText(task.text);
                                    setIsEditing(false);
                                }
                            }}
                            className="w-full bg-[#0e1424] border border-blue-500/50 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    ) : (
                        <span className={`text-sm leading-snug break-words whitespace-pre-wrap ${task.completed ? 'text-slate-500 line-through' : 'text-slate-200 font-medium'}`}>
                            {task.text}
                        </span>
                    )}
                </div>

            </div>
            <div className="flex flex-shrink-0">
                <button
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => isEditing ? saveEdit() : setIsEditing(true)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] rounded transition-all"
                    title={isEditing ? 'Salvar' : 'Editar'}
                >
                    {isEditing ? <Check size={14} /> : <Pencil size={14} />}
                </button>
                <button
                    onClick={() => onDelete(task.id)}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                    title="Excluir"
                >
                    <Trash2 size={14} />
                </button>
            </div>
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
    onEditTask: (id: string, text: string) => void;
}

const KanbanColumn = ({ day, tasks, onAddTask, onDeleteTask, onToggleTask, onEditTask }: KanbanColumnProps) => {
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
            className="flex flex-col min-w-[82vw] sm:min-w-[280px] md:min-w-[270px] bg-[#0d1220]/75 backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.4)] snap-center h-fit flex-shrink-0"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex justify-between items-center bg-transparent rounded-t-2xl sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{day}</span>
                    <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">
                        {tasks.length}
                    </span>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-1 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                    title="Adicionar tarefa"
                >
                    <Plus size={16} />
                </button>
            </div>

            {/* Tasks List */}
            <div className="p-2.5 flex flex-col gap-2 min-h-[164px]">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onDelete={onDeleteTask}
                            onToggle={onToggleTask}
                            onEdit={onEditTask}
                        />
                    ))}
                </SortableContext>

                {/* Adding Input */}
                {isAdding && (
                    <div className="bg-[#121828] p-2.5 rounded-xl border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)] animate-in fade-in zoom-in-95 duration-200">
                        <input
                            autoFocus
                            type="text"
                            value={newTaskText}
                            onChange={(e) => setNewTaskText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nova tarefa..."
                            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none mb-2"
                        />
                        <div className="flex justify-end gap-1">
                            <button
                                onClick={() => setIsAdding(false)}
                                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded"
                            >
                                <X size={14} />
                            </button>
                            <button
                                onClick={handleConfirmAdd}
                                className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded disabled:opacity-40"
                                disabled={!newTaskText.trim()}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {!isAdding && tasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-xs py-6 select-none italic">
                        Sem tarefas
                    </div>
                )}
            </div>
        </div>
    );
};

const collisionDetectionStrategy: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    return pointerCollisions.length > 0 ? pointerCollisions : closestCorners(args);
};

const WeeklyKanban: React.FC<WeeklyKanbanProps> = ({ tasks, onAddTask, onDeleteTask, onToggleTask, onMoveTask, onEditTask }) => {
    const [activeId, setActiveId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
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

        if (DAYS.includes(over.id as string)) {
            const targetDay = over.id as string;
            const targetIndex = tasks.filter(task => task.day === targetDay && task.id !== activeTask.id).length;
            onMoveTask(activeTask.id, targetDay, targetIndex);
        } else {
            const overTask = tasks.find(t => t.id === over.id);
            if (overTask) {
                const targetTasks = tasks.filter(task => task.day === overTask.day);
                const targetIndex = targetTasks.findIndex(task => task.id === overTask.id);
                onMoveTask(activeTask.id, overTask.day, targetIndex);
            }
        }
    };

    return (
        <div className="dashboard-card w-full p-5 md:p-6">
            <div className="flex items-end justify-between mb-5">
                <div>
                    <p className="section-label mb-1">Sua semana</p>
                    <h2 className="text-lg font-semibold text-slate-100">Planejamento Semanal</h2>
                </div>
                <p className="hidden sm:block text-xs text-slate-500">Arraste para reorganizar</p>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetectionStrategy}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                    {DAYS.map((day) => (
                        <KanbanColumn
                            key={day}
                            day={day}
                            tasks={tasks.filter(t => t.day === day)}
                            onAddTask={onAddTask}
                            onDeleteTask={onDeleteTask}
                            onToggleTask={onToggleTask}
                            onEditTask={onEditTask}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeId ? (
                        <div className="bg-[#121828] p-3 rounded-xl border border-blue-500/50 shadow-2xl opacity-90 w-[200px]">
                            <span className="text-sm text-slate-200">
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
