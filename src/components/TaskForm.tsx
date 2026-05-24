import React, { useState } from 'react';
import { Todo, Priority, ProjectCategory } from '../types';
import { Plus, Bell, Calendar, ChevronDown, Tag, AlertTriangle, Check, Search, Sparkles, Trash2 } from 'lucide-react';

interface TaskFormProps {
  onAddTask: (data: {
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
  }) => void;
  onEditTask?: (id: string, data: {
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
  }) => void;
  categories: ProjectCategory[];
  onAddCategory: (name: string, color: string) => void;
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  todoToEdit?: Todo | null;
  suggestedAttendees?: { email: string; displayName?: string }[];
}

export default function TaskForm({ 
  onAddTask, 
  onEditTask,
  categories, 
  onAddCategory, 
  isOpen, 
  onClose, 
  defaultDate,
  todoToEdit,
  suggestedAttendees = []
}: TaskFormProps) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('normal');
  const [project, setProject] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [time, setTime] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number>(15);
  const [hasReminder, setHasReminder] = useState(false);
  const [taskDate, setTaskDate] = useState('');
  const [attendees, setAttendees] = useState<{ email: string; displayName?: string; responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted' }[]>([]);
  const [newAttendeeEmail, setNewAttendeeEmail] = useState('');
  const [newAttendeeName, setNewAttendeeName] = useState('');
  
  // Custom decoration states
  const [selectedEmoji, setSelectedEmoji] = useState('📝');
  const [selectedGif, setSelectedGif] = useState('');
  const [customGifUrl, setCustomGifUrl] = useState('');
  const [taskColor, setTaskColor] = useState<string>(''); // empty means default of category
  const [errorString, setErrorString] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // GIPHY Live Search and custom list filtering states
  const [gifSearchQuery, setGifSearchQuery] = useState('');
  const [activeGifCategory, setActiveGifCategory] = useState<string>('all');

  // Infinite scroll states
  const [onlineStickers, setOnlineStickers] = useState<{ name: string; url: string }[]>([]);
  const [onlineOffset, setOnlineOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Suggestions computation for attendees
  const filteredSuggestions = newAttendeeEmail.trim()
    ? (suggestedAttendees || []).filter(
        (s) =>
          (s.email.toLowerCase().includes(newAttendeeEmail.toLowerCase()) ||
            (s.displayName && s.displayName.toLowerCase().includes(newAttendeeEmail.toLowerCase()))) &&
          !attendees.some((att) => att.email.toLowerCase() === s.email.toLowerCase())
      )
    : [];

  const quickSuggestions = (suggestedAttendees || []).filter(
    (s) => !attendees.some((att) => att.email.toLowerCase() === s.email.toLowerCase())
  ).slice(0, 5);

  const emojiPresets = ['📝', '💻', '🏃‍♂️', '🛒', '💊', '🍔', '📚', '🎵', '🐕', '💡', '🚗', '✈️', '💰', '🏠', '🎨', '🌟'];
  
  const gifPresets = [
    // --- WORK & STUDY (10 items) ---
    { name: '⚡ พิคาชูอ่านเขียน', url: 'https://i.giphy.com/3JUclOt6p9J9C.gif', category: 'work', tags: 'pikachu anime study learn work เขียน โค้ด พิคาชู อนิเมะ เรียน ทำงาน' },
    { name: '📖 กองตำราสุดปัง', url: 'https://i.giphy.com/l41lF9pYatK06YfS0.gif', category: 'work', tags: 'books studying reading school library เรียน สอบ อ่าน หนังสือ ห้องสมุด' },
    { name: '💻 พนักงานคีย์รัวๆ', url: 'https://i.giphy.com/fC5fB714Kq5mU.gif', category: 'work', tags: 'coding computer keyboard fast dev office เขียนโค้ด พิมพ์ งาน ออฟฟิศ' },
    { name: '⏰ นาฬิกาวิดพื้นพยายาม', url: 'https://i.giphy.com/l41JUuM9S6mIby1S4.gif', category: 'work', tags: 'clock alert time busy alarm clock ด่วน เวลา รีบ นาฬิกา สัญญาณเตือน' },
    { name: '🚀 จรวดนำโชคเทคออฟ', url: 'https://i.giphy.com/j4f0F6gIDZf8R6c36Q.gif', category: 'work', tags: 'rocket space flying startup rich money จรวด อวกาศ รวย นวัตกรรม โต' },
    { name: '🔥 ไฟลุกโชนสู้ตาย', url: 'https://i.giphy.com/2Fazg3XfIkYv8mSZO.gif', category: 'work', tags: 'fire hot flame boost passion power สู้ สู้ตาย ไฟลุก ขยัน มุ่งมั่น' },
    { name: '✍️ ดินสอเขียนสมุดด่วน', url: 'https://i.giphy.com/3o7qE0sa8hZc05Mv60.gif', category: 'work', tags: 'pencil write draw paper draft study ดินสอ เขียน ร่าง จด บันทึก' },
    { name: '🐹 หนูแฮมเตอร์เพ่งสายตา', url: 'https://i.giphy.com/l0HlyXpAMBS6w6M7K.gif', category: 'work', tags: 'hamster focus work computer study animal หนู สัตว์ แฮมเตอร์ เพ่ง ตั้งใจ มีสมาธิ' },
    { name: '💡 สมองพลังความคิดสว่าง', url: 'https://i.giphy.com/3o7TKoO70yFpS9uP1u.gif', category: 'work', tags: 'bulb light idea brainstorm creative คิดออก ความคิดสร้างสรรค์ ปิ๊ง ไอเดีย หลอดไฟ' },
    { name: '📄 พรินต์เอกสารด่วนจี๋', url: 'https://i.giphy.com/3o85xoi6bYqzy08fLy.gif', category: 'work', tags: 'paper print document fast busy office ทำงาน เอกสาร ปริ้น ยุ่ง กระดาษ' },

    // --- RELAX & FOOD (8 items) ---
    { name: '☕ กาแฟร้อนหอมๆ', url: 'https://i.giphy.com/2w5fM5NLqq8597w1fM.gif', category: 'relax', tags: 'coffee breakfast morning กาแฟ พักผ่อน เช้า อาหาร' },
    { name: '🌱 ชาซิมเมอร์พริ้วไหว', url: 'https://i.giphy.com/VIPg69Zp6e5Bkgic5m.gif', category: 'relax', tags: 'tea plant leaf calm green green-tea ชา ใบไม้ พักผ่อน ผ่อนคลาย ธรรมชาติ' },
    { name: '🍕 พิซซ่าอบเนยยืด', url: 'https://i.giphy.com/a9bbUvbt0Ipx6.gif', category: 'relax', tags: 'pizza slice cheese hungry delicious food กิน พิซซ่า อาหาร อร่อย หิว' },
    { name: '🛌 งีบหลับใต้ผ้าห่ม', url: 'https://i.giphy.com/l0MYS7XbH22f25wA0.gif', category: 'relax', tags: 'nap sleep bed night moon sheep resting นอน พักผ่อน เตียง คืน พักฟื้น' },
    { name: '🎧 แพนด้าโยกหูฟัง', url: 'https://i.giphy.com/l2Jhn9LhQWp6v26k3.gif', category: 'relax', tags: 'music song headphones panda beat dance เพลง ฟังเพลง หูฟัง แพนด้า เต้น' },
    { name: '🥤 ชานมไข่มุกแสนอร่อย', url: 'https://i.giphy.com/KclX0Z6S9V5BIPp66V.gif', category: 'relax', tags: 'boba milk tea sweet delicious ชานม ชานมไข่มุก หวาน ขนม' },
    { name: '🍩 โดนัทไอซิ่งเรนโบว์', url: 'https://i.giphy.com/3o7abKhEX5ODN5yHpT.gif', category: 'relax', tags: 'donut sweet pink dessert delicious โดนัท ขนมหวาน เบเกอรี่ อร่อย สดใส' },
    { name: '🍌 กล้วยเต้นระบำสุดกวน', url: 'https://i.giphy.com/3o7TKo7MuTalcZyvO8.gif', category: 'relax', tags: 'banana dance funny fruit joke ตลก กล้วย ขำ กวนตีน ผลไม้ เเต้น' },

    // --- HAPPY & PARTY (7 items) ---
    { name: '🛍️ ช้อปปิ้งพัสดุกระดก', url: 'https://i.giphy.com/H4DMcTPr6K8Y.gif', category: 'happy', tags: 'shop box grab purchase gift ช้อปปิ้ง ซื้อ ของขวัญ ส่งของ กล่อง' },
    { name: '⭐ ประกายดาวระยิบระยับ', url: 'https://i.giphy.com/3ohjV1w769QoRkaW5y.gif', category: 'happy', tags: 'star bling blink win shine celebrate สำเร็จ ชนะ วิบวับ ดาว ดีใจ' },
    { name: '🎉 แตรพลุดึงปังปัง', url: 'https://i.giphy.com/3o7qDQ4kcSD1PLM3BK.gif', category: 'happy', tags: 'party popper celebrate cheer holiday ฉลอง ปาร์ตี้ ยินดี วันหยุด สำเร็จ' },
    { name: '🎈 ลูกโป่งสวรรค์คัลเลอร์', url: 'https://i.giphy.com/l4KhS2g4IvsP8f81a.gif', category: 'happy', tags: 'balloons colorful up sky birthday air celebrate ลูกโป่ง สดใส วันเกิด ฉลอง' },
    { name: '🎂 เค้กวันเกิดปัดเทียน', url: 'https://i.giphy.com/l2Sq8w2D2S70x7uGk.gif', category: 'happy', tags: 'cake birthday candle blow happy celebrate เค้ก วันเกิด เป่าเค้ก สุขสันต์ สนุก' },
    { name: '🎁 กล่องของขวัญสั่นแกะ', url: 'https://i.giphy.com/l0IykOoHct92OKS52.gif', category: 'happy', tags: 'gift box open surprise birthday ของขวัญ กล่องของขวัญ เซอร์ไพรส์ ยินดี' },
    { name: '💖 หัวใจดวงคู่วิ้งกระโดด', url: 'https://i.giphy.com/3o7TKoWX7fU7M9K6hO.gif', category: 'happy', tags: 'love heart lovely romance happy รัก หัวใจ น่ารัก หวาน ซึ้ง แฟน' },

    // --- SPORTS & HEALTH (4 items) ---
    { name: '😺 เจ้าส้มวิ่งกลม', url: 'https://i.giphy.com/f7XpT8fQQO5xXb8FLa.gif', category: 'sports', tags: 'cat jog fun run sports running แมว วิ่ง สัตว์ ออกกำลัง สุขภาพ' },
    { name: '🧘‍♀️ คลายเครียดโยคะสติ', url: 'https://i.giphy.com/3oriNU06XPAcM8qS5y.gif', category: 'sports', tags: 'yoga meditation peaceful zen breathe สมาธิ โยคะ สงบ ผ่อนคลาย ยืดเส้น' },
    { name: '🥦 ผักแฮปปี้ชวนกินคลีน', url: 'https://i.giphy.com/l49JKCS98eRByq9rO.gif', category: 'sports', tags: 'veggie happy eat green fresh healthy ผัก สลัด บรอกโคลี สด สุขภาพ กินคลีน' },
    { name: '🏁 ธงตราหมากรุกเข้าชัย', url: 'https://i.giphy.com/l2Sqa7bOfP2GZ6Sbe.gif', category: 'sports', tags: 'flag race finish win success end วิ่ง แข่งขัน เส้นชัย ชนะ ธง' }
  ];

  // Fetch Giphy Stickers helper online infinitely
  const fetchMoreGiphy = async (reset: boolean = false) => {
    if (isLoadingMore || (!hasMore && !reset)) return;
    setIsLoadingMore(true);

    const limit = 20;
    const nextOffset = reset ? 0 : onlineOffset;
    let endpoint = '';
    const queryStr = gifSearchQuery.trim();

    if (queryStr) {
      endpoint = `https://api.giphy.com/v1/stickers/search?q=${encodeURIComponent(queryStr)}&limit=${limit}&offset=${nextOffset}&lang=th`;
    } else {
      if (activeGifCategory === 'all') {
        endpoint = `https://api.giphy.com/v1/stickers/trending?limit=${limit}&offset=${nextOffset}`;
      } else {
        let tag = 'work';
        if (activeGifCategory === 'relax') tag = 'coffee food relax boba';
        if (activeGifCategory === 'happy') tag = 'celebrate party happy win';
        if (activeGifCategory === 'sports') tag = 'sports gym exercise run yoga';
        endpoint = `https://api.giphy.com/v1/stickers/search?q=${encodeURIComponent(tag)}&limit=${limit}&offset=${nextOffset}&lang=th`;
      }
    }

    try {
      const keys = ['dc6zaTOxFJmzC', '3eP2vshgxpSg7Zzo09b6uD82N30bN6Vz', 'LBDZgV0STh6eXm88v0b7q9g3Vn9Z17R6'];
      let succeeded = false;
      let fetched: { name: string; url: string }[] = [];

      for (const k of keys) {
        if (succeeded) break;
        try {
          const resp = await fetch(`${endpoint}&api_key=${k}`);
          if (resp.ok) {
            const json = await resp.json();
            if (json && json.data) {
              fetched = json.data.map((item: any) => {
                const directUrl = item.images?.fixed_height?.url || 
                                  item.images?.fixed_width?.url || 
                                  item.images?.original?.url || 
                                  `https://media.giphy.com/media/${item.id}/giphy.gif`;
                return {
                  name: item.title || 'Sticker',
                  url: directUrl
                };
              });
              succeeded = true;
            }
          }
        } catch (innerErr) {
          console.warn("API Key fell back:", innerErr);
        }
      }

      if (succeeded) {
        setOnlineStickers(prev => reset ? fetched : [...prev, ...fetched]);
        setOnlineOffset(nextOffset + limit);
        setHasMore(fetched.length === limit);
      } else {
        if (reset) {
          setOnlineStickers([]);
        }
      }
    } catch (e) {
      console.warn("GIPHY request failed:", e);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Consolidated effect to fetch GIPHY stickers when category, query or modal openness changes
  React.useEffect(() => {
    if (!isOpen) return;
    
    const delayDebounce = setTimeout(() => {
      setHasMore(true);
      fetchMoreGiphy(true);
    }, gifSearchQuery.trim() ? 500 : 50);
    
    return () => clearTimeout(delayDebounce);
  }, [activeGifCategory, gifSearchQuery, isOpen]);

  // Sync selected calendar date, today, or edit fields with the form
  React.useEffect(() => {
    if (isOpen) {
      if (todoToEdit) {
        setText(todoToEdit.text);
        setPriority(todoToEdit.priority);
        setProject(todoToEdit.project);
        setTime(todoToEdit.time || '');
        setReminderMinutes(todoToEdit.reminderMinutes !== undefined ? todoToEdit.reminderMinutes : 15);
        setHasReminder(todoToEdit.reminderMinutes !== undefined);
        setTaskDate(todoToEdit.date || todoToEdit.createdAt.split('T')[0]);
        setSelectedEmoji(todoToEdit.emoji || '📝');
        setTaskColor(todoToEdit.color || '');
        setAttendees(todoToEdit.attendees || []);
        
        // Match preset gif or custom
        if (todoToEdit.gifUrl) {
          const isPreset = gifPresets.some(p => p.url === todoToEdit.gifUrl);
          if (isPreset) {
            setSelectedGif(todoToEdit.gifUrl);
            setCustomGifUrl('');
          } else {
            setSelectedGif('');
            setCustomGifUrl(todoToEdit.gifUrl);
          }
        } else {
          setSelectedGif('');
          setCustomGifUrl('');
        }
        
        // Show advanced settings if some special settings exist
        if (todoToEdit.color || todoToEdit.emoji || todoToEdit.gifUrl) {
          setShowAdvanced(true);
        } else {
          setShowAdvanced(false);
        }
      } else {
        // Clear all for normal addition
        setText('');
        setPriority('normal');
        setTime('');
        setReminderMinutes(15);
        setHasReminder(false);
        setSelectedEmoji('📝');
        setSelectedGif('');
        setCustomGifUrl('');
        setTaskColor('');
        setErrorString('');
        setAttendees([]);
        setShowAdvanced(false);
        
        if (categories.length > 0) {
          setProject(categories[0].name);
        } else {
          setProject('');
        }

        if (defaultDate) {
          setTaskDate(defaultDate);
        } else {
          const todayStr = new Date().toISOString().split('T')[0];
          setTaskDate(todayStr);
        }
      }
    }
  }, [isOpen, todoToEdit, defaultDate]);

  // Pre-fill first project if list is not empty
  React.useEffect(() => {
    if (categories.length > 0 && !project) {
      setProject(categories[0].name);
    }
  }, [categories, project]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErrorString('กรุณากรอกหัวข้อแผนงานก่อนครับ');
      return;
    }
    if (!project) {
      setErrorString('กรุณาเลือกโปรเจกต์หรือสร้างหมวดหมู่ใหม่ครับ');
      return;
    }

    const finalGifUrl = customGifUrl.trim() || selectedGif;

    const taskFields = {
      text: text.trim(),
      priority,
      project,
      time: time || undefined,
      reminderMinutes: hasReminder ? Number(reminderMinutes) : undefined,
      emoji: selectedEmoji,
      gifUrl: finalGifUrl || undefined,
      color: taskColor || undefined,
      date: taskDate || undefined,
      attendees: attendees.length > 0 ? attendees : undefined
    };

    if (todoToEdit && onEditTask) {
      onEditTask(todoToEdit.id, taskFields);
    } else {
      onAddTask(taskFields);
    }

    // Reset Form
    setText('');
    setPriority('normal');
    setTime('');
    setHasReminder(false);
    setSelectedEmoji('📝');
    setSelectedGif('');
    setCustomGifUrl('');
    setTaskColor('');
    setErrorString('');
    setAttendees([]);
    onClose();
  };

  const handleAddNewProject = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    onAddCategory(newProjectName.trim(), newProjectColor);
    setProject(newProjectName.trim());
    setNewProjectName('');
    setShowNewProjectForm(false);
  };

  const handleAddAttendee = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newAttendeeEmail.trim()) return;
    
    // Simple email validation pattern
    if (!newAttendeeEmail.includes('@')) {
      setErrorString('รูปแบบอีเมลของผู้เข้าร่วมไม่ถูกต้อง');
      return;
    }

    // Check if duplicate email
    if (attendees.some(att => att.email.toLowerCase() === newAttendeeEmail.trim().toLowerCase())) {
      setErrorString('อีเมลผู้เข้าร่วมนี้ถูกเพิ่มไว้แล้ว');
      return;
    }

    setAttendees([
      ...attendees,
      {
        email: newAttendeeEmail.trim(),
        displayName: newAttendeeName.trim() || undefined,
        responseStatus: 'needsAction'
      }
    ]);
    setNewAttendeeEmail('');
    setNewAttendeeName('');
    setErrorString('');
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter(att => att.email !== email));
  };

  const projectColors = [
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Orange', hex: '#f97316' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Rose', hex: '#f43f5e' }
  ];

  const filteredPresets = gifPresets.filter(preset => {
    if (activeGifCategory !== 'all' && preset.category !== activeGifCategory) return false;
    if (gifSearchQuery.trim()) {
      const q = gifSearchQuery.toLowerCase();
      return preset.name.toLowerCase().includes(q) || preset.tags.toLowerCase().includes(q);
    }
    return true;
  });

  const handleStickersScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 35) {
      if (!isLoadingMore && hasMore) {
        fetchMoreGiphy(false);
      }
    }
  };

  return (
    <div id="addTaskModal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div 
        className="w-full max-w-md bg-[#12161f] border border-slate-800/80 rounded-[24px] overflow-hidden shadow-2xl transition-all flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header section */}
        <div className="px-5 py-3.5 border-b border-slate-800/60 flex items-center justify-between shrink-0 bg-[#161b26]">
          <div className="flex items-center gap-2">
            <span className="text-lg">{todoToEdit ? '✏️' : '⚡'}</span>
            <h3 className="text-sm font-bold text-white font-display">
              {todoToEdit ? 'แก้ไขแผนงานที่สร้างไว้' : 'สร้างแผนงานใหม่'}
            </h3>
          </div>
          <button 
            id="closeModalBtn"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs bg-slate-800/40 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-sans"
          >
            ยกเลิก
          </button>
        </div>

        {/* Form elements body (Scrollable to prevent full-screen takeover on low height viewports) */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {errorString && (
            <div id="formError" className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorString}</span>
            </div>
          )}

          {/* Task text string input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 tracking-wide uppercase block">ชื่องาน / รายละเอียด</label>
            <input
              id="taskTextInput"
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (e.target.value.trim()) setErrorString('');
              }}
              placeholder="ประชุมงาน, ออกกำลังกาย, ซื้อของ..."
              className="w-full px-3.5 py-2.5 bg-[#0b0e14] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-all font-sans"
              autoFocus
            />
          </div>

          {/* Project selection & Custom addition of categories */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 tracking-wide uppercase block">โปรเจกต์ / หมวดหมู่</label>
              <button
                id="toggleProjectFormBtn"
                type="button"
                onClick={() => setShowNewProjectForm(!showNewProjectForm)}
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-medium cursor-pointer"
              >
                {showNewProjectForm ? '← เลือกหมวดหมู่เดิม' : '+ สร้างประเภทใหม่'}
              </button>
            </div>

            {showNewProjectForm ? (
              <div id="newProjectBox" className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl space-y-2.5 animate-fade-in">
                <input
                  id="newProjectInput"
                  type="text"
                  placeholder="ชื่อประเภทใหม่ เช่น สุขภาพ, อ่านหนังสือ..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0b0e14] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5">
                    {projectColors.map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setNewProjectColor(col.hex)}
                        className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                          newProjectColor === col.hex ? 'border-white scale-110' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.name}
                      />
                    ))}
                  </div>
                  <button
                    id="saveProjectBtn"
                    type="button"
                    onClick={handleAddNewProject}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-md transition-all cursor-pointer"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <select
                  id="projectSelect"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-[#0b0e14] border border-slate-800 rounded-xl text-white text-xs focus:outline-none appearance-none cursor-pointer font-sans"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      📁 {cat.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>
            )}
          </div>

          {/* Date Selector Field */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">📅</span>
              <label className="text-[11px] font-bold text-slate-400 tracking-wide uppercase block">วันที่กำหนดแผนงาน</label>
            </div>
            <input
              id="taskDateInput"
              type="date"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0b0e14] border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:border-blue-500 transition-all font-mono"
            />
          </div>

          {/* Parallel columns layout: Priority & Time */}
          <div className="grid grid-cols-2 gap-3 pb-1">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 tracking-wide uppercase block">ระดับความสำคัญ</label>
              <div className="flex gap-1.5 bg-[#0b0e14] p-1 rounded-xl border border-slate-800">
                <button
                  id="priorityNormalBtn"
                  type="button"
                  onClick={() => setPriority('normal')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                    priority === 'normal' 
                      ? 'bg-slate-800 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-400'
                  }`}
                >
                  ทั่วไป
                </button>
                <button
                  id="priorityHighBtn"
                  type="button"
                  onClick={() => setPriority('high')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                    priority === 'high' 
                      ? 'bg-orange-500/20 text-orange-400 shadow-sm' 
                      : 'text-slate-500 hover:text-orange-400/80'
                  }`}
                >
                  🔥 ด่วน
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-500" />
                <label className="text-[11px] font-bold text-slate-400 tracking-wide uppercase block">เวลาที่จัดสรร</label>
              </div>
              <input
                id="taskTimeInput"
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  if (e.target.value && !hasReminder) {
                    setHasReminder(true);
                  }
                }}
                className="w-full px-3 py-1.5 bg-[#0b0e14] border border-slate-800 rounded-xl text-white text-xs focus:outline-none text-center font-mono"
              />
            </div>
          </div>

          {/* Reminder configuration - tightly wrapped */}
          {time && (
            <div className="p-3 bg-slate-900/20 border border-slate-800/40 rounded-xl flex items-center justify-between gap-3 animate-fade-in shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-blue-500" />
                <div className="leading-none">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase block mb-0.5">แจ้งเตือนล่วงหน้า</span>
                  <span className="text-[10px] text-slate-500 italic">ส่งเสียงเตือนเวลาจริง</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  id="reminderMinutesSelect"
                  value={reminderMinutes}
                  onChange={(e) => setReminderMinutes(Number(e.target.value))}
                  className="px-2 py-1 bg-[#0b0e14] border border-slate-800 rounded-lg text-white text-[11px] focus:outline-none cursor-pointer"
                >
                  <option value={0}>ตรงเวลาเป๊ะ</option>
                  <option value={5}>ล่วงหน้า 5 นาที</option>
                  <option value={15}>ล่วงหน้า 15 นาที</option>
                  <option value={30}>ล่วงหน้า 30 นาที</option>
                  <option value={60}>ล่วงหน้า 1 ชม.</option>
                </select>
                <input
                  id="reminderToggle"
                  type="checkbox"
                  checked={hasReminder}
                  onChange={(e) => setHasReminder(e.target.checked)}
                  className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Attendees input section */}
          <div className="space-y-2 p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                👥 ผู้เข้าร่วมแผนงาน ({attendees.length})
              </span>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              เชิญผู้เข้าร่วมแผนงาน (เชื่อมต่อและส่งคำเชิญปฏิทินหากซิงค์ไป Google Calendar)
            </p>

            <div className="flex flex-col gap-2 bg-[#0b0e14] p-2.5 rounded-lg border border-slate-800/80">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="อีเมลผู้เข้าร่วม เช่น test@gmail.com"
                  value={newAttendeeEmail}
                  onChange={(e) => setNewAttendeeEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                />
                <input
                  type="text"
                  placeholder="ชื่อผู้เข้าร่วม"
                  value={newAttendeeName}
                  onChange={(e) => setNewAttendeeName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
              <button
                type="button"
                onClick={handleAddAttendee}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>➕</span> เพิ่มผู้เข้าร่วม
              </button>

              {/* Suggestions Section */}
              {newAttendeeEmail.trim() ? (
                filteredSuggestions.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 border-t border-slate-800/40 pt-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">🔍 ค้นพบจากประวัติ:</span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {filteredSuggestions.map((qs) => (
                        <button
                          key={qs.email}
                          type="button"
                          onClick={() => {
                            setAttendees([
                              ...attendees,
                              {
                                email: qs.email,
                                displayName: qs.displayName,
                                responseStatus: 'needsAction'
                              }
                            ]);
                            setNewAttendeeEmail('');
                            setNewAttendeeName('');
                          }}
                          className="px-2 py-1 rounded-lg bg-blue-950/50 hover:bg-blue-900/40 border border-blue-900/50 hover:border-blue-500/80 text-[9.5px] text-blue-200 transition-all cursor-pointer flex items-center gap-1"
                          title="คลิกเพื่อเพิ่มทันที"
                        >
                          <span>👤</span>
                          <span className="font-semibold">{qs.displayName || qs.email.split('@')[0]}</span>
                          <span className="text-[8.5px] opacity-60">({qs.email})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                quickSuggestions.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1 border-t border-slate-800/40 pt-1.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">💡 ผู้ติดต่อที่เคยแชร์ล่าสุด:</span>
                    <div className="flex flex-wrap gap-1">
                      {quickSuggestions.map((qs) => (
                        <button
                          key={qs.email}
                          type="button"
                          onClick={() => {
                            setAttendees([
                              ...attendees,
                              {
                                email: qs.email,
                                displayName: qs.displayName,
                                responseStatus: 'needsAction'
                              }
                            ]);
                          }}
                          className="px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[10px] text-slate-300 transition-all cursor-pointer flex items-center gap-1"
                          title="คลิกเพื่อเพิ่มทันที"
                        >
                          <span className="text-blue-400">👤</span>
                          <span>{qs.displayName || qs.email.split('@')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {attendees.length > 0 && (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {attendees.map((att) => (
                  <div 
                    key={att.email} 
                    className="flex items-center justify-between bg-slate-950/80 p-2 rounded-lg border border-slate-850 text-xs text-slate-300"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold truncate text-[11px] text-white">
                        {att.displayName || att.email.split('@')[0]}
                      </span>
                      <span className="text-[9.5px] text-slate-500 truncate">{att.email}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select
                        value={att.responseStatus}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setAttendees(prev => prev.map(item => item.email === att.email ? { ...item, responseStatus: val } : item));
                        }}
                        className="bg-[#0b0e14] border border-slate-800 text-[9.5px] text-slate-300 rounded px-1.5 py-0.5"
                      >
                        <option value="needsAction">⏳ ยังไม่ตอบรับ</option>
                        <option value="accepted">✅ ตอบรับแล้ว</option>
                        <option value="tentative">❓ อาจจะเข้าร่วม</option>
                        <option value="declined">❌ ปฏิเสธ</option>
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => handleRemoveAttendee(att.email)}
                        className="text-red-400 hover:text-red-300 text-xs p-1 cursor-pointer"
                        title="ลบ"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COLLAPSIBLE ADVANCED STYLING SECTION */}
          <div className="pt-1.5">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full py-2.5 px-3.5 bg-slate-900/35 hover:bg-slate-900/60 border border-slate-800/40 hover:border-slate-800/80 rounded-xl text-[11px] font-bold text-slate-400 hover:text-slate-300 transition-all flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>🎨</span>
                <span>ตกแต่งเพิ่มเติม (สีงาน, Emoji, Giphy)</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-250 ${showAdvanced ? 'rotate-180 text-white' : ''}`} />
            </button>
          </div>

          {showAdvanced && (
            <div className="space-y-4 p-3.5 bg-slate-900/25 border border-slate-800/30 rounded-2xl animate-fade-in space-y-4">
              {/* Task Custom Theme Color selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase">สีพิเศษประจำงานนี้</label>
                  {taskColor && (
                    <button
                      type="button"
                      onClick={() => setTaskColor('')}
                      className="text-[9px] text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      ↩️ ใช้สีดั้งเดิมตามหมวดหมู่
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#0b0e14] border border-slate-800/50 rounded-xl">
                  {(() => {
                    const selectedCategory = categories.find(cat => cat.name === project);
                    const categoryColor = selectedCategory ? selectedCategory.color : '#3b82f6';
                    const taskPresets = [
                      { name: 'Red', hex: '#ef4444' },
                      { name: 'Orange', hex: '#f97316' },
                      { name: 'Amber', hex: '#f59e0b' },
                      { name: 'Green', hex: '#10b981' },
                      { name: 'Blue', hex: '#3b82f6' },
                      { name: 'Indigo', hex: '#6366f1' },
                      { name: 'Purple', hex: '#a855f7' },
                    ];
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setTaskColor('')}
                          className={`relative w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            !taskColor ? 'border-blue-500 scale-110 ring-2 ring-blue-500/20' : 'border-slate-800/50 opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: categoryColor }}
                          title="ใช้สีตามประเภทหลัก"
                        >
                          <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">📁</span>
                        </button>

                        {taskPresets.map((col) => (
                          <button
                            key={col.hex}
                            type="button"
                            onClick={() => setTaskColor(col.hex)}
                            className={`w-6 h-6 rounded-lg border transition-all cursor-pointer ${
                              taskColor === col.hex ? 'border-white scale-110 ring-2 ring-slate-100/10' : 'border-slate-800/50 opacity-70 hover:opacity-100'
                            }`}
                            style={{ backgroundColor: col.hex }}
                            title={col.name}
                          />
                        ))}

                        <div className="flex items-center gap-1 ml-auto pl-2 border-l border-slate-800/50">
                          <input
                            type="color"
                            value={taskColor || categoryColor}
                            onChange={(e) => setTaskColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                            title="เลือกสีเจาะจงเอง"
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Emoji Decoration preset picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase">ตกแต่งไอคอน Emoji</label>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded-md font-mono font-bold">{selectedEmoji}</span>
                </div>
                <div className="grid grid-cols-8 gap-1 p-1.5 bg-[#0b0e14] border border-slate-800/50 rounded-xl">
                  {emojiPresets.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      onClick={() => setSelectedEmoji(emo)}
                      className={`py-1 text-sm rounded-md hover:bg-slate-800/50 transition-all cursor-pointer ${
                        selectedEmoji === emo ? 'bg-slate-800 border border-blue-500/45 scale-110 font-bold' : 'border border-transparent opacity-85 hover:opacity-100'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="หรือระบุ Emoji อื่นเองได้ที่นี่..."
                  maxLength={4}
                  value={selectedEmoji}
                  onChange={(e) => setSelectedEmoji(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0b0e14] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              {/* Sticker GIF selection presets & preview */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-bold text-slate-400 block tracking-wide uppercase">
                  ตกแต่งและเพิ่ม Sticker Giphy ดุ๊กดิ๊ก
                </label>

                {/* Big Preview Area */}
                <div className="flex flex-col items-center justify-center p-3 bg-[#0b0e14] border border-slate-800/80 rounded-2xl">
                  <div className="text-[9.5px] font-bold text-slate-500 mb-2 uppercase tracking-wide">
                    พรีวิวสติกเกอร์ขนาดใหญ่ (Preview)
                  </div>
                  
                  <div className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center rounded-2xl bg-slate-900/40 border-2 border-dashed border-slate-800 p-2 relative group/preview shadow-inner transition-all duration-300">
                    {customGifUrl || selectedGif ? (
                      <>
                        <img 
                          src={customGifUrl || selectedGif} 
                          alt="Large Sticker Preview" 
                          className="max-w-full max-h-full object-contain animate-bounce" 
                          style={{ animationDuration: '3s' }}
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGif('');
                            setCustomGifUrl('');
                          }}
                          className="absolute -top-1.5 -right-1.5 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg transition-transform active:scale-90 cursor-pointer"
                          title="ลบสติกเกอร์"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2">
                        <Sparkles className="w-6 h-6 text-slate-700 mx-auto mb-1 animate-pulse" />
                        <span className="text-[9px] text-slate-500 block leading-tight font-sans">ไม่ได้เลือกสติกเกอร์</span>
                      </div>
                    )}
                  </div>
                  {(customGifUrl || selectedGif) && (
                    <span className="text-[9px] text-emerald-400 font-medium block mt-2 text-center animate-pulse">
                      ✨ สติกเกอร์ขนาดใหญ่ดุ๊กดิ๊กพร้อมแสดงในบอร์ดแล้ว!
                    </span>
                  )}
                </div>

                {/* Search options & Category filter */}
                <div className="space-y-2 p-3 bg-[#0b0e14] border border-slate-800/50 rounded-2xl">
                  {/* Search input field */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 ค้นหา Sticker จาก GIPHY ออนไลน์ หรือคีย์เวิร์ด..."
                      value={gifSearchQuery}
                      onChange={(e) => setGifSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-16 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    {isLoadingMore && gifSearchQuery.trim() ? (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-blue-400 font-mono font-bold animate-pulse">
                        กำลังค้นหา...
                      </span>
                    ) : gifSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setGifSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-350 cursor-pointer"
                      >
                        ล้างข้อมูล
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex gap-1 overflow-x-auto pb-1 clip-scrollbar snap-x">
                    {[
                      { id: 'all', label: 'ทั้งหมด' },
                      { id: 'work', label: '🎓 ทำงาน/เรียน' },
                      { id: 'relax', label: '☕ พักผ่อน/หิว' },
                      { id: 'happy', label: '🎉 ปาร์ตี้/ฉลอง' },
                      { id: 'sports', label: '🏃‍♂️ สุขภาพ/กีฬา' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveGifCategory(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-[9.5px] font-bold shrink-0 transition-all cursor-pointer ${
                          activeGifCategory === tab.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-850'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Interactive Stickers Grid */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-bold text-blue-400 block uppercase">
                          💖 คลังสติกเกอร์พรีเมียม & GIPHY (อิฟีนีตี้)
                        </span>
                        <span className="text-[8px] text-slate-500 font-semibold uppercase">
                          แสดง {filteredPresets.length + onlineStickers.filter(s => !filteredPresets.map(p => p.url).includes(s.url)).length} ใบ
                        </span>
                      </div>
                      
                      {filteredPresets.length === 0 && onlineStickers.length === 0 && !isLoadingMore ? (
                        <div className="text-center py-4 bg-slate-950/20 rounded-xl border border-dashed border-slate-900 text-[10px] text-slate-500">
                          ไม่พบสติกเกอร์ที่ตรงกับแถบย่อย
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div 
                            onScroll={handleStickersScroll}
                            className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-[175px] overflow-y-auto custom-scrollbar p-1.5 bg-slate-950/40 rounded-xl border border-slate-900"
                          >
                            {(() => {
                              const presetUrls = new Set(filteredPresets.map(p => p.url));
                              const uniqueOnlineStickers = onlineStickers.filter(s => !presetUrls.has(s.url));
                              const combinedStickers = [...filteredPresets, ...uniqueOnlineStickers];
                              
                              return combinedStickers.map((sticker, idx) => {
                                const isChosen = selectedGif === sticker.url;
                                return (
                                  <button
                                    key={`${sticker.url}-${idx}`}
                                    type="button"
                                    onClick={() => {
                                      setSelectedGif(sticker.url);
                                      setCustomGifUrl('');
                                    }}
                                    className={`relative aspect-square p-1.5 rounded-xl bg-slate-900 border hover:scale-105 duration-200 transition-all overflow-hidden flex items-center justify-center cursor-pointer ${
                                      isChosen 
                                        ? 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-950/20' 
                                        : 'border-slate-800/60 hover:bg-slate-800 hover:border-slate-705'
                                    }`}
                                    title={sticker.name}
                                  >
                                    <img
                                      src={sticker.url}
                                      alt={sticker.name}
                                      className="max-w-full max-h-full object-contain pointer-events-none"
                                      referrerPolicy="no-referrer"
                                    />
                                    {presetUrls.has(sticker.url) && (
                                      <span className="absolute top-0.5 right-0.5 bg-blue-500/85 text-[6.5px] px-1 py-0.2 rounded-md scale-75 text-white font-bold tracking-wide">
                                        PRESET
                                      </span>
                                    )}
                                  </button>
                                );
                              });
                            })()}
                            
                            {isLoadingMore && (
                              <div className="col-span-full text-center py-2 text-[8.5px] font-bold text-blue-500 animate-pulse flex items-center justify-center gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping mr-1 text-blue-500 inline-block"></span>
                                กำลังโหลดรูปภาพพรีเมียมจาก GIPHY... (อิฟีนีตี้)
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Manual URL entry field */}
                  <div className="pt-1.5 border-t border-slate-900">
                    <span className="text-[9px] font-bold text-slate-500 block mb-1">หรือระบุ URL รูปภาพสติกเกอร์ / GIF อื่นเอง:</span>
                    <input
                      type="text"
                      placeholder="ระบุลิงก์รูปภาพโปร่งใสคัสตอม (เช่น https://example.com/sticker.gif)..."
                      value={customGifUrl}
                      onChange={(e) => {
                        setCustomGifUrl(e.target.value);
                        if (e.target.value) {
                          setSelectedGif('');
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0b0e14] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 font-sans"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit Action footer CTA */}
          <div className="pt-2 shrink-0">
            <button
              id="submitTaskBtn"
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.015]"
            >
              {todoToEdit ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" /> ยืนยันการแก้ไขแผนงาน
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" /> ยืนยันเพิ่มแผนงานรายวัน
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
