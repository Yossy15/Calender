import React, { useState } from 'react';
import { 
  X, 
  Database, 
  User, 
  LogOut, 
  RefreshCw, 
  Calendar, 
  Settings, 
  ShieldAlert, 
  Check,
  Volume2,
  VolumeX,
  Download,
  Trash2,
  CloudLightning,
  CloudOff,
  Cloud,
  ArrowRight,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { UserProfile, Todo } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  isSyncEnabled: boolean;
  onToggleSync: (enabled: boolean) => void;
  isSyncing: boolean;
  lastSyncTime: string;
  onSwitchAccount: () => void;
  onLogin: () => void;
  onLogout: () => void;
  isCalendarSyncing: boolean;
  onSyncCalendar: () => void;
  isSoundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onExportData: () => void;
  onClearCache: () => void;
  
  // New props for Pending Sync tab
  pendingSyncTodos: Todo[];
  onForceSyncTodo: (id: string) => Promise<void>;
  onForceSyncAll: () => Promise<void>;
  isOfflineSimulated: boolean;
  onToggleOfflineSimulation: () => void;

  // New props for Multi-Account support
  savedUsers?: UserProfile[];
  onSwitchToSavedUser?: (profile: UserProfile) => void;
  onAddAccount?: () => void;
  onRemoveSavedAccount?: (uid: string) => void;

  // Custom bypass simulation & error display
  authError?: string | null;
  onLoginWithEmail?: (email: string) => void;
  onAddAccountWithEmail?: (email: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  isSyncEnabled,
  onToggleSync,
  isSyncing,
  lastSyncTime,
  onSwitchAccount,
  onLogin,
  onLogout,
  isCalendarSyncing,
  onSyncCalendar,
  isSoundEnabled,
  onToggleSound,
  onExportData,
  onClearCache,
  pendingSyncTodos = [],
  onForceSyncTodo,
  onForceSyncAll,
  isOfflineSimulated,
  onToggleOfflineSimulation,
  savedUsers = [],
  onSwitchToSavedUser,
  onAddAccount,
  onRemoveSavedAccount,
  authError = null,
  onLoginWithEmail,
  onAddAccountWithEmail
}: SettingsModalProps) {
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'pendingSync'>('general');
  const [syncingTodoId, setSyncingTodoId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [manualEmail, setManualEmail] = useState('');
  const [isAddingEmailAccount, setIsAddingEmailAccount] = useState(false);
  const [newAccountEmail, setNewAccountEmail] = useState('');

  if (!isOpen) return null;

  const handleForceSyncTodoLocally = async (id: string) => {
    setSyncingTodoId(id);
    try {
      await onForceSyncTodo(id);
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingTodoId(null);
    }
  };

  const handleForceSyncAllLocally = async () => {
    setSyncingAll(true);
    try {
      await onForceSyncAll();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <div id="settingsModalOverlay" className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      {/* Modal Container */}
      <div 
        id="settingsModalContent" 
        className="w-full max-w-lg bg-[#0e121a] rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Settings className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">ระบบควบคุมผู้ใช้และการตั้งค่า</h3>
              <p className="text-[10px] text-slate-500">ควบคุมข้อมูล ส่วนควบคุมเบื้องหลัง และจำลองซิงค์คลาวด์</p>
            </div>
          </div>
          <button
            id="closeSettingsBtn"
            onClick={onClose}
            className="p-1 px-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher Navigation */}
        <div className="flex border-b border-slate-800/50 bg-slate-950/20 px-4 shrink-0">
          <button
            id="tabGeneralSettingsBtn"
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 text-center text-xs font-bold font-display border-b-2 transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-450 font-black'
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            ⚙️ ตั้งค่าระบบทั่วไป
          </button>
          <button
            id="tabPendingSyncBtn"
            type="button"
            onClick={() => setActiveTab('pendingSync')}
            className={`flex-1 py-3 text-center text-xs font-bold font-display border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'pendingSync'
                ? 'border-amber-500 text-amber-400 font-black'
                : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
          >
            ⏳ รายการค้างอัปโหลด
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black leading-none ${
              pendingSyncTodos.length > 0 
                ? 'bg-amber-500/20 text-amber-400 animate-pulse' 
                : 'bg-slate-800 text-slate-500'
            }`}>
              {pendingSyncTodos.length}
            </span>
          </button>
        </div>

        {/* View Content area based on selected tab */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {activeTab === 'general' ? (
            <>
              {/* SEC 1: Storage and Sync */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ระบบเก็บข้อมูล & ซิงค์งาน</h4>
                
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-white">การจัดเก็บและซิงค์งาน (Storage & Sync)</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal max-w-[320px]">
                        เมื่อเปิด: ข้อมูลของคุณจะถูกส่งไปซิงค์บน Firebase Realtime Database อัตโนมัติ ป้องกันข้อมูลสูญหาย
                      </p>
                    </div>

                    {/* Custom Cupertino Style Toggle Switch */}
                    <button
                      id="toggleSyncBtn"
                      type="button"
                      onClick={() => onToggleSync(!isSyncEnabled)}
                      className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 ${
                        isSyncEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                          isSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Status Info */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[10px] flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${isSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                      <span>สถานะ: {isSyncEnabled ? 'ซิงค์ออนไลน์ทำงานอยู่ (Real-time)' : 'เซฟเฉพาะโหมดออฟไลน์ภายในเครื่อง'}</span>
                    </div>
                    {isSyncEnabled && (
                      <span className="text-slate-500 text-[9px] truncate max-w-[120px]">{lastSyncTime}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* SEC SOUND: Sound Settings */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ฟังก์ชั่นเสียงแจ้งเตือน & ปุ่มการทำงาน</h4>
                
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {isSoundEnabled ? (
                        <Volume2 className="w-4 h-4 text-amber-400 animate-bounce" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      )}
                      <span className="text-xs font-semibold text-white">เสียงในระบบสัมผัส (System Sound FX)</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal max-w-[320px]">
                      เปิดหรือปิดเสียงจำลอง Chime ตอนเช็คสถานะงาน, เกิดป๊อปอัพแจ้งเตือน และงานเสร็จสิ้น
                    </p>
                  </div>

                  {/* Custom Cupertino Style Toggle Switch for Sound */}
                  <button
                    id="toggleSoundBtn"
                    type="button"
                    onClick={() => onToggleSound(!isSoundEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 ${
                      isSoundEnabled ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                        isSoundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* SEC 2: Switch & Link Accounts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">บัญชีผู้ใช้งานและบริการซิงค์ (Multi-Accounts)</h4>
                  {user && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingEmailAccount(!isAddingEmailAccount)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <UserPlus className="w-3 h-3" />
                        {isAddingEmailAccount ? '✖️ ยกเลิกพิมพ์อีเมล' : '+ เพิ่มบัญชีด้วยอีเมลใหม่'}
                      </button>
                      {onAddAccount && !isAddingEmailAccount && (
                        <button
                          id="addNewAccountHeaderBtn"
                          type="button"
                          onClick={onAddAccount}
                          className="text-[10px] text-slate-400 hover:text-white font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 border-l border-slate-800 pl-2"
                        >
                          🌐 ผ่าน Google Account
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isAddingEmailAccount && (
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2.5 animate-fade-in text-left">
                    <span className="text-[10px] font-bold text-slate-400 block">กรอกและสร้างบัญชีเสริมใหม่ด้วยตนเอง:</span>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="กรอกอีเมล Google ใหม่ เช่น team.dev@gmail.com..."
                        value={newAccountEmail}
                        onChange={(e) => setNewAccountEmail(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-[#0b0e14] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 font-sans"
                      />
                      <button
                        type="button"
                        disabled={!newAccountEmail.trim().includes('@')}
                        onClick={() => {
                          if (onAddAccountWithEmail && newAccountEmail.trim()) {
                            onAddAccountWithEmail(newAccountEmail.trim());
                            setNewAccountEmail('');
                            setIsAddingEmailAccount(false);
                          }
                        }}
                        className="px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-45 disabled:hover:bg-blue-650 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1"
                      >
                        เพิ่มด่วน
                      </button>
                    </div>
                  </div>
                )}

                {user ? (
                  <div className="space-y-3">
                    {/* Active Account Card */}
                    <div id="activeUserAccountCard" className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-500/20 shadow-lg relative overflow-hidden">
                      <div className="absolute top-2 right-3 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-bold">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        กำลังใช้งานอยู่
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-0.5 shadow-md shrink-0">
                          {user.photoURL ? (
                            <img referrerPolicy="no-referrer" src={user.photoURL} className="w-full h-full rounded-full object-cover" alt="Profile" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-slate-850 flex items-center justify-center text-white font-bold text-xs">
                              {user.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-black text-white truncate">{user.displayName}</h5>
                          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                          {user.isDemo && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md text-[8.5px] bg-amber-500/10 text-amber-500 font-bold font-mono">
                              Demo Account
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-3.5 pt-2.5 border-t border-slate-800/50">
                        <button
                          id="switchAccountBtn"
                          type="button"
                          onClick={onSwitchAccount}
                          className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[9.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-700/60"
                        >
                          <RefreshCw className="w-3 h-3 text-blue-400" />
                          สลับบัญชีด่วน
                        </button>
                        <button
                          id="signOutSettingsBtn"
                          type="button"
                          onClick={onLogout}
                          className="py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white text-[9.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-rose-500/15"
                        >
                          <LogOut className="w-3 h-3" />
                          ลงชื่อออก
                        </button>
                      </div>
                    </div>

                    {/* Saved Accounts List Section */}
                    {savedUsers.filter(u => u.uid !== user?.uid).length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[9.5px] font-bold text-slate-450 uppercase block tracking-wider px-1">
                          บัญชีอื่นในระบบเครื่องนี้ ({savedUsers.filter(u => u.uid !== user?.uid).length})
                        </span>
                        
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar">
                          {savedUsers.filter(u => u.uid !== user?.uid).map((savedUser) => (
                            <div 
                              key={savedUser.uid}
                              className="p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-850 flex items-center justify-between gap-3 group transition-all"
                            >
                              <button
                                type="button"
                                onClick={() => onSwitchToSavedUser && onSwitchToSavedUser(savedUser)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-300 overflow-hidden shrink-0">
                                  {savedUser.photoURL ? (
                                    <img referrerPolicy="no-referrer" src={savedUser.photoURL} className="w-full h-full object-cover" alt="Profile" />
                                  ) : (
                                    savedUser.displayName.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[11px] font-bold text-slate-300 group-hover:text-white truncate">
                                    {savedUser.displayName}
                                  </div>
                                  <div className="text-[9px] text-slate-500 truncate">{savedUser.email}</div>
                                </div>
                              </button>
                              
                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                                <button
                                  type="button"
                                  onClick={() => onSwitchToSavedUser && onSwitchToSavedUser(savedUser)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-blue-600 hover:text-white text-[9px] font-bold rounded text-slate-400 cursor-pointer"
                                  title="สลับไปใช้งาน"
                                >
                                  สลับ
                                </button>
                                {onRemoveSavedAccount && (
                                  <button
                                    type="button"
                                    onClick={() => onRemoveSavedAccount(savedUser.uid)}
                                    className="p-1 text-slate-500 hover:text-rose-450 hover:bg-rose-500/10 rounded cursor-pointer transition-all"
                                    title="เอาออก"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-[#141822] border border-slate-800/80 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-white">ยังไม่มีการซิงค์บัญชีผู้ใช้งาน</h5>
                      <p className="text-[9.5px] text-slate-400 leading-normal max-w-xs mx-auto font-sans">
                        เชื่อมโยงบัญชีเพื่อสำรองข้อมูลแผนงานของคุณบนระบบ Cloud และประสานงานปฏิทินเต็มรูปแบบ
                      </p>
                    </div>

                    {authError && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left text-amber-400 text-[10px] space-y-1 animate-pulse">
                        <div className="font-bold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Google Authentication Closed / Blocked</span>
                        </div>
                        <p className="text-[9px] text-slate-350 leading-normal font-sans">
                          เนื่องจากไม่สามารถเปิดหน้าต่างป๊อปอัป Google ได้ (Popup blocked หรือถูกยกเลิก) ท่านสามารถพิมพ์อีเมลเพื่อเข้าใช้งานเซสชั่นซิงค์จำลองด้านล่างนี้ได้เลยครับ!
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-2.5 max-w-[280px] mx-auto pt-1">
                      <button
                        id="loginSettingsBtn"
                        type="button"
                        onClick={onLogin}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-[10.5px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md w-full"
                      >
                        🌐 ซิงค์บัญชี Google (Popup)
                      </button>

                      <div className="relative py-2 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-850"></div></div>
                        <span className="relative px-2.5 text-[9px] text-slate-500 bg-[#141822] font-semibold uppercase tracking-wider">หรือระบุอีเมลเอง</span>
                      </div>

                      <div className="space-y-1.5 text-left">
                        <input
                          type="email"
                          placeholder="กรอกอีเมลใหม่ เช่น yourname@gmail.com..."
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0b0e14] border border-slate-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 font-sans"
                        />
                        <button
                          type="button"
                          disabled={!manualEmail.trim().includes('@')}
                          onClick={() => {
                            if (onLoginWithEmail && manualEmail.trim()) {
                              onLoginWithEmail(manualEmail.trim());
                              setManualEmail('');
                            }
                          }}
                          className="w-full py-2 bg-slate-850 hover:bg-blue-600 disabled:opacity-40 disabled:hover:bg-slate-850 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          ลงชื่อเข้าใช้งานด้วยอีเมลนี้
                        </button>
                      </div>

                      {/* Optional list from savedUsers even when no user currently loaded */}
                      {savedUsers.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/40 text-left">
                          <span className="text-[8.5px] text-slate-500 block mb-1 font-bold">เลือกจากบัญชีที่เคยบันทึกไว้:</span>
                          <div className="space-y-1.5">
                            {savedUsers.map(su => (
                              <button
                                key={su.uid}
                                type="button"
                                onClick={() => onSwitchToSavedUser && onSwitchToSavedUser(su)}
                                className="w-full text-left p-1.5 rounded-lg bg-slate-900 border border-slate-850 text-[9px] text-slate-350 truncate flex items-center justify-between cursor-pointer hover:bg-slate-850 hover:text-white"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-450 shrink-0" />
                                  <span className="truncate">{su.displayName} ({su.email})</span>
                                </div>
                                <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-450 shrink-0">สลับ</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SEC 3: Google Calendar Sync */}
              {user && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">บูรณาการกับ Google Calendar</h4>
                  
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        <span>จัดการปฏิทินงานทันที</span>
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                      คุณสามารถคัดลอก และซิงค์แผนงานทั้งหมด (ที่มีการกำหนดวันที่) ไปยัง Google Calendar จริงของคุณ เพื่อให้ไม่มีงานใดตกหล่น
                    </p>

                    <button
                      id="syncCalendarSettingsBtn"
                      type="button"
                      onClick={onSyncCalendar}
                      disabled={isCalendarSyncing}
                      className={`w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.01] ${
                        isCalendarSyncing ? 'opacity-80 cursor-wait' : ''
                      }`}
                    >
                      {isCalendarSyncing ? (
                        <>
                          <span className="animate-spin text-xs">⏳</span> กำลังส่งปฏิทิน...
                        </>
                      ) : (
                        <>
                          <span>🔄</span> ซิงค์แผนงานกับปฏิทินปัจจุบัน
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* SEC 4: Data Management Section */}
              <div className="space-y-3 pb-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">การจัดการข้อมูล (Data Management)</h4>
                
                <div className="p-4 rounded-2xl bg-[#141822] border border-slate-800/80 space-y-4">
                  <p className="text-[10.5px] text-slate-400 leading-normal">
                    คุณสามารถส่งออกข้อมูลแผนงานทั้งหมดเป็นไฟล์ JSON เพื่อสำรอง หรือล้างหน่วยความจำแคชของแอพพลิเคชันเพื่อเริ่มต้นใหม่ทั้งหมดได้
                  </p>

                  <div className="flex flex-col gap-2.5">
                    {/* Export JSON Button */}
                    <button
                      id="exportDataBtn"
                      type="button"
                      onClick={onExportData}
                      className="w-full py-2.5 px-3 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700/40 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      ส่งออกข้อมูลแผนงานเป็น JSON (Export Backup)
                    </button>

                    {/* Safe Cache Clearing Controls */}
                    {!isConfirmingClear ? (
                      <button
                        id="promptClearCacheBtn"
                        type="button"
                        onClick={() => setIsConfirmingClear(true)}
                        className="w-full py-2.5 px-3 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-rose-500/20 shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        ล้างข้อมูลแคชทั้งหมดภายในเครื่อง (Clear Storage)
                      </button>
                    ) : (
                      <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/30 space-y-2.5 animate-fade-in">
                        <p className="text-[9.5px] text-rose-400 text-center leading-normal font-medium">
                          ⚠️ แจ้งเตือน: การล้างข้อมูลจะลบการบันทึก, การตั้งค่า, บัญชี, และรายการงานที่อยู่ในเครื่องนี้อย่างถาวร
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            id="confirmClearCacheBtn"
                            type="button"
                            onClick={() => {
                              onClearCache();
                              setIsConfirmingClear(false);
                            }}
                            className="py-1.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-[9.5px] font-bold rounded-lg transition-all text-center cursor-pointer shadow-md"
                          >
                            แน่ใจ ยืนยันที่จะลบทั้งหมด
                          </button>
                          <button
                            id="cancelClearCacheBtn"
                            type="button"
                            onClick={() => setIsConfirmingClear(false)}
                            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9.5px] font-bold rounded-lg transition-all text-center cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            // Tab 2: Pending Sync
            <div className="space-y-5">
              {/* Simulation Banner Toggler Section */}
              <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      {isOfflineSimulated ? (
                        <CloudOff className="w-4 h-4 text-amber-500 animate-pulse" />
                      ) : (
                        <Cloud className="w-4 h-4 text-emerald-400" />
                      )}
                      <span>จำลองเครือข่ายขัดข้อง (Simulate Connection Interruption)</span>
                    </span>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-sans">
                      เปิดเพื่อทดสอบระบบ: งานใหม่ สับเปลี่ยน หรือสำเร็จจะถูกแคลนเซิลไม่ให้อัปโหลดไปยังคัลเลอร์ฟูลคลาวด์ โดยรายการเหล่านั้นจะถูกสะสมค้างเตรียมส่งไว้ที่หน้านี้แทน!
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    id="toggleOfflineSimulationBtn"
                    type="button"
                    onClick={onToggleOfflineSimulation}
                    className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 shrink-0 ${
                      isOfflineSimulated ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-all duration-300 ${
                        isOfflineSimulated ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-3 bg-slate-950/40 border border-slate-800/40 rounded-xl flex items-center gap-2 text-[10px] text-slate-400">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    {isOfflineSimulated 
                      ? '⚠️ บล็อกเครือข่ายจำลองเปิดใช้งาน: งานใหม่จะอยู่ในคิวอภิมหาอัปโหลดจนกว่าเครือข่ายจะปกติ' 
                      : '✅ เครือข่ายออนไลน์ทำงานปกติ: งานใหม่จะเชื่อมโยงกับ Database ทันที'}
                  </span>
                </div>
              </div>

              {/* Pending upload List Header with global Action */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">รายการรอซิงค์กับเทือกเขาคลาวด์ ({pendingSyncTodos.length})</h4>
                  <p className="text-[9px] text-slate-550">รายการเหล่านี้เก็บบันทึกบนเครื่อง และจะอัปเดตไปที่ฐานข้อมูลหลักเมื่อพร้อม</p>
                </div>

                {pendingSyncTodos.length > 0 && (
                  <button
                    id="forceSyncAllBtn"
                    type="button"
                    onClick={handleForceSyncAllLocally}
                    disabled={syncingAll || isOfflineSimulated}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-white border border-emerald-500/25 rounded-lg text-[9.5px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 shrink-0"
                  >
                    {syncingAll ? '⏳ กำลังซิงค์...' : '✅ อัปโหลดทั้งหมด'}
                  </button>
                )}
              </div>

              {/* List body */}
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {pendingSyncTodos.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/20 rounded-2xl border border-slate-800/40 flex flex-col items-center justify-center">
                    <div className="text-2xl mb-2">☁️</div>
                    <span className="text-[10.5px] font-bold text-slate-400 font-display">ไม่มีรายการค้างซิงค์</span>
                    <p className="text-[9.5px] text-slate-550 max-w-xs mt-1 leading-normal">
                      ทุกรายการได้รับการบันทึก และจัดเก็บบนระบบคลาวด์อย่างปลอดภัยเรียบร้อยแล้ว
                    </p>
                  </div>
                ) : (
                  pendingSyncTodos.map((todo) => (
                    <div 
                      key={todo.id} 
                      className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-900/60 transition-all font-sans"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Circle dot representing project color */}
                          <span 
                            className="w-2 h-2 rounded-full shrink-0 display:inline-block" 
                            style={{ backgroundColor: todo.color || '#3b82f6' }}
                            title={todo.project}
                          />
                          <p className="text-[11px] font-semibold text-slate-200 truncate leading-snug">
                            {todo.emoji || ''} {todo.text}
                          </p>
                          {todo.priority === 'high' && (
                            <span className="shrink-0 px-1 py-0.2 rounded bg-rose-500/10 text-rose-400 text-[8px] font-bold">ด่วน</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                          <span className="truncate max-w-[100px] bg-slate-800/50 px-1.5 py-0.3 rounded text-slate-400">{todo.project}</span>
                          {todo.time && <span>⏰ {todo.time}</span>}
                          {todo.date && <span>📅 {todo.date}</span>}
                        </div>
                      </div>

                      {/* Manual Action Force Sync trigger */}
                      <button
                        id={`forceSyncTodo-${todo.id}`}
                        type="button"
                        onClick={() => handleForceSyncTodoLocally(todo.id)}
                        disabled={syncingTodoId === todo.id || isOfflineSimulated}
                        className="px-2 py-1 rounded bg-amber-500/10 hover:bg-emerald-500 hover:text-white text-amber-400 text-[9.5px] font-bold border border-amber-500/20 hover:border-transparent transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        {syncingTodoId === todo.id ? '⏳' : 'ซิงค์ด่วน'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 text-center text-[9px] text-slate-500 leading-none shrink-0">
          SleekTask v2.5 • ปลอดภัย มีความน่าเชื่อถือสูง แม้ไร้การเชื่อมต่ออินเทอร์เน็ต
        </div>
      </div>
    </div>
  );
}
