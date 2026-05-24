import React, { useState, useMemo } from 'react';
import { Todo, ProjectCategory } from '../types';
import { ChevronLeft, ChevronRight, Plus, Check, Trash2, Calendar, AlertCircle, Edit2 } from 'lucide-react';

interface CalendarViewProps {
  todos: Todo[];
  categories: ProjectCategory[];
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onEditTodo: (todo: Todo) => void;
  onOpenAddTaskWithDate: (dateStr: string) => void;
}

export default function CalendarView({
  todos,
  categories,
  onToggleTodo,
  onDeleteTodo,
  onEditTodo,
  onOpenAddTaskWithDate
}: CalendarViewProps) {
  // Current calendar month context
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Format today's date for defaults
  const todayISOString = useMemo(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }, []);

  // Currently selected date for showing task list, defaults to today
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayISOString);

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const thaiDays = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const thaiFullWeekDays = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDateStr(todayISOString);
  };

  // Generate days array for the grid
  const daysInMonthGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Day of the week of the first day (0 = Sun, 6 = Sat)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // 1. Pads from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonthDays - i);
      const prevDateStr = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0') + '-' + String(prevDate.getDate()).padStart(2, '0');
      days.push({
        num: prevMonthDays - i,
        dateStr: prevDateStr,
        isCurrentMonth: false,
        dateObj: prevDate
      });
    }

    // 2. Days of current month
    for (let i = 1; i <= totalDays; i++) {
      const currDate = new Date(year, month, i);
      const currDateStr = currDate.getFullYear() + '-' + String(currDate.getMonth() + 1).padStart(2, '0') + '-' + String(currDate.getDate()).padStart(2, '0');
      days.push({
        num: i,
        dateStr: currDateStr,
        isCurrentMonth: true,
        dateObj: currDate
      });
    }

    // 3. Pads from next month to fill complete grid of 42 cells (6 rows * 7 columns)
    const remainingCount = 42 - days.length;
    for (let i = 1; i <= remainingCount; i++) {
      const nextDate = new Date(year, month + 1, i);
      const nextDateStr = nextDate.getFullYear() + '-' + String(nextDate.getMonth() + 1).padStart(2, '0') + '-' + String(nextDate.getDate()).padStart(2, '0');
      days.push({
        num: i,
        dateStr: nextDateStr,
        isCurrentMonth: false,
        dateObj: nextDate
      });
    }

    return days;
  }, [currentMonth]);

  // Helper to extract tasks for a given date
  const getTasksForDate = (dateStr: string): Todo[] => {
    return todos.filter(t => {
      if (t.date) {
        return t.date === dateStr;
      }
      // Backward compatibility: match the date portion of createdAt
      if (t.createdAt) {
        return t.createdAt.split('T')[0] === dateStr;
      }
      return false;
    });
  };

  // Tasks for the currently selected date
  const selectedDateTasks = useMemo(() => {
    return getTasksForDate(selectedDateStr);
  }, [todos, selectedDateStr]);

  // Format a Thai human-readable date for the selected header
  const formattedSelectedDateHeader = useMemo(() => {
    const parts = selectedDateStr.split('-');
    if (parts.length !== 3) return selectedDateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    const dateObj = new Date(y, m, d);
    const dayName = thaiFullWeekDays[dateObj.getDay()];
    const monthName = thaiMonths[m];
    const thaiYear = y + 543;

    return `${dayName}ที่ ${d} ${monthName} พ.ศ. ${thaiYear}`;
  }, [selectedDateStr]);

  return (
    <div id="calendarViewContainer" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 select-none animate-fade-in text-white">
      
      {/* LEFT PANEL: The Month Calendar grid */}
      <div className="lg:col-span-7 bg-[#12161f] border border-slate-800/80 rounded-[24px] p-5 shadow-xl flex flex-col justify-between">
        <div>
          {/* Header Month Year & pagination navigation */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block leading-none mb-1">
                ตารางรายงานปฏิทิน
              </span>
              <h2 id="calendarMonthYearTitle" className="text-sm font-bold font-display flex items-center gap-1 text-slate-100">
                {thaiMonths[currentMonth.getMonth()]} {currentMonth.getFullYear() + 543}
              </h2>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="prevMonthBtn"
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button
                id="todayQuickBtn"
                type="button"
                onClick={handleGoToToday}
                className="px-3 py-1.5 text-[10px] font-bold rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all cursor-pointer"
              >
                วันนี้
              </button>

              <button
                id="nextMonthBtn"
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-all cursor-pointer"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday Labels Row */}
          <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
            {thaiDays.map((day, idx) => (
              <span 
                key={day} 
                className={`text-[10px] font-bold py-1 ${
                  idx === 0 
                    ? 'text-red-400/95' 
                    : idx === 6 
                    ? 'text-blue-400/95' 
                    : 'text-slate-500'
                }`}
              >
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Grid Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {daysInMonthGrid.map((day) => {
              const items = getTasksForDate(day.dateStr);
              const completedCount = items.filter(t => t.completed).length;
              const pendingCount = items.length - completedCount;
              
              const isSelected = selectedDateStr === day.dateStr;
              const isToday = todayISOString === day.dateStr;

              // Extract colors of custom category or custom task colors
              const uniqueColors = Array.from(new Set(items.map(t => {
                if (t.color) return t.color;
                const cat = categories.find(c => c.name === t.project);
                return cat ? cat.color : '#3b82f6';
              }))).slice(0, 3); // Max 3 colored dots per cell to look neat

              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDateStr(day.dateStr)}
                  className={`relative aspect-square rounded-2xl p-1 flex flex-col justify-between items-center outline-none cursor-pointer transition-all duration-300 ease-out border ${
                    isSelected
                      ? 'bg-blue-600 border-white text-white shadow-xl shadow-blue-900/40 scale-[1.06] z-10 ring-4 ring-blue-500/30 font-bold'
                      : isToday
                      ? 'bg-slate-900 hover:bg-slate-800 hover:scale-[1.03] border-blue-500/50 text-blue-400 font-semibold'
                      : day.isCurrentMonth
                      ? 'bg-slate-900/40 hover:bg-slate-905/80 hover:scale-[1.03] border-slate-850/50 text-slate-200 hover:border-slate-705/80'
                      : 'bg-transparent border-transparent text-slate-600 hover:text-slate-400 opacity-40 hover:scale-[1.03]'
                  }`}
                >
                  {/* Top: Day Number label */}
                  <span className="text-[11px] font-mono leading-none mt-1">
                    {day.num}
                  </span>

                  {/* Truncated task title directly inside the cell if fewer than 2 tasks (exactly 1) are scheduled */}
                  {items.length === 1 ? (
                    <div 
                      className={`text-[7px] sm:text-[8px] md:text-[9.5px] px-1 py-0.5 rounded-md truncate max-w-full w-full text-center select-none leading-tight ${
                        isSelected 
                          ? 'bg-white/20 text-white font-medium' 
                          : 'bg-slate-950/40 text-slate-300'
                      }`}
                      style={{ 
                        borderLeft: isSelected ? undefined : `2px solid ${uniqueColors[0] || '#3b82f6'}`
                      }}
                      title={items[0].text}
                    >
                      {items[0].text}
                    </div>
                  ) : null}

                  {/* Center/Bottom: Tasks density dots */}
                  <div className="flex gap-1 h-1.5 items-center justify-center mb-1 shrink-0 w-full">
                    {uniqueColors.map((color, colorIdx) => (
                      <span 
                        key={colorIdx} 
                        className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : ''}`}
                        style={{ backgroundColor: isSelected ? undefined : color }}
                      />
                    ))}
                    {items.length === 0 && (
                      <span className="w-1 h-1 bg-transparent" />
                    )}
                  </div>

                  {/* Corner indicator badge for pending count */}
                  {pendingCount > 0 && !isSelected && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend metrics of overall calendar tasks representation */}
        <div className="mt-5 pt-4 border-t border-slate-850/60 flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" /> งานที่กำลังทำ
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> ทำสำเร็จเรียบร้อย
            </span>
          </div>
          <div>
            <span>มีแผนงานทั้งหมด: <strong className="text-white font-mono">{todos.length}</strong> รายการ</span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Details & Manager of Tasks for this selected date */}
      <div className="lg:col-span-5 bg-[#12161f]/80 border border-slate-800/60 rounded-[24px] p-5 flex flex-col min-h-[400px]">
        
        {/* Detail date selection layout header */}
        <div className="pb-3 border-b border-slate-850/60 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block leading-none mb-1">
              แผนงานของวันที่ระบุ
            </span>
            <h3 id="calendarSelectedDateHeader" className="text-xs font-bold text-slate-200 truncate" title={formattedSelectedDateHeader}>
              {formattedSelectedDateHeader}
            </h3>
          </div>

          <button
            id="addCalendarTaskBtn"
            type="button"
            onClick={() => onOpenAddTaskWithDate(selectedDateStr)}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl flex items-center gap-1 cursor-pointer shrink-0 shadow-lg shadow-blue-900/35 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> เพิ่มแผนงาน
          </button>
        </div>

        {/* Tasks list area for Selected Date */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2.5 max-h-[350px] scrollbar-thin scrollbar-thumb-slate-800">
          {selectedDateTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3.5 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-slate-900/40 border border-slate-800/80 flex items-center justify-center text-slate-500 text-sm shadow-inner shadow-slate-950/40">
                <Calendar className="w-6 h-6 text-slate-500" />
              </div>
              <div className="space-y-1">
                <p className="text-[12px] font-semibold text-slate-300">ยังไม่มีแผนงานสำหรับวันนี้</p>
                <p className="text-[10px] text-slate-500 font-sans max-w-[200px] mx-auto leading-relaxed">เพิ่มแผนงานใหม่เพื่อเริ่มดำเนินการและติดตามกำหนดการของคุณ</p>
              </div>
              <button
                id="emptyStateAddCalendarTaskBtn"
                type="button"
                onClick={() => onOpenAddTaskWithDate(selectedDateStr)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-blue-400 hover:text-blue-300 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-slate-950/50 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> กดเพื่อเพิ่มแผนงาน
              </button>
            </div>
          ) : (
            selectedDateTasks.map((todo) => {
              // Custom colors helper
              const itemColor = todo.color || (() => {
                const cat = categories.find(c => c.name === todo.project);
                return cat ? cat.color : '#3b82f6';
              })();

              return (
                <div
                  id={`calendarTodoItem-${todo.id}`}
                  key={todo.id}
                  className={`p-3 bg-slate-950/20 border border-slate-900 border-l-4 rounded-xl flex items-center justify-between gap-3 transition-all ${
                    todo.completed ? 'opacity-55' : 'hover:bg-slate-900/30'
                  }`}
                  style={{ borderLeftColor: itemColor }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Checkbox circle trigger */}
                    <button
                      id={`calendarTodoCheckBtn-${todo.id}`}
                      type="button"
                      onClick={() => onToggleTodo(todo.id)}
                      className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        todo.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-700 hover:border-slate-500 bg-[#0d1017]'
                      }`}
                    >
                      {todo.completed && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                    </button>

                    {/* Emoji representation label */}
                    <span className="text-xs shrink-0 select-none">{todo.emoji || '📝'}</span>

                    {/* Text block info info */}
                    <div className="min-w-0 leading-normal flex-1">
                      <span className={`text-[11px] block truncate text-slate-100 ${todo.completed ? 'line-through text-slate-500' : 'font-medium'}`}>
                        {todo.text}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[8.5px] text-slate-500">
                        <span className="font-medium px-1 bg-slate-900 rounded border border-slate-800 truncate block max-w-[100px]" style={{ color: itemColor }}>
                          {todo.project}
                        </span>
                        {todo.time && (
                          <span className="font-mono text-[8px] bg-indigo-500/10 text-indigo-400 px-1 rounded flex items-center gap-0.5 shrink-0 border border-indigo-500/10">
                            ⏰ {todo.time} น.
                          </span>
                        )}
                        {todo.priority === 'high' && (
                          <span className="text-[8px] text-orange-400 bg-orange-500/10 px-1 rounded font-bold uppercase shrink-0 border border-orange-500/10">
                            ด่วน
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      id={`calendarTodoEditBtn-${todo.id}`}
                      type="button"
                      onClick={() => onEditTodo(todo)}
                      className="p-1 px-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all cursor-pointer"
                      title="แก้ไขแผนงานนี้"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`calendarTodoDeleteBtn-${todo.id}`}
                      type="button"
                      onClick={() => onDeleteTodo(todo.id)}
                      className="p-1 px-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                      title="ลบแผนงานนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected date small summary details advice footer */}
        <div className="mt-auto pt-3 border-t border-slate-850/50 text-[9px] text-slate-500 flex items-center gap-1.5 shrink-0 select-none">
          <AlertCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>วันที่นี้มี <span className="text-slate-300 font-bold font-mono">{selectedDateTasks.length}</span> แผนงาน ({selectedDateTasks.filter(t => t.completed).length} ลุล่วง, {selectedDateTasks.filter(t => !t.completed).length} อยู่ระหว่างทำ)</span>
        </div>

      </div>

    </div>
  );
}
