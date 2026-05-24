import React from 'react';
import { Todo } from '../types';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDeleteModalProps {
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  todo,
  isOpen,
  onClose,
  onConfirm
}: ConfirmDeleteModalProps) {
  if (!isOpen || !todo) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-md bg-[#12161f] border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative z-10 p-6 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close corner button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800/35 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="ปิด"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header section with AlertTriangle Icon */}
          <div className="flex items-start gap-3 pt-2">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                {todo.id === 'bulk-delete-action' ? 'ยืนยันการลบงานทั้งหมดที่เลือก?' : 'ยืนยันการลบงานนี้?'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                การลบรายการเหล่านี้จะไม่สามารถย้อนกลับได้ คุณต้องการดำเนินการต่อหรือไม่?
              </p>
            </div>
          </div>

          {/* Task Preview Panel so user has context on what they are deleting */}
          <div className="bg-[#0b0e14] border border-slate-800/50 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 select-none bg-rose-500/10 rounded-xl flex items-center justify-center text-xl shrink-0 border border-rose-500/20 shadow-inner">
              {todo.emoji || '🗑️'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs text-slate-400 font-medium">
                {todo.id === 'bulk-delete-action' ? 'การดำเนินการแบบกลุ่ม:' : 'งานที่คุณเลือก:'}
              </h4>
              <p className="text-sm font-semibold text-white truncate mt-0.5">{todo.text}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[10px] text-rose-400/80 bg-rose-550/10 border border-rose-950 px-2 py-0.5 rounded-md font-sans">
                  📁 {todo.project}
                </span>
                {todo.time && (
                  <span className="text-[10px] text-slate-500 bg-slate-800/30 border border-slate-800/40 px-2 py-0.5 rounded-md font-mono">
                    ⏰ {todo.time} น.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions footer button triggers */}
          <div className="flex items-center gap-3 pt-2">
            <button
              id="cancelDeleteTaskBtn"
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-800 transition-all cursor-pointer text-center"
            >
              ยกเลิก
            </button>
            <button
              id="confirmDeleteTaskBtn"
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-rose-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> ลบงานทันที
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
