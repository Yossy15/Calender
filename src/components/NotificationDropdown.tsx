import React from 'react';
import { NotificationLog } from '../types';
import { Bell, Check, X, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface NotificationDropdownProps {
  logs: NotificationLog[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onMarkAllRead: () => void;
  onClose: () => void;
  isOpen: boolean;
  onSnooze?: (logId: string, todoId: string, minutes: number) => void;
}

export default function NotificationDropdown({
  logs,
  onMarkRead,
  onClearAll,
  onMarkAllRead,
  onClose,
  isOpen,
  onSnooze
}: NotificationDropdownProps) {
  if (!isOpen) return null;

  return (
    <motion.div
      id="notificationDropdownMenu"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute right-[-48px] sm:right-0 mt-3.5 w-[calc(100vw-32px)] xs:w-[350px] sm:w-[380px] bg-[#0f131a] border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden font-sans"
    >
      {/* Header section */}
      <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-4 h-4 text-blue-400" />
            {logs.some(l => !l.read) && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide font-display">
            การแจ้งเตือน
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              id="clearAllNotificationsBtn"
              type="button"
              onClick={onClearAll}
              className="px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition-all cursor-pointer flex items-center gap-1"
              title="ล้างการแจ้งเตือนทั้งหมด"
            >
              <Trash2 className="w-3 h-3" />
              ล้างทั้งหมด
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="ปิด"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications list body */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
        {logs.length === 0 ? (
          <div id="emptyNotifications" className="p-10 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-center text-slate-500 mb-3 shadow-inner">
              🔔
            </div>
            <p className="text-xs font-semibold text-slate-300 font-display">ไม่มีแจ้งเตือนใหม่ในขณะนี้</p>
            <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-relaxed px-4">
              กำหนดเวลาแจ้งเตือนในภารกิจของคุณเพื่อส่งสัญญาณเตือนแบบเรียลไทม์
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            {logs.map((log) => (
              <div
                id={`notificationItem-${log.id}`}
                key={log.id}
                onClick={() => onMarkRead(log.id)}
                className={`p-3.5 hover:bg-slate-900/45 transition-all flex gap-3 cursor-pointer items-start border-l-[3.5px] ${
                  !log.read 
                    ? 'bg-blue-500/[0.03] border-blue-500' 
                    : 'bg-transparent border-transparent opacity-65 hover:opacity-100'
                }`}
              >
                {/* Visual state icon / dot indicator */}
                <div className="shrink-0 mt-1">
                  {!log.read ? (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  ) : (
                    <div className="w-1.5 h-1.5 bg-slate-700/80 rounded-full" />
                  )}
                </div>

                {/* Content area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs leading-tight sm:leading-snug ${!log.read ? 'font-bold text-slate-100' : 'font-medium text-slate-400'}`}>
                      {log.title}
                    </p>
                    <span className="text-[9px] text-slate-500 whitespace-nowrap mt-0.5 font-mono">
                      {log.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1 break-words">
                    {log.message}
                  </p>
                  {!log.read && log.todoId && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/40 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9.5px] text-slate-500 font-medium">💤 เลื่อนเตือน:</span>
                      {[10, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onSnooze) {
                              onSnooze(log.id, log.todoId, mins);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-blue-600/20 hover:text-blue-400 text-slate-350 text-[10px] font-bold transition-all border border-slate-700/60 hover:border-blue-500/30 cursor-pointer"
                        >
                          +{mins} นาที
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm state trigger button */}
                {!log.read && (
                  <button
                    id={`markReadBtn-${log.id}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead(log.id);
                    }}
                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-emerald-500/20 text-blue-400 hover:text-emerald-400 border border-blue-500/20 hover:border-emerald-500/30 transition-all shrink-0 self-center cursor-pointer ml-1"
                    title="อ่านแล้ว"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer controls action bar */}
      {logs.length > 0 && logs.some(l => !l.read) && (
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-center">
          <button
            id="markAllReadBtn"
            type="button"
            onClick={onMarkAllRead}
            className="w-full py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[11px] sm:text-xs font-semibold rounded-lg border border-blue-500/20 hover:border-blue-500/35 transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            อ่านการแจ้งเตือนทั้งหมดแล้ว
          </button>
        </div>
      )}
    </motion.div>
  );
}
