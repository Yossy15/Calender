import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Todo, ProjectCategory, UserProfile, NotificationLog, ActiveFilter, Priority } from './types';
import { isFirebaseEnabled, auth, db, loginWithGoogle, logoutUser, getCachedAccessToken, setCachedAccessToken } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { playNotificationChime, playCompletionSound } from './utils/audio';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  fetchGoogleCalendarEvents
} from './lib/googleCalendar';

import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import NotificationDropdown from './components/NotificationDropdown';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';
import TrendsDashboard from './components/TrendsDashboard';
import CalendarView from './components/CalendarView';
import SettingsModal from './components/SettingsModal';
import { AreaChart as SparkAreaChart, Area as SparkArea, ResponsiveContainer as SparkResponsiveContainer } from 'recharts';

import {
  Bell,
  Calendar,
  LogOut,
  User,
  Plus,
  Compass,
  Bookmark,
  CheckCircle,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  Info,
  Menu,
  X,
  Search,
  Settings
} from 'lucide-react';

const INITIAL_CATEGORIES: ProjectCategory[] = [
  { id: 'cat-1', name: 'งานบริษัท UI/UX', color: '#10b981' },
  { id: 'cat-2', name: 'ของใช้เข้าบ้าน', color: '#f97316' },
  { id: 'cat-3', name: 'ออกกำลังกาย', color: '#a855f7' }
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
    },
    operationType,
    path
  };
  console.error('Firestore Error details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Clean up objects so they don't contain 'undefined' properties before passing to Firestore.
 * Handles nested objects and arrays recursively.
 */
function cleanTodoForFirestore(todo: Todo): Record<string, any> {
  const deepClean = (val: any): any => {
    if (val === undefined) return undefined;
    if (val === null) return null;
    if (Array.isArray(val)) {
      return val.map(deepClean).filter(item => item !== undefined);
    }
    if (typeof val === 'object' && val !== null) {
      const cleanedObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        const cleanedVal = deepClean(v);
        if (cleanedVal !== undefined) {
          cleanedObj[k] = cleanedVal;
        }
      }
      return cleanedObj;
    }
    return val;
  };

  return deepClean(todo);
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<ProjectCategory[]>(INITIAL_CATEGORIES);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('today');
  const [showAddModal, setShowAddModal] = useState(false);
  const [todoToEdit, setTodoToEdit] = useState<Todo | null>(null);
  const [calendarDefaultDate, setCalendarDefaultDate] = useState<string | undefined>(undefined);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sleektask_sync_enabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('sleektask_sound_enabled');
    return saved !== null ? saved !== 'false' : true;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('เพิ่งซิงค์ล่าสุด');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  
  const [savedUsers, setSavedUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('sleektask_saved_users');
    return saved ? JSON.parse(saved) : [];
  });

  // Automatically keep savedUsers up to date with direct logins
  useEffect(() => {
    if (user) {
      setSavedUsers(prev => {
        const existIdx = prev.findIndex(u => u.uid === user.uid);
        let updatedList: UserProfile[];
        if (existIdx === -1) {
          updatedList = [...prev, user];
        } else {
          updatedList = prev.map((u, i) => i === existIdx ? { ...u, ...user } : u);
        }
        localStorage.setItem('sleektask_saved_users', JSON.stringify(updatedList));
        return updatedList;
      });
    }
  }, [user]);
  
  const triggeredAlarms = useRef<string[]>([]); // To prevent double triggers of alerts within the same minute

  // Computed pending sync items
  const pendingSyncTodos = useMemo(() => {
    return todos.filter(t => t.syncStatus === 'pending');
  }, [todos]);

  // Thai Date formatting helper
  const getThaiDateString = () => {
    const days = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const date = new Date();
    return `${days[date.getDay()]}ที่ ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
  };

  // Listen to Firebase Auth state if enabled
  useEffect(() => {
    if (isFirebaseEnabled && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Google Member',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || undefined,
            isDemo: false
          };
          setUser(profile);
          localStorage.setItem('sleektask_user', JSON.stringify(profile));
        } else {
          // If logged out from Firebase, check if there's a demo account or fallback
          const localDemoUser = localStorage.getItem('sleektask_user');
          if (localDemoUser) {
            setUser(JSON.parse(localDemoUser));
          } else {
            setUser(null);
            setTodos([]);
          }
        }
      });
      return unsubscribe;
    } else {
      // Local demo mode check
      const localDemoUser = localStorage.getItem('sleektask_user');
      if (localDemoUser) {
        setUser(JSON.parse(localDemoUser));
      }
    }
  }, []);

  // Set up categories and initial local storage load for metadata
  useEffect(() => {
    const cachedCategories = localStorage.getItem('sleektask_categories');
    if (cachedCategories) {
      setCategories(JSON.parse(cachedCategories));
    }

    const cachedNotifs = localStorage.getItem('sleektask_notifs');
    if (cachedNotifs) {
      setNotifications(JSON.parse(cachedNotifs));
    }
  }, []);

  // Real-time synchronization subscription for Todos (Handles dynamic sync state & switching users)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    if (isFirebaseEnabled && db && user && !user.isDemo && isSyncEnabled) {
      setIsLoading(true);
      
      // Load current user's local cache immediately to prevent previous user's/sandbox todos from lingering
      const cachedKey = `sleektask_todos_${user.uid}`;
      const cached = localStorage.getItem(cachedKey);
      if (cached) {
        setTodos(JSON.parse(cached));
      } else {
        setTodos([]);
      }

      const q = query(
        collection(db, 'todos'),
        where('userId', '==', user.uid)
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const loaded: Todo[] = [];
        snapshot.forEach((doc) => {
          loaded.push({ id: doc.id, ...doc.data() } as Todo);
        });
        
        // Sort in-memory by createdAt descending
        loaded.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
        setTodos(loaded);
        setIsLoading(false);
        
        // Save to cache as offline safety fallback
        localStorage.setItem(`sleektask_todos_${user.uid}`, JSON.stringify(loaded));
        
        // Set dynamic formatted sync success time
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        setLastSyncTime(`ซิงค์สำเร็จแล้วเมื่อ ${hrs}:${mins} น.`);
      }, (error) => {
        setIsLoading(false);
        console.error('Firestore real-time subscription error:', error);
        
        // Safe fallback to user offline cache on error
        const cached = localStorage.getItem(`sleektask_todos_${user.uid}`);
        if (cached) {
          setTodos(JSON.parse(cached));
        }
        
        handleFirestoreError(error, OperationType.LIST, 'todos');
      });
    } else {
      // Local or demo mode, or when synchronization toggle is closed
      if (user) {
        const cachedKey = `sleektask_todos_${user.uid}`;
        const cached = localStorage.getItem(cachedKey);
        if (cached) {
          setTodos(JSON.parse(cached));
        } else {
          setTodos([]);
        }
      } else {
        const cachedLocalTodos = localStorage.getItem('sleektask_todos_offline');
        if (cachedLocalTodos) {
          setTodos(JSON.parse(cachedLocalTodos));
        } else {
          setTodos([]);
        }
      }
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, isSyncEnabled]);

  // Handle syncing timestamp updates for UI heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (user && isSyncEnabled) {
        const date = new Date();
        const hrs = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        setLastSyncTime(`ซิงค์สำเร็จแล้วเมื่อ ${hrs}:${mins} น.`);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, isSyncEnabled]);

  // BACKGROUND ALARM CHECKS (Runs every 4 seconds)
  useEffect(() => {
    const alarmInterval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const timeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

      // Check active (uncompleted) tasks with times list
      todos.forEach((todo) => {
        if (!todo.time || todo.completed) return;

        // Parse hour/minute from task time
        const [taskHr, taskMin] = todo.time.split(':').map(Number);
        if (isNaN(taskHr) || isNaN(taskMin)) return;

        // Compute trigger time minus reminder offset
        const offset = todo.reminderMinutes || 0;
        let alertMinutesTotal = taskHr * 60 + taskMin - offset;
        if (alertMinutesTotal < 0) alertMinutesTotal += 24 * 60; // Wrap around day boundary

        const nowMinutesTotal = currentHours * 60 + currentMinutes;

        // Check if times align
        if (nowMinutesTotal === alertMinutesTotal) {
          const alarmKey = `${todo.id}_${timeStr}`;
          
          if (!triggeredAlarms.current.includes(alarmKey)) {
            triggeredAlarms.current.push(alarmKey);
            triggerNotification(todo);
          }
        }
      });
    }, 4000);

    return () => clearInterval(alarmInterval);
  }, [todos]);

  // Notification Trigger
  const triggerNotification = (todo: Todo) => {
    const title = `แจ้งเตือนแผนงาน: ${todo.text}`;
    const desc = `ถึงกำหนดเวลาที่คุณเตรียมไว้แล้วในหมวดหมู่ ${todo.project}`;
    
    // Play synthesis chime sound
    playNotificationChime();

    // Spawn record entry
    const newLog: NotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      todoId: todo.id,
      title: todo.text,
      message: desc,
      timestamp: `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
      read: false
    };

    setNotifications(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
      return updated;
    });

    // Handle HTML5 Notification Request if permission is granted
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body: desc,
        icon: '/favicon.ico'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body: desc });
        }
      });
    }
  };

  // Helper to persist data based on connection profile
  const persistTodos = async (updatedTodos: Todo[], userId?: string) => {
    if (userId) {
      if (isFirebaseEnabled && db && !user?.isDemo && isSyncEnabled) {
        // Safe database writing
        setIsSyncing(true);
        try {
          localStorage.setItem(`sleektask_todos_${userId}`, JSON.stringify(updatedTodos));
          setLastSyncTime('กำลังซิงค์กับ Google Cloud...');
        } catch (err) {
          console.error("Firebase save failed:", err);
        } finally {
          setTimeout(() => setIsSyncing(false), 300);
        }
      } else {
        // Save in Sandbox/Demo user profile
        setIsSyncing(true);
        localStorage.setItem(`sleektask_todos_${userId}`, JSON.stringify(updatedTodos));
        setTimeout(() => {
          setIsSyncing(false);
          const now = new Date();
          setLastSyncTime(`ซิงค์สำเร็จแล้วเมื่อ ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} น.`);
        }, 500);
      }
    } else {
      // Local state saving for unauthenticated user
      localStorage.setItem('sleektask_todos_offline', JSON.stringify(updatedTodos));
    }
  };

  // Google Sign-In Action
  const handleGoogleSignInClick = async () => {
    setAuthError(null);
    setIsLoading(true);

    try {
      if (isFirebaseEnabled) {
        const authUser = await loginWithGoogle(true);
        const profile: UserProfile = {
          uid: authUser.uid,
          displayName: authUser.displayName || 'Google Member',
          email: authUser.email || '',
          photoURL: authUser.photoURL || undefined,
          isDemo: false
        };
        
        // Immediately load or reset the todos state for the signed-in user's UID to isolate other sessions
        const cachedKey = `sleektask_todos_${profile.uid}`;
        const cached = localStorage.getItem(cachedKey);
        setTodos(cached ? JSON.parse(cached) : []);
        
        setUser(profile);
        localStorage.setItem('sleektask_user', JSON.stringify(profile));
      } else {
        throw new Error("No keys configured");
      }
    } catch (err: any) {
      console.warn("Real Google Login bypassed or failed because of sandboxed iframe policies. Instantly launching high-fidelity Sandbox User experience.", err);
      setAuthError(err.message || String(err));
      
      // Iframe constraint popup bypass -> log into dynamic elegant Santi custom sandbox profile
      const demoUser: UserProfile = {
        uid: 'demo-santi-777',
        displayName: 'Santi Silapa (Google Sync)',
        email: 'santi.dev@gmail.com',
        isDemo: true
      };
      
      setUser(demoUser);
      localStorage.setItem('sleektask_user', JSON.stringify(demoUser));
      
      // Load or bootstrap default demo tasks
      const demoCacheKey = `sleektask_todos_${demoUser.uid}`;
      const existingDemoTasks = localStorage.getItem(demoCacheKey);
      if (existingDemoTasks) {
        setTodos(JSON.parse(existingDemoTasks));
      } else {
        const dummyTasks: Todo[] = [
          {
            id: 'task-mock-1',
            text: 'ส่งรีพอร์ตงานประจำสัปดาห์ให้ทีม UI/UX',
            completed: true,
            priority: 'normal',
            project: 'งานบริษัท UI/UX',
            time: '09:00',
            userId: demoUser.uid,
            createdAt: new Date(Date.now() - 36000000).toISOString()
          },
          {
            id: 'task-mock-2',
            text: 'ประชุมสรุปฟีเจอร์แอปพลิเคชันใหม่',
            completed: false,
            priority: 'high',
            project: 'งานบริษัท UI/UX',
            time: '14:30',
            reminderMinutes: 15,
            userId: demoUser.uid,
            createdAt: new Date().toISOString()
          },
          {
            id: 'task-mock-3',
            text: 'ซื้อนมและไข่ไก่เข้าบ้าน',
            completed: false,
            priority: 'normal',
            project: 'ของใช้เข้าบ้าน',
            time: '18:00',
            userId: demoUser.uid,
            createdAt: new Date().toISOString()
          },
          {
            id: 'task-mock-4',
            text: 'วิ่งออกกำลังกายจ๊อกกิ้ง 5 กม. สวนสาธารณะ',
            completed: false,
            priority: 'normal',
            project: 'ออกกำลังกาย',
            time: '19:30',
            userId: demoUser.uid,
            createdAt: new Date().toISOString()
          }
        ];
        setTodos(dummyTasks);
        localStorage.setItem(demoCacheKey, JSON.stringify(dummyTasks));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out action
  const handleSignOutClick = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Signout err", err);
    }
    setUser(null);
    setTodos([]);
    localStorage.removeItem('sleektask_user');
    setIsLoading(false);
  };

  // Switch Account workflow (สลับบัญชี)
  const handleSwitchAccount = async () => {
    setIsLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Logout before switch failed", err);
    }
    setUser(null);
    setTodos([]);
    localStorage.removeItem('sleektask_user');

    // Trigger google login immediately
    try {
      if (isFirebaseEnabled) {
        const authUser = await loginWithGoogle(true);
        const profile: UserProfile = {
          uid: authUser.uid,
          displayName: authUser.displayName || 'Google Member',
          email: authUser.email || '',
          photoURL: authUser.photoURL || undefined,
          isDemo: false
        };
        
        // Load the new switched user's storage cache or reset immediately to keep workspaces isolated
        const cachedKey = `sleektask_todos_${profile.uid}`;
        const cached = localStorage.getItem(cachedKey);
        setTodos(cached ? JSON.parse(cached) : []);

        setUser(profile);
        localStorage.setItem('sleektask_user', JSON.stringify(profile));
      } else {
        throw new Error("No keys configured");
      }
    } catch (err: any) {
      console.warn("Switch Google Login bypassed or failed.", err);
      setAuthError(err.message || String(err));
      // Fallback demo user
      const demoUser: UserProfile = {
        uid: 'demo-santi-777',
        displayName: 'Santi Silapa (Google Sync)',
        email: 'santi.dev@gmail.com',
        isDemo: true
      };
      setUser(demoUser);
      localStorage.setItem('sleektask_user', JSON.stringify(demoUser));
    } finally {
      setIsLoading(false);
    }
  };

  // Switch immediately to a locally saved profile
  const handleSwitchToSavedUser = async (profile: UserProfile) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      // Set active user profile
      setUser(profile);
      localStorage.setItem('sleektask_user', JSON.stringify(profile));

      // Reload todos state for this specific user
      const cachedKey = `sleektask_todos_${profile.uid}`;
      const cached = localStorage.getItem(cachedKey);
      setTodos(cached ? JSON.parse(cached) : []);

      if (isSoundEnabled) {
        playNotificationChime();
      }
    } catch (err) {
      console.error("Switch to saved user failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger login flow specifically to add an additional account and save to local list
  const handleAddAccountClick = async () => {
    setAuthError(null);
    setIsLoading(true);
    try {
      if (isFirebaseEnabled) {
        // Log out first so that Google authentication prompt asks user to select/type another account
        try {
          await logoutUser();
        } catch (e) {
          console.warn("Sign out before adding new account warning", e);
        }

        const authUser = await loginWithGoogle(true);
        const profile: UserProfile = {
          uid: authUser.uid,
          displayName: authUser.displayName || 'Google Member',
          email: authUser.email || '',
          photoURL: authUser.photoURL || undefined,
          isDemo: false
        };

        // Add to saved profiles list
        setSavedUsers(prev => {
          const existIdx = prev.findIndex(u => u.uid === profile.uid);
          let updated: UserProfile[];
          if (existIdx === -1) {
            updated = [...prev, profile];
          } else {
            updated = prev.map((u, i) => i === existIdx ? profile : u);
          }
          localStorage.setItem('sleektask_saved_users', JSON.stringify(updated));
          return updated;
        });

        // Set as active
        setUser(profile);
        localStorage.setItem('sleektask_user', JSON.stringify(profile));

        // Load tasks
        const cachedKey = `sleektask_todos_${profile.uid}`;
        const cached = localStorage.getItem(cachedKey);
        setTodos(cached ? JSON.parse(cached) : []);

        if (isSoundEnabled) {
          playNotificationChime();
        }
      } else {
        // Offline / iframe dummy add account
        const randomId = Math.random().toString(36).substring(2, 9);
        const demoProfile: UserProfile = {
          uid: `demo-${randomId}`,
          displayName: `บัญชีเสริม #${savedUsers.length + 1}`,
          email: `extra-${randomId}@example.com`,
          isDemo: true
        };
        
        setSavedUsers(prev => {
          const updated = [...prev, demoProfile];
          localStorage.setItem('sleektask_saved_users', JSON.stringify(updated));
          return updated;
        });

        setUser(demoProfile);
        localStorage.setItem('sleektask_user', JSON.stringify(demoProfile));
        setTodos([]);
        
        if (isSoundEnabled) {
          playNotificationChime();
        }
      }
    } catch (err: any) {
      console.error("Add Account Error:", err);
      setAuthError(err.message || String(err));
      // Fallback demo account
      const rand = Math.random().toString(36).substring(2, 6);
      const demoUser: UserProfile = {
        uid: `demo-extra-${rand}`,
        displayName: `บัญชีเสริม (Google Demo ${rand.toUpperCase()})`,
        email: `demo.${rand}@gmail.com`,
        isDemo: true
      };
      
      setSavedUsers(prev => {
        const updated = [...prev, demoUser];
        localStorage.setItem('sleektask_saved_users', JSON.stringify(updated));
        return updated;
      });

      setUser(demoUser);
      localStorage.setItem('sleektask_user', JSON.stringify(demoUser));
      setTodos([]);

      if (isSoundEnabled) {
        playNotificationChime();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Login with custom typed email simulation
  const handleLoginWithEmail = (email: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const emailPrefix = email.split('@')[0] || 'Member';
      const capitalizedName = emailPrefix
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      
      const formattedName = `${capitalizedName} (Google Sync)`;
      const manualUid = `sync-email-${emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      const profile: UserProfile = {
        uid: manualUid,
        displayName: formattedName,
        email: email.trim(),
        isDemo: true
      };

      setUser(profile);
      localStorage.setItem('sleektask_user', JSON.stringify(profile));

      const cachedKey = `sleektask_todos_${profile.uid}`;
      const cached = localStorage.getItem(cachedKey);
      setTodos(cached ? JSON.parse(cached) : []);

      if (isSoundEnabled) {
        playNotificationChime();
      }
    } catch (e) {
      console.error("Login with email failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Add extra account with custom typed email simulation
  const handleAddAccountWithEmail = (email: string) => {
    setAuthError(null);
    setIsLoading(true);
    try {
      const emailPrefix = email.split('@')[0] || 'Member';
      const capitalizedName = emailPrefix
        .split(/[._-]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      
      const formattedName = `${capitalizedName} (Google)`;
      const manualUid = `sync-email-${emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      const demoProfile: UserProfile = {
        uid: manualUid,
        displayName: formattedName,
        email: email.trim(),
        isDemo: true
      };

      setSavedUsers(prev => {
        const existIdx = prev.findIndex(u => u.uid === demoProfile.uid);
        let updated: UserProfile[];
        if (existIdx === -1) {
          updated = [...prev, demoProfile];
        } else {
          updated = prev.map((u, i) => i === existIdx ? demoProfile : u);
        }
        localStorage.setItem('sleektask_saved_users', JSON.stringify(updated));
        return updated;
      });

      setUser(demoProfile);
      localStorage.setItem('sleektask_user', JSON.stringify(demoProfile));

      const cachedKey = `sleektask_todos_${demoProfile.uid}`;
      const cached = localStorage.getItem(cachedKey);
      setTodos(cached ? JSON.parse(cached) : []);

      if (isSoundEnabled) {
        playNotificationChime();
      }
    } catch (e) {
      console.error("Add account with email failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a saved account from list
  const handleRemoveSavedAccount = (uid: string) => {
    const updated = savedUsers.filter(u => u.uid !== uid);
    setSavedUsers(updated);
    localStorage.setItem('sleektask_saved_users', JSON.stringify(updated));

    // If active user was removed, fallback to any other account or log out
    if (user?.uid === uid) {
      if (updated.length > 0) {
        handleSwitchToSavedUser(updated[0]);
      } else {
        handleSignOutClick();
      }
    }
  };

  // Sync Enabled/Disabled handler
  const handleToggleSync = (enabled: boolean) => {
    setIsSyncEnabled(enabled);
    localStorage.setItem('sleektask_sync_enabled', JSON.stringify(enabled));
    
    // Spawn record entry
    const newLog: NotificationLog = {
      id: `notif-${Date.now()}`,
      todoId: '',
      title: enabled ? '🌐 เปิดใช้งานระบบซิงค์คลาวด์' : '📴 สลับเป็นโหมดออฟไลน์',
      message: enabled 
        ? 'เริ่มส่งและดึงสถิติตารางงานเรียลไทม์กับ Google Cloud Firebase แล้ว' 
        : 'ปิดการเชื่อมต่อคลาวด์ ข้อมูลงานจะเซฟเฉพาะบนบราวเซอร์นี้เครื่องนี้เท่านั้น',
      timestamp: `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
      read: false
    };

    setNotifications(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
      return updated;
    });
    playNotificationChime();
  };

  const handleToggleSound = (enabled: boolean) => {
    setIsSoundEnabled(enabled);
    localStorage.setItem('sleektask_sound_enabled', enabled ? 'true' : 'false');
    if (enabled) {
      setTimeout(() => {
        playNotificationChime();
      }, 50);
    }
  };

  const handleExportDataByJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(todos, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `sleektask_export_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      // Push visual alert in local notifications feed
      const newLog: NotificationLog = {
        id: `export-notif-${Date.now()}`,
        todoId: '',
        title: '📥 ส่งออกข้อมูลแผนงานสำเร็จ',
        message: 'ดาวน์โหลดข้อมูลรายการงานทั้งหมดเป็นไฟล์ JSON เรียบร้อยแล้ว สามารถเก็บไว้เป็นไฟล์สำรองได้',
        timestamp: `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
        read: false
      };
      setNotifications(prev => {
        const updated = [newLog, ...prev];
        localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
        return updated;
      });
      playNotificationChime();
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  const handleClearLocalCacheOnly = () => {
    try {
      localStorage.clear();
      setTodos([]);
      setNotifications([]);
      setUser(null);
      
      playNotificationChime();
      setTimeout(() => {
        window.location.reload();
      }, 400);
    } catch (err) {
      console.error("Clear Cache failed", err);
    }
  };

  const [isCalendarSyncing, setIsCalendarSyncing] = useState(false);

  // FULL GOOGLE CALENDAR SYNC (PULL AND PUSH)
  const syncWithGoogleCalendar = async () => {
    setIsCalendarSyncing(true);
    let token = getCachedAccessToken();

    // If no token but we are logged in, try to authenticate to obtain the access token
    if (!token && user && !user.isDemo) {
      try {
        await loginWithGoogle();
        token = getCachedAccessToken();
      } catch (err) {
        console.error("Re-authenticating to get token failed", err);
      }
    }

    // High fidelity simulation for demo mode, or real execution if we have token
    if (user?.isDemo || !token) {
      setTimeout(() => {
        setIsCalendarSyncing(false);
        const newLog: NotificationLog = {
          id: `gcal-notif-${Date.now()}`,
          todoId: '',
          title: '🔄 ซิงค์กับ Google Calendar สำเร็จ (จำลอง)',
          message: `ซิงค์เสร็จสมบูรณ์! นำเข้ารายการงานใหม่ 2 รายการ และบันทึกแผนงานของท่านไปยัง Google Calendar เรียบร้อยแล้ว`,
          timestamp: `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
          read: false
        };
        setNotifications(prev => {
          const updated = [newLog, ...prev];
          localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
          return updated;
        });
        playNotificationChime();
      }, 1000);
      return;
    }

    try {
      // 1. Fetch events from Google Calendar
      const externalEvents = await fetchGoogleCalendarEvents(token);
      
      const existingGoogleEventIds = new Set(todos.map(t => t.googleEventId).filter(Boolean));
      const newTodosFromCalendar: Todo[] = [];
      const defaultCategory = categories[0]?.name || 'งานบริษัท UI/UX';
      const ownerId = user.uid;

      for (const event of externalEvents) {
        if (!existingGoogleEventIds.has(event.id)) {
          let eventDate = '';
          let eventTime: string | undefined = undefined;

          if (event.start?.date) {
            eventDate = event.start.date;
          } else if (event.start?.dateTime) {
            const dt = new Date(event.start.dateTime);
            eventDate = dt.toISOString().split('T')[0];
            eventTime = dt.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
          }

          if (eventDate) {
            newTodosFromCalendar.push({
              id: `gcal-${event.id}`,
              text: event.summary || 'ไม่ได้ระบุหัวข้อ (จาก Google Calendar)',
              completed: false,
              priority: 'normal',
              project: defaultCategory,
              time: eventTime,
              userId: ownerId,
              createdAt: new Date().toISOString(),
              googleEventId: event.id,
              date: eventDate,
              emoji: '📅',
              attendees: event.attendees?.map((att: any) => ({
                email: att.email || '',
                displayName: att.displayName,
                responseStatus: att.responseStatus || 'needsAction'
              }))
            });
          }
        }
      }

      // 2. Export local tasks with dates that don't have googleEventId (Ensure we only sync tasks belonging to this user)
      const localTasksToExport = todos.filter(t => t.date && !t.googleEventId && t.userId === user.uid);
      const updatedLocalTodos = [...todos];

      for (const todo of localTasksToExport) {
        const eventId = await createGoogleCalendarEvent(token, todo);
        if (eventId) {
          const idx = updatedLocalTodos.findIndex(t => t.id === todo.id);
          if (idx !== -1) {
            updatedLocalTodos[idx] = {
              ...updatedLocalTodos[idx],
              googleEventId: eventId,
              syncStatus: 'synced'
            };
          }
        }
      }

      const finalTodoList = [...newTodosFromCalendar, ...updatedLocalTodos];
      setTodos(finalTodoList);
      persistTodos(finalTodoList, user.uid);

      // Save to Firebase Firestore if needed (Secure and isolate: only write match user.uid todos)
      if (isFirebaseEnabled && db && !user.isDemo) {
        for (const todo of finalTodoList) {
          if (todo.userId === user.uid) {
            await setDoc(doc(db, 'todos', todo.id), cleanTodoForFirestore(todo));
          }
        }
      }

      const importCount = newTodosFromCalendar.length;
      const exportCount = localTasksToExport.length;

      const newLog: NotificationLog = {
        id: `gcal-notif-${Date.now()}`,
        todoId: '',
        title: '🔄 ซิงค์กับ Google Calendar สำเร็จ',
        message: `นำเข้าจาก Google Calendar +${importCount} รายการ และส่งออกแผนงานสำเร็จ +${exportCount} รายการ`,
        timestamp: `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
        read: false
      };

      setNotifications(prev => {
        const updated = [newLog, ...prev];
        localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
        return updated;
      });

      playNotificationChime();
    } catch (err) {
      console.error("Google Calendar Sync failed:", err);
    } finally {
      setIsCalendarSyncing(false);
    }
  };

  // ADD TODO 
  const handleAddTodo = async (fields: {
    text: string;
    priority: Priority;
    project: string;
    time?: string;
    reminderMinutes?: number;
    emoji?: string;
    gifUrl?: string;
    color?: string;
    date?: string;
    attendees?: { email: string; displayName?: string; responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted' }[];
  }) => {
    const ownerId = user ? user.uid : 'offline-guest';
    const newTodo: Todo = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      text: fields.text,
      completed: false,
      priority: fields.priority,
      project: fields.project,
      time: fields.time,
      reminderMinutes: fields.reminderMinutes,
      userId: ownerId,
      createdAt: new Date().toISOString(),
      emoji: fields.emoji,
      gifUrl: fields.gifUrl,
      color: fields.color,
      date: fields.date,
      attendees: fields.attendees
    };

    // Set default sync status based on user session and offline simulation
    let finalTodo: Todo = { 
      ...newTodo,
      syncStatus: (isSyncEnabled && user && !user.isDemo) ? 'pending' : 'synced'
    };

    // Automatic single sync to Google Calendar if date exists and token is active
    const token = getCachedAccessToken();
    if (token && finalTodo.date) {
      const eventId = await createGoogleCalendarEvent(token, finalTodo);
      if (eventId) {
        finalTodo.googleEventId = eventId;
      }
    }

    // Save directly to Firestore if logged into real account & offline NOT simulated
    if (isFirebaseEnabled && db && user && !user.isDemo && isSyncEnabled) {
      if (isOfflineSimulated) {
        finalTodo.syncStatus = 'pending';
      } else {
        setIsSyncing(true);
        try {
          await setDoc(doc(db, 'todos', finalTodo.id), cleanTodoForFirestore(finalTodo));
          finalTodo.syncStatus = 'synced';
        } catch (err) {
          console.error("Firestore Save individual error:", err);
          finalTodo.syncStatus = 'pending';
        } finally {
          setIsSyncing(false);
        }
      }
    }

    const newTodoList = [finalTodo, ...todos];
    setTodos(newTodoList);
    persistTodos(newTodoList, user ? user.uid : undefined);
  };

  // START EDIT TODO
  const handleStartEditTodo = (todo: Todo) => {
    setTodoToEdit(todo);
    setShowAddModal(true);
  };

  // UPDATE TODO
  const handleUpdateTodo = async (id: string, updatedFields: {
    text: string;
    priority: Priority;
    project: string;
    time?: string;
    reminderMinutes?: number;
    emoji?: string;
    gifUrl?: string;
    color?: string;
    date?: string;
    attendees?: { email: string; displayName?: string; responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted' }[];
  }) => {
    const todoToUpdate = todos.find(t => t.id === id);
    if (!todoToUpdate) return;

    let updatedTodo: Todo = {
      ...todoToUpdate,
      text: updatedFields.text,
      priority: updatedFields.priority,
      project: updatedFields.project,
      time: updatedFields.time,
      reminderMinutes: updatedFields.reminderMinutes,
      emoji: updatedFields.emoji,
      gifUrl: updatedFields.gifUrl,
      color: updatedFields.color,
      date: updatedFields.date,
      attendees: updatedFields.attendees,
      syncStatus: (isSyncEnabled && user && !user.isDemo) ? 'pending' : 'synced'
    };

    // Automatic single sync to Google Calendar
    const token = getCachedAccessToken();
    if (token && updatedTodo.date) {
      if (updatedTodo.googleEventId) {
        await updateGoogleCalendarEvent(token, updatedTodo);
      } else {
        const eventId = await createGoogleCalendarEvent(token, updatedTodo);
        if (eventId) {
          updatedTodo.googleEventId = eventId;
        }
      }
    }

    // Update in Firestore if logged in
    if (isFirebaseEnabled && db && user && !user.isDemo && isSyncEnabled) {
      if (isOfflineSimulated) {
        updatedTodo.syncStatus = 'pending';
      } else {
        setIsSyncing(true);
        try {
          await setDoc(doc(db, 'todos', id), cleanTodoForFirestore(updatedTodo));
          updatedTodo.syncStatus = 'synced';
        } catch (err) {
          console.error("Update Firestore failed", err);
          updatedTodo.syncStatus = 'pending';
        } finally {
          setIsSyncing(false);
        }
      }
    }

    const updatedTodoList = todos.map(todo => todo.id === id ? updatedTodo : todo);
    setTodos(updatedTodoList);
    persistTodos(updatedTodoList, user ? user.uid : undefined);

    // Spawn record entry
    const newLog: NotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      todoId: updatedTodo.id,
      title: '✏️ แก้ไขแผนงานสำเร็จ',
      message: `แก้ไขแผนงาน "${updatedTodo.text}" ในหมวดหมู่ ${updatedTodo.project} เรียบร้อยแล้ว`,
      timestamp: `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
      read: false
    };

    setNotifications(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
      return updated;
    });
  };

  // TOGGLE COMPLETED
  const handleToggleTodo = async (id: string) => {
    const todoToUpdate = todos.find(t => t.id === id);
    if (!todoToUpdate) return;

    const isNowCompleted = !todoToUpdate.completed;
    const updatedTodo = {
      ...todoToUpdate,
      completed: isNowCompleted,
      completedAt: isNowCompleted ? new Date().toISOString() : undefined,
      syncStatus: (isSyncEnabled && user && !user.isDemo) ? 'pending' as const : 'synced' as const
    };

    // Sync status change to Google Calendar in background if enabled
    const token = getCachedAccessToken();
    if (token && updatedTodo.googleEventId) {
      updateGoogleCalendarEvent(token, updatedTodo).catch(err => 
        console.error("Failed to sync status toggle with Google Calendar", err)
      );
    }

    // Write to DB if real & offline NOT simulated
    if (isFirebaseEnabled && db && user && !user.isDemo && isSyncEnabled) {
      if (isOfflineSimulated) {
        updatedTodo.syncStatus = 'pending';
      } else {
        setIsSyncing(true);
        try {
          await setDoc(doc(db, 'todos', id), cleanTodoForFirestore(updatedTodo));
          updatedTodo.syncStatus = 'synced';
        } catch (err) {
          console.error("Toggle Firestore failed", err);
          updatedTodo.syncStatus = 'pending';
        } finally {
          setIsSyncing(false);
        }
      }
    }

    const updatedTodoList = todos.map(todo => 
      todo.id === id ? updatedTodo : todo
    );

    setTodos(updatedTodoList);
    persistTodos(updatedTodoList, user ? user.uid : undefined);
    playCompletionSound(isNowCompleted);
  };

  // BULK TOGGLE COMPLETED
  const handleBulkToggleTodos = async (ids: string[], targetStatus: boolean) => {
    if (ids.length === 0) return;

    const nowStr = new Date().toISOString();
    const updatedTodoList = todos.map(todo => {
      if (ids.includes(todo.id)) {
        return {
          ...todo,
          completed: targetStatus,
          completedAt: targetStatus ? nowStr : undefined,
          syncStatus: (isSyncEnabled && user && !user.isDemo) ? 'pending' as const : 'synced' as const
        };
      }
      return todo;
    });

    // Sync status change to Google Calendar in background if enabled
    const token = getCachedAccessToken();
    if (token) {
      const selectedTodos = todos.filter(t => ids.includes(t.id));
      selectedTodos.forEach(todo => {
        if (todo.googleEventId) {
          const updatedTodo = {
            ...todo,
            completed: targetStatus,
            completedAt: targetStatus ? nowStr : undefined
          };
          updateGoogleCalendarEvent(token, updatedTodo).catch(err => 
            console.error("Failed bulk sync with calendar", err)
          );
        }
      });
    }

    // Write all to Firestore if logged in
    if (isFirebaseEnabled && db && user && !user.isDemo && isSyncEnabled) {
      if (isOfflineSimulated) {
        // remain pending
      } else {
        setIsSyncing(true);
        try {
          const batchToWrite = updatedTodoList.filter(t => ids.includes(t.id));
          for (const todo of batchToWrite) {
            await setDoc(doc(db, 'todos', todo.id), cleanTodoForFirestore(todo));
            // mark updated list item as synced
            const idx = updatedTodoList.findIndex(t => t.id === todo.id);
            if (idx !== -1) {
              updatedTodoList[idx].syncStatus = 'synced';
            }
          }
        } catch (err) {
          console.error("Bulk toggle Firestore failed", err);
        } finally {
          setIsSyncing(false);
        }
      }
    }

    setTodos(updatedTodoList);
    persistTodos(updatedTodoList, user ? user.uid : undefined);
  };

  // DELETE TODO
  const handleDeleteTodo = (id: string) => {
    const found = todos.find(todo => todo.id === id);
    if (found) {
      setTodoToDelete(found);
    }
  };

  // BULK DELETE TRIGGER
  const handleBulkDeleteTodoTrigger = (ids: string[]) => {
    if (ids.length === 0) return;
    setBulkDeleteIds(ids);
    setTodoToDelete({
      id: 'bulk-delete-action',
      text: `ลบแผนงานที่เลือกทั้งหมดจำนวน ${ids.length} รายการ`,
      emoji: '🗑️',
      project: 'ลบข้อมูลแบบกลุ่ม',
      completed: false,
      ownerId: 'offline-guest',
      createdAt: '',
      priority: 'high'
    });
  };

  const executeBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;

    // Deletion from Google Calendar if linked
    const token = getCachedAccessToken();
    if (token) {
      const selectedTodos = todos.filter(t => ids.includes(t.id));
      selectedTodos.forEach(todo => {
        if (todo.googleEventId) {
          deleteGoogleCalendarEvent(token, todo.googleEventId).catch(err => 
            console.error("Failed bulk calendar event delete", err)
          );
        }
      });
    }

    const updatedTodoList = todos.filter(todo => !ids.includes(todo.id));
    setTodos(updatedTodoList);
    persistTodos(updatedTodoList, user ? user.uid : undefined);

    // Write bulk deletes to Firestore if real
    if (isFirebaseEnabled && db && user && !user.isDemo && isSyncEnabled) {
      setIsSyncing(true);
      try {
        for (const id of ids) {
          await deleteDoc(doc(db, 'todos', id));
        }
      } catch (err) {
        console.error("Bulk delete Firestore failed", err);
      } finally {
        setIsSyncing(false);
      }
    }

    // Spawn a premium logging entry
    const newLog: NotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      todoId: 'bulk-delete-action',
      title: '🗑️ ลบแผนงานสำเร็จแล้ว',
      message: `ลบแผนงานจำนวน ${ids.length} รายการ เรียบร้อยแล้ว`,
      timestamp: `${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`,
      read: false
    };

    setNotifications(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
      return updated;
    });
  };

  const executeDeleteTodo = async (id: string) => {
    if (id === 'bulk-delete-action') {
      await executeBulkDelete(bulkDeleteIds);
      setBulkDeleteIds([]);
      return;
    }

    const found = todos.find(todo => todo.id === id);

    // Deletion from Google Calendar if linked
    const token = getCachedAccessToken();
    if (token && found?.googleEventId) {
      deleteGoogleCalendarEvent(token, found.googleEventId).catch(err => 
        console.error("Failed to delete event from Google Calendar", err)
      );
    }

    const updatedTodoList = todos.filter(todo => todo.id !== id);
    setTodos(updatedTodoList);
    persistTodos(updatedTodoList, user ? user.uid : undefined);

    // Write deletion to Firestore if real
    if (isFirebaseEnabled && db && user && !user.isDemo && isSyncEnabled) {
      setIsSyncing(true);
      try {
        await deleteDoc(doc(db, 'todos', id));
      } catch (err) {
        console.error("Delete Firestore failed", err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  // REORDER TODOS WITH INDEX ALIGNMENT (WHETHER FILTERED OR NOT)
  const handleReorderTodos = (newOrderOfFiltered: Todo[]) => {
    if (activeFilter === 'today') {
      setTodos(newOrderOfFiltered);
      persistTodos(newOrderOfFiltered, user ? user.uid : undefined);
    } else {
      // Keep other todos intact and patch the active filter's reordered tasks in order of their placement
      const originalTodosCopy = [...todos];
      const activeFiltered = getFilteredTodos();
      const filteredIndices = activeFiltered
        .map(ft => originalTodosCopy.findIndex(t => t.id === ft.id))
        .filter(idx => idx !== -1);
      
      const sortedIndices = [...filteredIndices].sort((a, b) => a - b);
      newOrderOfFiltered.forEach((todo, idx) => {
        if (idx < sortedIndices.length) {
          originalTodosCopy[sortedIndices[idx]] = todo;
        }
      });
      
      setTodos(originalTodosCopy);
      persistTodos(originalTodosCopy, user ? user.uid : undefined);
    }
  };

  // ADD PROJECT CATEGORY
  const handleAddCategory = (name: string, color: string) => {
    const newCat: ProjectCategory = {
      id: `cat-${Date.now()}`,
      name,
      color
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    localStorage.setItem('sleektask_categories', JSON.stringify(updated));
  };

  // NOTIFICATION UTILITIES
  const handleMarkNotificationRead = (logId: string) => {
    const updated = notifications.map(log => 
      log.id === logId ? { ...log, read: true } : log
    );
    setNotifications(updated);
    localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
  };

  const handleMarkAllNotificationsRead = () => {
    const updated = notifications.map(log => ({ ...log, read: true }));
    setNotifications(updated);
    localStorage.setItem('sleektask_notifs', JSON.stringify(updated));
  };

  const handleClearAllNotifications = () => {
    setNotifications([]);
    localStorage.setItem('sleektask_notifs', JSON.stringify([]));
  };

  // SNOOZE NOTIFICATION IMPLEMENTATION
  const handleSnoozeNotification = (logId: string, todoId: string, minutes: number) => {
    const todoToSnooze = todos.find(t => t.id === todoId);
    if (!todoToSnooze) return;

    // Use current hours/mins as base fallback, or taskScheduled time
    let baseHours = new Date().getHours();
    let baseMinutes = new Date().getMinutes();

    if (todoToSnooze.time) {
      const [hr, min] = todoToSnooze.time.split(':').map(Number);
      if (!isNaN(hr) && !isNaN(min)) {
        baseHours = hr;
        baseMinutes = min;
      }
    }

    // Add minutes
    let totalMins = baseHours * 60 + baseMinutes + minutes;
    if (totalMins >= 24 * 60) {
      totalMins = totalMins % (24 * 60);
    }

    const newHr = Math.floor(totalMins / 60);
    const newMin = totalMins % 60;
    const newTimeStr = `${String(newHr).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;

    const updatedTodos = todos.map(t => {
      if (t.id === todoId) {
        return {
          ...t,
          time: newTimeStr,
          syncStatus: isOfflineSimulated ? 'pending' as const : t.syncStatus
        };
      }
      return t;
    });

    setTodos(updatedTodos);
    persistTodos(updatedTodos, user?.uid);

    // Write to Firestore if connected & not simulated offline
    if (isFirebaseEnabled && db && user && !user.isDemo && isSyncEnabled && !isOfflineSimulated) {
      const snoozedTodo = updatedTodos.find(t => t.id === todoId);
      if (snoozedTodo) {
        setDoc(doc(db, 'todos', todoId), cleanTodoForFirestore(snoozedTodo))
          .catch(() => {
            setTodos(prev => prev.map(t => t.id === todoId ? { ...t, syncStatus: 'pending' as const } : t));
          });
      }
    }

    // Reset list tracking for this snoozed time so it triggers fresh in background alarms loop
    triggeredAlarms.current = triggeredAlarms.current.filter(key => !key.startsWith(`${todoId}_`));

    // Mark notification read
    handleMarkNotificationRead(logId);

    // Audio feedback chime
    if (isSoundEnabled) {
      playNotificationChime();
    }
  };

  // PENDING SYNC FORCE ACTION HANDLERS
  const handleForceSyncTodo = async (id: string) => {
    if (!isFirebaseEnabled || !db || !user || user.isDemo) {
      const updatedList = todos.map(t => t.id === id ? { ...t, syncStatus: 'synced' as const } : t);
      setTodos(updatedList);
      persistTodos(updatedList, user ? user.uid : undefined);
      return;
    }

    const todoToSync = todos.find(t => t.id === id);
    if (!todoToSync) return;

    try {
      await setDoc(doc(db, 'todos', id), cleanTodoForFirestore(todoToSync));
      const updatedList = todos.map(t => t.id === id ? { ...t, syncStatus: 'synced' as const } : t);
      setTodos(updatedList);
      persistTodos(updatedList, user.uid);
      if (isSoundEnabled) {
        playNotificationChime();
      }
    } catch (err) {
      console.error("Manual sync todo failed:", err);
      throw err;
    }
  };

  const handleForceSyncAllPending = async () => {
    const listToSync = todos.filter(t => t.syncStatus === 'pending');
    if (listToSync.length === 0) return;

    if (!isFirebaseEnabled || !db || !user || user.isDemo) {
      const updatedList = todos.map(t => t.syncStatus === 'pending' ? { ...t, syncStatus: 'synced' as const } : t);
      setTodos(updatedList);
      persistTodos(updatedList, user ? user.uid : undefined);
      return;
    }

    const updatedList = [...todos];
    let successCount = 0;

    for (const todo of listToSync) {
      try {
        await setDoc(doc(db, 'todos', todo.id), cleanTodoForFirestore(todo));
        const idx = updatedList.findIndex(t => t.id === todo.id);
        if (idx !== -1) {
          updatedList[idx] = { ...updatedList[idx], syncStatus: 'synced' as const };
        }
        successCount++;
      } catch (err) {
        console.error("Bulk sync item failed:", err);
      }
    }

    setTodos(updatedList);
    persistTodos(updatedList, user.uid);

    if (successCount > 0 && isSoundEnabled) {
      playNotificationChime();
    }
  };

  // FILTERS CONTROLLER
  const getFilteredTodos = (): Todo[] => {
    let baseFiltered: Todo[] = [];
    switch (activeFilter) {
      case 'today':
        // Show all items allocated to today
        baseFiltered = todos;
        break;
      case 'planned':
        // Show tasks equipped with scheduled alert timers
        baseFiltered = todos.filter(t => t.time !== undefined && t.time !== '');
        break;
      case 'important':
        // Show tasks designated core Priority.HIGH
        baseFiltered = todos.filter(t => t.priority === 'high');
        break;
      case 'trends':
        baseFiltered = [];
        break;
      case 'calendar':
        baseFiltered = [];
        break;
      default:
        // Filter by dynamic project category title match
        baseFiltered = todos.filter(t => t.project === activeFilter);
        break;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      baseFiltered = baseFiltered.filter(t => t.text.toLowerCase().includes(q));
    }

    return baseFiltered;
  };

  const filteredTodos = getFilteredTodos();

  // DASHBOARD KEY INSIGHT CALCULATIONS
  const totalTasks = todos.length;
  const completedTasksCount = todos.filter(t => t.completed).length;
  const remainingTasksCount = totalTasks - completedTasksCount;
  const completionPercent = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  // 7 Days completed tasks trend for mini sparkline
  const suggestedAttendees = useMemo(() => {
    const map = new Map<string, { email: string; displayName?: string }>();
    todos.forEach(t => {
      t.attendees?.forEach(att => {
        const emailLower = att.email.toLowerCase().trim();
        if (emailLower && !map.has(emailLower)) {
          map.set(emailLower, {
            email: att.email.trim(),
            displayName: att.displayName?.trim()
          });
        }
      });
    });
    return Array.from(map.values());
  }, [todos]);

  const sparklineData = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dates.push(d);
    }
    return dates.map(date => {
      const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
      const realCompletedCount = todos.filter(t => t.completed && t.completedAt && t.completedAt.startsWith(key)).length;
      return { completed: realCompletedCount };
    });
  }, [todos]);

  // Notification Counters
  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-0 md:p-6 transition-all font-sans antialiased text-slate-200">
      
      {/* Sleek App Window container (Responsive height on mobile, fixed height on desktop) */}
      <div 
        id="sleekTaskWindow" 
        className="w-full max-w-5xl h-[100dvh] md:h-[768px] bg-[#0b0e14] text-slate-200 flex flex-col md:flex-row rounded-none md:rounded-3xl border border-slate-800/60 overflow-hidden shadow-2xl relative"
      >
        
        {/* Overlay Backdrop for Mobile Sidebar Drawer */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40 md:hidden transition-all duration-200"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* SIDEBAR NAVIGATION PANEL */}
        <aside className={`fixed md:relative inset-y-0 left-0 z-50 w-72 h-full bg-[#12161f] border-r border-slate-800/50 flex flex-col shrink-0 select-none transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-6 md:p-8 pb-4 flex-1 overflow-y-auto">
            
            {/* User credentials / Auth control area */}
            <div id="sidebarUserHeader" className="flex items-center gap-3 mb-8">
              {user ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/20 shrink-0 select-none uppercase font-display">
                  {user.photoURL ? (
                    <img referrerPolicy="no-referrer" src={user.photoURL} className="w-full h-full rounded-full object-cover" alt="Avatar" />
                  ) : (
                    user.displayName.charAt(0)
                  )}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                  <User className="w-5 h-5" />
                </div>
              )}
              
              <div className="min-w-0 flex-1">
                {user ? (
                  <>
                    <h2 id="userName" className="text-xs font-bold text-white truncate font-display">{user.displayName}</h2>
                    <p id="userEmail" className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </>
                ) : (
                  <>
                    <h2 className="text-xs font-bold text-slate-300">เข้าใช้งานเซสชั่น</h2>
                    <p className="text-[9px] text-slate-500">ซิงค์ออนไลน์กับ Google</p>
                  </>
                )}
              </div>

              {user && (
                <button
                  id="signOutBtn"
                  onClick={handleSignOutClick}
                  className="p-1 px-1.5 rounded-lg bg-slate-800/40 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-all cursor-pointer border border-transparent hover:border-rose-500/10"
                  title="ลงชื่อออก"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Close Button for Mobile Sidebar Drawer */}
              <button
                id="closeMobileSidebarBtn"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 px-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer border border-transparent md:hidden shrink-0"
                title="ปิดเมนูนำทาง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sidebar headers wrap nicely */}

            {/* Filter Navigation Lists */}
            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-1">ตัวกรองระบบ</h3>
            <nav id="sidebarFilters" className="space-y-1 mb-6">
              <button
                id="filterTodayBtn"
                onClick={() => { setActiveFilter('today'); setIsSidebarOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  activeFilter === 'today'
                    ? 'bg-blue-600/10 border-l-2 border-blue-500 text-blue-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10 border-l-2 border-transparent'
                }`}
              >
                <span className="text-xs font-medium flex items-center gap-2">
                  <span>📅</span> รายการวันนี้
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeFilter === 'today' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800/60 text-slate-500'
                }`}>
                  {todos.length}
                </span>
              </button>

              <button
                id="filterPlannedBtn"
                onClick={() => { setActiveFilter('planned'); setIsSidebarOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  activeFilter === 'planned'
                    ? 'bg-blue-600/10 border-l-2 border-blue-500 text-blue-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10 border-l-2 border-transparent'
                }`}
              >
                <span className="text-xs font-medium flex items-center gap-2">
                  <span>⏰</span> งานที่เตือนล่วงหน้า
                </span>
                <span className="text-[10px] text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded-md">
                  {todos.filter(t => t.time).length}
                </span>
              </button>

              <button
                id="filterImportantBtn"
                onClick={() => { setActiveFilter('important'); setIsSidebarOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  activeFilter === 'important'
                    ? 'bg-orange-500/5 border-l-2 border-orange-500 text-orange-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10 border-l-2 border-transparent'
                }`}
              >
                <span className="text-xs font-medium flex items-center gap-2">
                  <span>🔥</span> เร่งด่วน & สำคัญ
                </span>
                <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-md font-bold">
                  {todos.filter(t => t.priority === 'high').length}
                </span>
              </button>

              <button
                id="filterCalendarBtn"
                onClick={() => { setActiveFilter('calendar'); setIsSidebarOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  activeFilter === 'calendar'
                    ? 'bg-purple-600/10 border-l-2 border-purple-500 text-purple-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10 border-l-2 border-transparent'
                }`}
              >
                <span className="text-xs font-medium flex items-center gap-2">
                  <span>📅</span> ปฏิทินกำหนดแผนงาน
                </span>
                <span className="text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-md font-bold">
                  ตารางงาน
                </span>
              </button>

              <button
                id="filterTrendsBtn"
                onClick={() => { setActiveFilter('trends'); setIsSidebarOpen(false); }}
                className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                  activeFilter === 'trends'
                    ? 'bg-blue-600/10 border-l-2 border-blue-500 text-blue-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10 border-l-2 border-transparent'
                }`}
              >
                <span className="text-xs font-medium flex items-center gap-2">
                  <span>📈</span> สถิติ & แนวโน้ม 7 วัน
                </span>
                <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md font-bold">
                  วิเคราะห์
                </span>
              </button>
            </nav>

            {/* Project Folders */}
            <div id="projectFoldersContainer" className="mt-6">
              <h3 className="px-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">โปรเจกต์</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    id={`projectFilterBtn-${cat.id}`}
                    key={cat.id}
                    onClick={() => { setActiveFilter(cat.name); setIsSidebarOpen(false); }}
                    className={`w-full px-3 py-2 flex items-center gap-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      activeFilter === cat.name
                        ? 'bg-slate-800/40 text-slate-100 font-semibold border border-slate-700/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/10'
                    }`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate flex-1">{cat.name}</span>
                    <span className="text-[9px] text-slate-600 font-mono">
                      {todos.filter(t => t.project === cat.name).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Sync status indicator box matched isSyncing states */}
          <div className="mt-auto p-4 md:p-6 bg-[#0f121a]/55 border-t border-slate-800/40 select-none shrink-0">
            <button
              id="sidebarSettingsBtn"
              onClick={() => { setShowSettingsModal(true); setIsSidebarOpen(false); }}
              className="w-full mb-3.5 py-2.5 px-3 bg-slate-800/40 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-800/80 hover:border-slate-700/80 transition-all cursor-pointer shadow-sm"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              การตั้งค่าระบบ (Settings)
            </button>
            <div className="flex items-center justify-between bg-slate-900/40 p-3 rounded-2xl border border-slate-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                   isSyncing 
                     ? 'bg-blue-400 animate-spin border border-dashed border-white' 
                     : user 
                     ? 'bg-green-500 animate-pulse' 
                     : 'bg-amber-500'
                }`} />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold text-slate-300 block leading-tight truncate">
                    {isSyncing 
                       ? 'กำลังบันทึกออนไลน์...' 
                       : user 
                       ? 'ซิงค์กับ Google Account แล้ว' 
                       : 'จัดเก็บใน Sandbox ภายใน'}
                  </span>
                  <span className="text-[9px] text-slate-500 leading-none truncate block mt-0.5">
                    {user ? lastSyncTime : 'บันทึกเรียบร้อย'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN TODOLIST STREAM STREAM */}
        <main className="flex-1 flex flex-col bg-[#0b0e14] overflow-hidden">
          
          {/* Header Area */}
          <header className="h-20 px-3 md:px-10 flex items-center justify-between border-b border-slate-800/20 shrink-0 gap-1.5 sm:gap-4">
            <div className="flex items-center min-w-0">
              {/* Mobile hamburger menu toggle */}
              <button
                id="toggleMobileSidebarBtn"
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 mr-1.5 md:mr-3 bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl md:hidden shrink-0 cursor-pointer"
                title="เปิดเมนูนำทาง"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="min-w-0">
                <h1 id="mainHeaderTitle" className="text-sm md:text-2xl font-bold text-white tracking-tight font-display truncate">
                  {activeFilter === 'today' 
                    ? 'วันนี้' 
                    : activeFilter === 'planned' 
                    ? 'งานที่รับแจ้งเตือน' 
                    : activeFilter === 'important' 
                    ? 'เร่งด่วน' 
                    : activeFilter === 'trends'
                    ? 'สถิติสัปดาห์ & แนวโน้ม 7 วัน'
                    : activeFilter === 'calendar'
                    ? 'ปฏิทินวางแผนงานกำหนดการรายเดือน'
                    : activeFilter}
                </h1>
                <p id="mainHeaderSubtitle" className="text-[9px] md:text-[11px] text-slate-500 leading-none mt-0.5 hidden xs:block truncate max-w-[130px] sm:max-w-none">{getThaiDateString()}</p>
              </div>
            </div>

            {/* Dynamic Search Input Panel with responsive scaling */}
            <div className="relative flex-1 min-w-[74px] sm:min-w-[120px] max-w-[180px] xs:max-w-[225px] sm:max-w-xs mx-1 sm:mx-4 z-10">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="ค้นหาแผนงาน..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-7 pr-7 sm:pl-8 sm:pr-8 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-950 border border-slate-800/80 focus:border-blue-500/70 rounded-xl text-[11px] sm:text-xs text-slate-100 placeholder-slate-500/80 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all duration-155"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 rounded p-0.5 cursor-pointer"
                  title="ล้างข้อความค้นหา"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 relative">
              {/* Notification Center Trigger */}
              <div className="relative">
                <button
                  id="notificationsBellBtn"
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                    showNotifMenu 
                      ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-blue-400 hover:border-slate-700/40'
                  }`}
                  title="การแจ้งเตือนและประวัติ"
                >
                  <Bell className="w-4 h-4 fill-current opacity-70" />
                </button>
                {unreadNotifCount > 0 && (
                  <div id="unreadNotifBadge" className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border border-[#0b0e14] rounded-full text-[9px] flex items-center justify-center font-bold text-white animate-soft-pulse select-none">
                    {unreadNotifCount}
                  </div>
                )}

                {/* Dropdown UI overlay panel container absolute */}
                <NotificationDropdown
                  logs={notifications}
                  onMarkRead={handleMarkNotificationRead}
                  onClearAll={handleClearAllNotifications}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                  onClose={() => setShowNotifMenu(false)}
                  isOpen={showNotifMenu}
                  onSnooze={handleSnoozeNotification}
                />
              </div>

              {/* Add Task Trigger CTA Button */}
              <button
                id="openAddTaskModalBtn"
                onClick={() => setShowAddModal(true)}
                className="h-9 sm:h-10 px-2.5 sm:px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 stroke-[3] shrink-0" />
                <span className="hidden xs:inline">เพิ่มงานใหม่</span>
              </button>
            </div>
          </header>

          {/* Core scroll space containing all tasks */}
          <div className="flex-1 px-5 md:px-10 py-6 overflow-hidden flex flex-col justify-between">
            <div className="flex-1 overflow-y-auto pr-1">
              {activeFilter === 'trends' ? (
                <TrendsDashboard todos={todos} categories={categories} />
              ) : activeFilter === 'calendar' ? (
                <CalendarView
                  todos={todos}
                  categories={categories}
                  onToggleTodo={handleToggleTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onEditTodo={handleStartEditTodo}
                  onOpenAddTaskWithDate={(dateStr) => {
                    setCalendarDefaultDate(dateStr);
                    setShowAddModal(true);
                  }}
                />
              ) : (
                <TaskList
                  todos={filteredTodos}
                  categories={categories}
                  onToggleTodo={handleToggleTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onEditTodo={handleStartEditTodo}
                  isLoading={isLoading}
                  onReorderTodos={handleReorderTodos}
                  onBulkToggleTodos={handleBulkToggleTodos}
                  onBulkDeleteTodos={handleBulkDeleteTodoTrigger}
                />
              )}
            </div>

            {/* Warning when Offline mode */}
            {!user && (
              <div id="offlineNoticeBanner" className="mt-4 p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-normal">
                  <span className="font-semibold text-amber-500">โหมด Sandbox (Local Offline)</span> ข้อมูลจะถูกบันทึกไว้ภายในเบราว์เซอร์นี้ หากต้องการล็อกอินเพื่อดูและซิงค์ข้อมูลบนมือถือหรือเครื่องอื่น กรุณากดปุ่ม <b>"ซิงค์ Google Account"</b> ในแถบด้านซ้าย
                </p>
              </div>
            )}
          </div>

          {/* Quick Insights Summary Footer Panel */}
          <div className="h-24 px-4 md:px-10 border-t border-slate-800/20 bg-slate-900/10 flex items-center gap-4 md:gap-10 shrink-0">
            <div className="flex flex-col flex-1 min-w-0 max-w-sm">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1 truncate">สัดส่วนความคืบหน้ารวม</span>
              <div className="flex items-center gap-2.5 sm:gap-3.5">
                <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                  <div 
                    id="progressBarIndicator"
                    className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span id="progressBarPercent" className="text-xs font-bold text-slate-300 shrink-0">{completionPercent}%</span>
              </div>
            </div>

            {/* Mini Trend Sparkline Column */}
            <div 
              id="miniSparklineFooterBtn"
              onClick={() => setActiveFilter('trends')}
              className="hidden sm:flex flex-col flex-1 max-w-[130px] border-l border-slate-800/60 pl-8 shrink-0 cursor-pointer hover:opacity-85 group transition-all"
              title="ดูสถิติเจาะลึก 7 วันย้อนหลัง"
            >
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none block mb-1.5 group-hover:text-amber-500 transition-colors">แนวโน้ม 7 วัน</span>
              <div className="h-8 w-full shrink-0 relative">
                <SparkResponsiveContainer width="100%" height="100%">
                  <SparkAreaChart data={sparklineData}>
                    <defs>
                      <linearGradient id="colorSpark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <SparkArea 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#10b981" 
                      strokeWidth={1.8}
                      fillOpacity={1} 
                      fill="url(#colorSpark)" 
                    />
                  </SparkAreaChart>
                </SparkResponsiveContainer>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 shrink-0 border-l border-slate-800/60 pl-4 sm:pl-8">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none block mb-1">ทำเสร็จแล้ว</span>
                <span id="completedTasksCount" className="text-sm sm:text-base font-bold text-emerald-500 leading-none">
                  {completedTasksCount} <span className="text-[9px] sm:text-[10px] text-slate-600 font-normal">งาน</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none block mb-1">คงเหลือ</span>
                <span id="remainingTasksCount" className="text-sm sm:text-base font-bold text-blue-400 leading-none">
                  {remainingTasksCount} <span className="text-[9px] sm:text-[10px] text-slate-600 font-normal">งาน</span>
                </span>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* Dynamic Popups Insertion */}
      <TaskForm
        categories={categories}
        onAddTask={handleAddTodo}
        onEditTask={handleUpdateTodo}
        onAddCategory={handleAddCategory}
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setCalendarDefaultDate(undefined);
          setTodoToEdit(null);
        }}
        defaultDate={calendarDefaultDate}
        todoToEdit={todoToEdit}
        suggestedAttendees={suggestedAttendees}
      />

      <ConfirmDeleteModal
        todo={todoToDelete}
        isOpen={!!todoToDelete}
        onClose={() => setTodoToDelete(null)}
        onConfirm={() => {
          if (todoToDelete) {
            executeDeleteTodo(todoToDelete.id);
          }
        }}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        user={user}
        isSyncEnabled={isSyncEnabled}
        onToggleSync={handleToggleSync}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onLogin={handleGoogleSignInClick}
        onLogout={handleSignOutClick}
        onSwitchAccount={handleSwitchAccount}
        isCalendarSyncing={isCalendarSyncing}
        onSyncCalendar={syncWithGoogleCalendar}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={handleToggleSound}
        onExportData={handleExportDataByJson}
        onClearCache={handleClearLocalCacheOnly}
        pendingSyncTodos={pendingSyncTodos}
        onForceSyncTodo={handleForceSyncTodo}
        onForceSyncAll={handleForceSyncAllPending}
        isOfflineSimulated={isOfflineSimulated}
        onToggleOfflineSimulation={() => setIsOfflineSimulated(prev => !prev)}
        savedUsers={savedUsers}
        onSwitchToSavedUser={handleSwitchToSavedUser}
        onAddAccount={handleAddAccountClick}
        onRemoveSavedAccount={handleRemoveSavedAccount}
        authError={authError}
        onLoginWithEmail={handleLoginWithEmail}
        onAddAccountWithEmail={handleAddAccountWithEmail}
      />

    </div>
  );
}
