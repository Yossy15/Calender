import React from 'react';
import { Todo, ProjectCategory } from '../types';
import { Check, Trash2, Clock, Bell, GripVertical, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Particle {
  id: string;
  x: number;
  y: number;
  color: string;
  angle: number;
  speed: number;
  size: number;
}

interface TaskListProps {
  todos: Todo[];
  categories: ProjectCategory[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onEditTodo: (todo: Todo) => void;
  isLoading: boolean;
  onReorderTodos: (todos: Todo[]) => void;
  onBulkToggleTodos?: (ids: string[], targetStatus: boolean) => void;
  onBulkDeleteTodos?: (ids: string[]) => void;
}

export default function TaskList({ 
  todos, 
  categories, 
  onToggleTodo, 
  onDeleteTodo, 
  onEditTodo,
  isLoading,
  onReorderTodos,
  onBulkToggleTodos,
  onBulkDeleteTodos
}: TaskListProps) {
  
  // DRAG AND DROP PERSISTENT & TEMPORARY STATES
  const [localTodos, setLocalTodos] = React.useState<Todo[]>(todos);
  const [activeDragIndex, setActiveDragIndex] = React.useState<number | null>(null);
  const draggedIndexRef = React.useRef<number | null>(null);

  // MULTI-SELECTION STATE
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  // PARTICLES / CONFETTI STATE
  const [particles, setParticles] = React.useState<Particle[]>([]);

  const triggerConfetti = (clientX: number, clientY: number, todoId: string) => {
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f43f5e', '#ef4444'];
    const newParticles: Particle[] = Array.from({ length: 18 }).map((_, i) => ({
      id: `p-${todoId}-${Date.now()}-${i}-${Math.random()}`,
      x: clientX,
      y: clientY,
      color: colors[Math.floor(Math.random() * colors.length)],
      angle: (i / 18) * 2 * Math.PI + (Math.random() * 0.4 - 0.2),
      speed: 1.5 + Math.random() * 3.5,
      size: 4 + Math.random() * 5
    }));

    setParticles(prev => [...prev, ...newParticles]);

    // Cleanup after 1s
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  };

  const handleToggleClick = (e: React.MouseEvent<HTMLButtonElement>, id: string, completed: boolean) => {
    if (!completed) {
      let x = e.clientX;
      let y = e.clientY;
      if (x === 0 && y === 0) {
        const rect = e.currentTarget.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
      triggerConfetti(x, y, id);
    }
    onToggleTodo(id);
  };

  // Synchronize local list whenever incoming source array changes safely
  const todoIdsKey = todos.map(t => `${t.id}-${t.completed}`).join(',');
  React.useEffect(() => {
    setLocalTodos(todos);
  }, [todoIdsKey]);

  // Keep only selections that are still in current todos list when list dynamically updates
  React.useEffect(() => {
    const activeIds = todos.map(t => t.id);
    setSelectedIds(prev => prev.filter(id => activeIds.includes(id)));
  }, [todos]);

  const toggleSelectTodo = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === todos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(todos.map(t => t.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkComplete = (targetStatus: boolean) => {
    if (onBulkToggleTodos && selectedIds.length > 0) {
      onBulkToggleTodos(selectedIds, targetStatus);
    }
    setSelectedIds([]);
  };

  const handleBulkDelete = () => {
    if (onBulkDeleteTodos && selectedIds.length > 0) {
      onBulkDeleteTodos(selectedIds);
    }
    setSelectedIds([]);
  };

  const getCategoryColor = (projName: string) => {
    const found = categories.find(c => c.name === projName);
    return found ? found.color : '#3b82f6'; // Default blue
  };

  // DRAG HANDLERS
  const handleDragStart = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    setActiveDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const draggedIndex = draggedIndexRef.current;
    if (draggedIndex === null || draggedIndex === index) return;

    // Rearrange locally for instant tactile sliding animation
    const reorderedList = [...localTodos];
    const draggedItem = reorderedList[draggedIndex];
    
    reorderedList.splice(draggedIndex, 1);
    reorderedList.splice(index, 0, draggedItem);
    
    draggedIndexRef.current = index;
    setActiveDragIndex(index);
    setLocalTodos(reorderedList);
  };

  const handleDragEnd = () => {
    draggedIndexRef.current = null;
    setActiveDragIndex(null);
    onReorderTodos(localTodos);
  };

  if (isLoading) {
    return (
      <div id="taskListLoading" className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium font-thai">กำลังโหลดรายการงานของคุณ...</p>
      </div>
    );
  }

  if (todos.length === 0) {
    return (
      <div id="emptyTaskList" className="flex flex-col items-center justify-center py-24 text-center rounded-2xl bg-slate-900/10 border border-slate-800/10 p-8">
        <div className="w-16 h-16 bg-[#12161f] border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-3xl mb-4 shadow-lg shadow-black/20">
          📋
        </div>
        <h3 className="text-sm font-semibold text-slate-300 font-display">ไม่มีรายการที่จะแสดง</h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-sm">
          สร้างงานทดลองใหม่ หรือปรับตัวกรองของคุณเพื่อสแกนรายการอื่น
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Bulk Actions Panel */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-blue-950/20 border border-blue-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 shadow-xl shadow-blue-950/20"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="w-5 h-5 rounded border border-slate-700 hover:border-slate-500 bg-slate-950 flex items-center justify-center shrink-0 cursor-pointer"
                title={selectedIds.length === todos.length ? "ยกเลิกการเลือกทั้งหมด" : "เลือกทั้งหมด"}
              >
                {selectedIds.length === todos.length && <Check className="w-3 h-3 text-blue-500 stroke-[3]" />}
              </button>
              <span className="text-xs text-slate-300 font-semibold font-sans">
                เลือกแล้ว <span className="text-blue-400 font-bold">{selectedIds.length}</span> รายการ
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleBulkComplete(true)}
                className="px-2.5 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 text-[10.5px] font-bold rounded-lg border border-emerald-500/20 transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                ✓ เสร็จสิ้น
              </button>
              <button
                type="button"
                onClick={() => handleBulkComplete(false)}
                className="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10.5px] font-bold rounded-lg border border-blue-500/20 transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                ⟳ กำลังทำ
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-2.5 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 text-[10.5px] font-bold rounded-lg border border-rose-500/20 transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                🗑️ ลบที่เลือก
              </button>
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2 py-1.5 hover:bg-slate-800 text-slate-400 hover:text-white text-[10.5px] font-medium rounded-lg transition-all cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div id="taskListContainer" className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1 flex-1 font-sans">
        <AnimatePresence mode="popLayout">
          {localTodos.map((todo, index) => {
            const catColor = getCategoryColor(todo.project);
            const itemColor = todo.color || catColor;
            
            return (
              <motion.div
                id={`todoItem-${todo.id}`}
                key={todo.id}
                initial={{ opacity: 0, y: 15, scale: 0.96 }}
                animate={{ 
                  opacity: activeDragIndex === index ? 0.4 : todo.completed ? 0.6 : 1, 
                  y: 0, 
                  scale: activeDragIndex === index ? 0.98 : 1 
                }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                layout
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex flex-col p-3.5 rounded-xl sm:rounded-2xl border transition-all duration-200 group relative ${
                  activeDragIndex === index
                    ? 'border-blue-500 bg-blue-500/5 shadow-xl border-dashed'
                    : todo.completed
                    ? 'bg-slate-900/20 border-slate-800/20 border-l-4'
                    : todo.priority === 'high' || todo.color
                    ? 'bg-gradient-to-r from-slate-900/90 to-slate-800/80 border-slate-800/50 border-l-4'
                    : 'bg-slate-900/30 border-slate-800/30 hover:bg-slate-800/50 hover:border-slate-800/60 border-l-4'
                }`}
                style={{
                  borderLeftColor: activeDragIndex !== index ? itemColor : undefined
                }}
              >
                {/* Top Row: Checkboxes, Emoji, Task Text, stamp and edit controls */}
                <div className="flex items-center gap-2.5 w-full min-w-0">
                  {/* Multi-Select Checkbox */}
                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      id={`bulkSelectCheckbox-${todo.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectTodo(todo.id);
                      }}
                      className={`w-4.5 h-4.5 rounded border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                        selectedIds.includes(todo.id)
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-md'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 hover:bg-slate-900/60 text-transparent'
                      }`}
                      title={selectedIds.includes(todo.id) ? "ยกเลิกการเลือกงานนี้" : "เลือกงานนี้"}
                    >
                      {selectedIds.includes(todo.id) && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                    </button>
                  </div>

                  {/* Drag Handle Indicator */}
                  <div 
                    className="hidden sm:flex text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-800/50 duration-200 shrink-0"
                    title="ลากเพื่อจัดลำดับภารกิจ"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Custom Completion Checkbox */}
                  <button
                    id={`toggleTodoBtn-${todo.id}`}
                    onClick={(e) => handleToggleClick(e, todo.id, todo.completed)}
                    className={`w-5.5 h-5.5 rounded-lg border-2 transition-all flex items-center justify-center shrink-0 cursor-pointer mr-0.5 ${
                      todo.completed
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500'
                        : 'border-slate-700 bg-slate-800/20 hover:border-slate-500'
                    }`}
                    style={{
                      borderColor: !todo.completed && itemColor ? itemColor : undefined
                    }}
                  >
                    {todo.completed && (
                      <motion.div
                        initial={{ scale: 0, rotate: -35 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        className="flex items-center justify-center shrink-0"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                      </motion.div>
                    )}
                  </button>

                  {/* Custom Emoji Visual Badge Selection */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10 select-none bg-slate-800/40 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-lg shrink-0 mr-1 sm:mr-1.5 border border-slate-800/50 shadow-inner group-hover:scale-105 transition-all">
                    {todo.emoji || '📝'}
                  </div>

                  {/* Todo Content (Title) */}
                  <div className="flex-1 min-w-0 pr-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4
                        id={`todoText-${todo.id}`}
                        className={`text-xs sm:text-sm font-semibold transition-all break-words leading-snug sm:leading-relaxed ${
                          todo.completed
                            ? 'line-through text-slate-500 font-normal'
                            : 'text-slate-100'
                        }`}
                      >
                        {todo.text}
                      </h4>

                      {!todo.completed && todo.priority === 'high' && (
                        <span id={`priorityBadge-${todo.id}`} className="px-1.5 py-0.5 bg-orange-500/10 text-orange-400 text-[8px] sm:text-[9px] rounded font-bold uppercase tracking-wider shrink-0">
                          เร่งด่วน
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Panel */}
                  <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity whitespace-nowrap shrink-0">
                    <button
                      id={`editTodoBtn-${todo.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTodo(todo);
                      }}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800/40 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 flex items-center justify-center transition-all cursor-pointer"
                      title="แก้ไขรายละเอียดงาน"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`deleteTodoBtn-${todo.id}`}
                      onClick={() => onDeleteTodo(todo.id)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800/40 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                      title="ลบงานนี้ออก"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Secondary Row (Indented): Category, time information, metadata indicators */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-800/10 mt-2.5 pt-2 pl-6 sm:pl-[126px]">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[9.5px] sm:text-[10px] text-slate-500">
                    {/* Project Category Tag */}
                    <span id={`projectTag-${todo.id}`} className="flex items-center gap-1 font-medium text-slate-400 bg-slate-900/35 px-2 py-0.5 rounded-full border border-slate-800/40">
                      <span className="w-1.5 h-1.5 rounded-full inline-block mr-0.5 shrink-0" style={{ backgroundColor: itemColor }} />
                      {todo.project}
                    </span>

                    {/* Scheduled Time Alarm */}
                    {todo.time && (
                      <span id={`todoTimeInfo-${todo.id}`} className="flex items-center gap-1 text-slate-400 bg-slate-850/40 px-1.5 py-0.5 rounded-md border border-slate-800/40">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        <span>⏰ {todo.time} น.</span>
                      </span>
                    )}

                    {/* Alert Warning Text */}
                    {todo.time && todo.reminderMinutes !== undefined && (
                      <span id={`todoReminderInfo-${todo.id}`} className="flex items-center gap-1 text-slate-400 italic hidden sm:flex">
                        <Bell className="w-2.5 h-2.5 opacity-60" />
                        <span>เตือนล่วงหน้า {todo.reminderMinutes === 0 ? 'ตรงเวลา' : `${todo.reminderMinutes} นาที`}</span>
                      </span>
                    )}
                  </div>

                  {/* Right side decoration: Sticker & Attendees count */}
                  <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end w-full sm:w-auto mt-1 sm:mt-0">
                    {/* Attendees short list */}
                    {todo.attendees && todo.attendees.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[9px] font-bold text-slate-505 uppercase tracking-widest mr-0.5">ผู้เข้าร่วม:</span>
                        {todo.attendees.slice(0, 3).map((att, i) => {
                          const statusMap = {
                            needsAction: { label: '?', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
                            accepted: { label: '✓', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                            tentative: { label: '~', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                            declined: { label: '✕', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' }
                          };
                          const status = statusMap[att.responseStatus] || statusMap.needsAction;
                          return (
                            <div 
                              key={`${att.email}-${i}`} 
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-900/60 border border-slate-800/60 text-[9px] max-w-[90px]"
                              title={`${att.email} (${status.label})`}
                            >
                              <span className="text-slate-300 font-semibold truncate leading-none">
                                {att.displayName || att.email.split('@')[0]}
                              </span>
                              <span className={`px-0.5 rounded text-[8px] font-bold leading-none ${status.color}`}>
                                {status.label}
                              </span>
                            </div>
                          );
                        })}
                        {todo.attendees.length > 3 && (
                          <span className="text-[9px] text-slate-500 font-bold">+{todo.attendees.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Decorative GIF Sticker loop right align */}
                    {todo.gifUrl && (
                      <div className="select-none flex items-center justify-center shrink-0 w-14 h-14 rounded-xl bg-slate-950/25 p-0.5 border border-slate-800/40 overflow-hidden shadow-inner hover:scale-125 transition-transform duration-300">
                        <img
                          src={todo.gifUrl}
                          alt="Task Sticker"
                          className="max-w-full max-h-full object-contain cursor-default"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Dynamic Screen Particle/Confetti Effects Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        {particles.map(p => (
          <motion.div
            key={p.id}
            initial={{ 
              x: p.x, 
              y: p.y, 
              scale: 1, 
              opacity: 1 
            }}
            animate={{ 
              x: p.x + Math.cos(p.angle) * (p.speed * 42), 
              y: p.y + Math.sin(p.angle) * (p.speed * 42) + 36, // gravity falls
              scale: 0.25, 
              opacity: 0 
            }}
            transition={{ 
              duration: 0.85, 
              ease: [0.1, 0.8, 0.25, 1] 
            }}
            className="fixed rounded-full"
            style={{ 
              left: 0, 
              top: 0, 
              width: p.size, 
              height: p.size, 
              backgroundColor: p.color,
              boxShadow: `0 0 8px ${p.color}`
            }}
          />
        ))}
      </div>
    </div>
  );
}
