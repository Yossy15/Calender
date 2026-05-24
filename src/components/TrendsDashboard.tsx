import React, { useState, useMemo } from 'react';
import { Todo, ProjectCategory } from '../types';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  PieChart, Pie, Cell 
} from 'recharts';
import { TrendingUp, Award, Calendar, ChevronRight, Activity, CheckCircle2, ListTodo, Archive } from 'lucide-react';

interface TrendsDashboardProps {
  todos: Todo[];
  categories: ProjectCategory[];
}

export default function TrendsDashboard({ todos, categories }: TrendsDashboardProps) {
  const [includeDemoData, setIncludeDemoData] = useState<boolean>(todos.length < 5);

  // Define Thai date format helpers
  const formatThaiDate = (date: Date) => {
    const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const dayName = days[date.getDay()];
    const dateNum = date.getDate();
    const monthName = months[date.getMonth()];
    return `${dayName} ${dateNum} ${monthName}`;
  };

  const getISODateKey = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 7 Days list generators
  const last7DaysList = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dates.push(d);
    }
    return dates;
  }, []);

  // Compute stats dynamically
  const chartData = useMemo(() => {
    // Demo seed data to show beautifully when current user database is relatively new or empty
    const demoSeeds: Record<string, { created: number; completed: number }> = {};
    if (includeDemoData) {
      last7DaysList.forEach((date, idx) => {
        const key = getISODateKey(date);
        // Vary values to make an elegant, realistic fluctuating graph
        const seedValue = [
          { created: 4, completed: 3 },
          { created: 5, completed: 4 },
          { created: 3, completed: 3 },
          { created: 6, completed: 5 },
          { created: 4, completed: 2 },
          { created: 7, completed: 6 },
          { created: 5, completed: 4 },
        ][idx % 7];
        demoSeeds[key] = seedValue;
      });
    }

    return last7DaysList.map((date) => {
      const key = getISODateKey(date);
      const formattedLabel = formatThaiDate(date);

      // Filter real items matching this direct date
      const realCreatedCount = todos.filter(t => t.createdAt && t.createdAt.startsWith(key)).length;
      const realCompletedCount = todos.filter(t => t.completed && t.completedAt && t.completedAt.startsWith(key)).length;

      // Merge real counts with optional demo seeds
      const seed = demoSeeds[key] || { created: 0, completed: 0 };
      const totalCreated = realCreatedCount + seed.created;
      const totalCompleted = realCompletedCount + seed.completed;

      return {
        key,
        dateLabel: formattedLabel,
        "งานที่สร้าง": totalCreated,
        "งานที่สำเร็จ": totalCompleted,
        "อัตราการทำเสร็จ (%)": totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0
      };
    });
  }, [todos, last7DaysList, includeDemoData]);

  // Project breakdown statistics data
  const projectBreakdownData = useMemo(() => {
    const counts: Record<string, { value: number; color: string }> = {};

    // Initialize all project categories
    categories.forEach(cat => {
      counts[cat.name] = { value: 0, color: cat.color };
    });

    // Populate with real tasks count
    todos.forEach(t => {
      if (counts[t.project]) {
        counts[t.project].value += 1;
      } else {
        // Fallback for custom entries outside category preset list safely
        counts[t.project] = { value: 1, color: '#3b82f6' };
      }
    });

    // Format for Recharts consumption
    const result = Object.entries(counts)
      .map(([name, data]) => ({ name, value: data.value, color: data.color }))
      .filter(item => item.value > 0);

    // Default stats if empty projects
    if (result.length === 0) {
      return [
        { name: 'ทั่วไป', value: 3, color: '#10b981' },
        { name: 'งานบริษัท', value: 2, color: '#3b82f6' },
        { name: 'เป้าหมายส่วนตัว', value: 1, color: '#f59e0b' }
      ];
    }
    return result;
  }, [todos, categories]);

  // Core metrics calculation
  const metrics = useMemo(() => {
    const totalCreated = chartData.reduce((acc, curr) => acc + curr["งานที่สร้าง"], 0);
    const totalCompleted = chartData.reduce((acc, curr) => acc + curr["งานที่สำเร็จ"], 0);
    const successRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;

    // Find peak day
    let peakDay = "ไม่มี";
    let maxCompletedValue = 0;
    chartData.forEach(day => {
      if (day["งานที่สำเร็จ"] > maxCompletedValue) {
        maxCompletedValue = day["งานที่สำเร็จ"];
        peakDay = day.dateLabel;
      }
    });

    return {
      totalCreated,
      totalCompleted,
      successRate,
      peakDay,
      maxCompletedValue
    };
  }, [chartData]);

  // High vs low priority breakdown
  const priorityBreakdown = useMemo(() => {
    const highCount = todos.filter(t => t.priority === 'high').length;
    const normalCount = todos.filter(t => t.priority === 'normal').length;

    if (highCount === 0 && normalCount === 0 && includeDemoData) {
      return [
        { name: 'งานเร่งด่วน', value: 3, color: '#f97316' },
        { name: 'งานทั่วไป', value: 7, color: '#6366f1' }
      ];
    }

    return [
      { name: 'งานเร่งด่วน', value: highCount, color: '#f97316' },
      { name: 'งานทั่วไป', value: normalCount, color: '#6366f1' }
    ].filter(i => i.value > 0);
  }, [todos, includeDemoData]);

  // 'Smart Insights' summary engine - analyzes completion patterns and suggests peak week slot
  const smartInsights = useMemo(() => {
    const completions: { dayOfWeek: number; hour: number }[] = [];

    // 1) Extract real completion patterns
    todos.forEach((todo) => {
      if (todo.completed && todo.completedAt) {
        const d = new Date(todo.completedAt);
        if (!isNaN(d.getTime())) {
          completions.push({
            dayOfWeek: d.getDay(),
            hour: d.getHours(),
          });
        }
      }
    });

    // 2) If low or zero real completions, or includeDemoData is active, inject high-fidelity mock completions
    if (completions.length < 5 || includeDemoData) {
      const demoData = [
        { dayOfWeek: 1, hour: 9 },  // Mon Morning
        { dayOfWeek: 1, hour: 10 },
        { dayOfWeek: 2, hour: 14 }, // Tue Afternoon
        { dayOfWeek: 3, hour: 14 }, // Wed Afternoon
        { dayOfWeek: 3, hour: 15 },
        { dayOfWeek: 3, hour: 16 },
        { dayOfWeek: 4, hour: 11 }, // Thu Morning
        { dayOfWeek: 4, hour: 15 }, // Thu Afternoon
        { dayOfWeek: 5, hour: 10 }, // Fri Morning
        { dayOfWeek: 5, hour: 14 }, // Fri Afternoon
      ];
      demoData.forEach(item => completions.push(item));
    }

    const dayCounts = Array(7).fill(0);
    const hourCounts = {
      morning: 0,   // 5:00 - 12:00
      afternoon: 0, // 12:00 - 18:00
      evening: 0,   // 18:00 - 24:00
      night: 0,     // 00:00 - 05:00
    };

    completions.forEach((c) => {
      dayCounts[c.dayOfWeek]++;
      if (c.hour >= 5 && c.hour < 12) {
        hourCounts.morning++;
      } else if (c.hour >= 12 && c.hour < 18) {
        hourCounts.afternoon++;
      } else if (c.hour >= 18 && c.hour < 24) {
        hourCounts.evening++;
      } else {
        hourCounts.night++;
      }
    });

    const dayNamesThai = [
      'วันอาทิตย์ (Sunday)',
      'วันจันทร์ (Monday)',
      'วันอังคาร (Tuesday)',
      'วันพุธ (Wednesday)',
      'วันพฤหัสบดี (Thursday)',
      'วันศุกร์ (Friday)',
      'วันเสาร์ (Saturday)'
    ];

    const dayShortNamesThai = [
      'วันอาทิตย์',
      'วันจันทร์',
      'วันอังคาร',
      'วันพุธ',
      'วันพฤหัสบดี',
      'วันศุกร์',
      'วันเสาร์'
    ];

    let peakDayIdx = 3; // Default is Wednesday
    let maxDayCount = 0;
    dayCounts.forEach((count, idx) => {
      if (count > maxDayCount) {
        maxDayCount = count;
        peakDayIdx = idx;
      }
    });

    let peakTimeBlockKey = 'afternoon';
    let maxTimeCount = 0;
    Object.entries(hourCounts).forEach(([key, val]) => {
      if (val > maxTimeCount) {
        maxTimeCount = val;
        peakTimeBlockKey = key;
      }
    });

    const timeBlockLabels: Record<string, { title: string; time: string; advice: string }> = {
      morning: {
        title: 'ช่วงเช้าตรู่และสาย',
        time: '05:00 - 12:00 น.',
        advice: 'คุณมีสมาธิตื่นตัวสูงสุดในช่วงเช้า เหมาะสำหรับการวางกลยุทธ์ ทำงานยาก หรือวิชาการโครงการใหม่ๆ'
      },
      afternoon: {
        title: 'ช่วงบ่ายแก่ๆ',
        time: '12:00 - 18:00 น.',
        advice: 'คุณมักรักษาพลังงานได้ดีช่วงหลังมื้อเที่ยง เหมาะสำหรับการประชุมประสานงาน การลงมือรวดเร็ว หรือเช็คชีตงานทั่วไป'
      },
      evening: {
        title: 'ช่วงค่ำและหลังเลิกงาน',
        time: '18:00 - 24:00 น.',
        advice: 'คุณมีความสงบเงียบพุ่งโฟกัสช่วงท้ายวัน เหมาะสำหรับงานสร้างสรรค์ งานวิจัย หรือสะสางส่วนตัว'
      },
      night: {
        title: 'ช่วงกลางดึก/โต้รุ่ง',
        time: '00:00 - 05:00 น.',
        advice: 'คุณเป็นคนประเภทนกฮูกราตรี มีไอเดียยามเงียบ แต่พยายามจัดเวลานอนให้สม่ำเสมอเพื่อสุขอนามัยที่ดีที่สุด'
      }
    };

    return {
      peakDay: dayNamesThai[peakDayIdx],
      peakDayBrief: dayShortNamesThai[peakDayIdx],
      peakTimeTitle: timeBlockLabels[peakTimeBlockKey].title,
      peakTimeRange: timeBlockLabels[peakTimeBlockKey].time,
      advice: timeBlockLabels[peakTimeBlockKey].advice,
      totalAnalyzed: completions.length,
      dayDistribution: dayCounts,
      hourDistribution: hourCounts
    };
  }, [todos, includeDemoData]);

  return (
    <div id="trendsDashboardView" className="space-y-6 pb-4">
      
      {/* Upper options header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/20 border border-slate-800/40 rounded-2xl">
        <div>
          <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 font-display uppercase tracking-wide">
            <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
            สรุปข้อมูลเชิงวิเคราะห์ผลิตภาพเชิงลึก
          </h3>
          <p className="text-[10px] text-slate-500 mt-1 font-sans">
            สถิติติดตามและประมวลผลงานรายวัน คำนวณความคืบหน้ารอบ 7 วันที่ผ่านมาย้อนหลัง
          </p>
        </div>
        
        {/* Toggle switch for test data matching specs */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-[10px] text-slate-400 font-medium">รวมชุดข้อมูลจำลองเสมือนจริง:</span>
          <button
            id="toggleDemoDataBtn"
            type="button"
            onClick={() => setIncludeDemoData(!includeDemoData)}
            className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all border shrink-0 cursor-pointer ${
              includeDemoData 
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                : 'bg-slate-800/40 border-slate-800/80 text-slate-400'
            }`}
          >
            {includeDemoData ? 'เปิดใช้งานอยู่' : 'ปิดการใช้งาน'}
          </button>
        </div>
      </div>

      {/* Grid statistics summaries */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* KPI 1 */}
        <div className="p-4 bg-[#12161f] border border-slate-800/40 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">งานที่ถูกจัดตั้ง</span>
            <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400 border border-blue-500/20">
              <ListTodo className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-white font-mono leading-none">{metrics.totalCreated}</span>
            <span className="text-[10px] text-slate-500 ml-1.5">รายการ</span>
            <div className="text-[9px] text-slate-500 mt-1 font-sans">คำนวณจากประวัติการสร้าง</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 bg-[#12161f] border border-slate-800/40 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">สถิติความสำเร็จ</span>
            <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-400 font-mono leading-none">{metrics.totalCompleted}</span>
            <span className="text-[10px] text-slate-500 ml-1.5">รายการ</span>
            <div className="text-[9px] text-slate-500 mt-1 font-sans">งานที่กดยืนยันทั้งหมด</div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 bg-[#12161f] border border-slate-800/40 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ดัชนีเคลียร์งาน</span>
            <div className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center text-orange-400 border border-orange-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-black text-white font-mono leading-none">{metrics.successRate}%</span>
            <span className="text-[10px] text-slate-500 ml-1.5">เฉลี่ย</span>
            <div className="text-[9px] text-orange-400/80 mt-1 font-sans flex items-center gap-1">
              <span>🚀</span> <span>ประสิทธิภาพระดับดี</span>
            </div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 bg-[#12161f] border border-slate-800/40 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">วันทำงานพีคสุด</span>
            <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-500 border border-amber-500/20">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <span className="text-sm font-bold text-amber-400 leading-none truncate block max-w-full">{metrics.peakDay}</span>
            <div className="text-[9px] text-slate-500 mt-1 font-sans">
              ทำเสร็จ <span className="text-white font-mono font-medium">{metrics.maxCompletedValue}</span> งานในหนึ่งเดียว
            </div>
          </div>
        </div>

      </div>

      {/* Main Graph Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Trend Area Graph */}
        <div className="lg:col-span-2 p-5 bg-[#12161f] border border-slate-800/55 rounded-[24px] shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-bold text-white tracking-wide uppercase">ความคืบหน้าและการสะสมงานรายวัน</h4>
              <p className="text-[9px] text-slate-500 mt-0.5">กราฟแสดงเปรียบเทียบจำนวนการสร้างและสะสางเสร็จภายใน 7 วัน</p>
            </div>
            
            {/* Soft graph badges */}
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> งานใหม่
              </span>
              <span className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> สำเร็จแล้ว
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/20" vertical={false} />
                <XAxis 
                  dataKey="dateLabel" 
                  stroke="#64748b" 
                  fontSize={10} 
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#0f121a', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ fontSize: '11px', color: '#cbd5e1' }}
                  labelStyle={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="งานที่สร้าง" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorCreated)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="งานที่สำเร็จ" 
                  stroke="#10b981" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Circular Project Category Breakdown Graph */}
        <div className="p-5 bg-[#12161f] border border-slate-800/55 rounded-[24px] shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-white tracking-wide uppercase">สัดส่วนตามโครงการ (โปรเจกต์)</h4>
            <p className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span>📁</span> บ่งบอกว่าคุณทุ่มเทเวลาให้กับหมวดหมู่ใดมากสุด
            </p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {projectBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f121a', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(148, 163, 184, 0.1)' 
                  }}
                  itemStyle={{ fontSize: '11px', color: '#ffffff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">ทั้งหมด</span>
              <span className="text-xl font-extrabold text-white mt-0.5 leading-none">
                {projectBreakdownData.reduce((acc, c) => acc + c.value, 0)}
              </span>
            </div>
          </div>

          {/* Color Indicators Legend layout */}
          <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
            {projectBreakdownData.map((entry) => (
              <div key={entry.name} className="flex items-center justify-between text-[10px] border-b border-slate-900/40 pb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-300 truncate font-medium">{entry.name}</span>
                </div>
                <span className="text-slate-500 font-mono font-bold shrink-0">{entry.value} งาน</span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* Sub secondary stats layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Priority breakdown Bar graph */}
        <div className="p-4 bg-[#12161f]/80 border border-slate-800/40 rounded-2xl">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">จำแนกตามความสำคัญ</h4>
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-3.5 flex-1 pl-1">
              {priorityBreakdown.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium">{item.name}</span>
                    <span className="text-slate-300 font-bold font-mono">{item.value} งาน</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all" 
                      style={{ 
                        backgroundColor: item.color,
                        width: `${todos.length > 0 ? (item.value / todos.length) * 100 : item.value * 10}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
              {priorityBreakdown.length === 0 && (
                <div className="text-[10px] text-slate-500 italic py-2">ไม่มีข้อมูลเพื่อจำแนกสถิติ</div>
              )}
            </div>

            <div className="text-center p-3 bg-slate-950/20 rounded-xl shrink-0 border border-slate-800/30">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block leading-none">อัตราความด่วน</span>
              <span className="text-lg font-extrabold text-orange-400 block mt-1 font-mono leading-none">
                {todos.length > 0 ? Math.round((todos.filter(t => t.priority === 'high').length / todos.length) * 100) : 30}%
              </span>
              <span className="text-[8px] text-slate-600 block mt-1 font-sans">เทียบกับงานทั้งหมด</span>
            </div>
          </div>
        </div>

        {/* Informative productivity advice widget */}
        <div className="md:col-span-2 p-4 bg-[#12161f]/80 border border-slate-800/40 rounded-2xl flex items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm select-none">💡</span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">คำแนะนำเพื่อพัฒนาผลิตภาพของคุณ</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              {metrics.successRate >= 80 
                ? "ประสิทธิภาพการดำเนินงานของคุณอยู่ในเกณฑ์ยอดเยี่ยม! รักษาวินัยการจัดสรรเวลารายสัปดาห์เช่นนี้ต่อไปเพื่อหลีกเลี่ยงภาวะหมดไฟในการดำเนินชีวิต"
                : metrics.successRate >= 50
                ? "คุณกำลังดำเนินงานก้าวหน้าไปได้ครึ่งทางแล้วทีเดียว แนะนำให้เลือกเคลียร์งานที่มีความสำคัญสูง (เร่งด่วน) ในช่วงครึ่งบ่ายเป็นต้นไปเพื่อรักษาโมเมนตัมที่ดี"
                : "สร้างรายการแผนงานรายวันเล็กๆ และจัดลำดับเวลาเป้าหมายล่วงหน้าในทุกเย็น เพื่อเพิ่มอัตราสำเร็จสะสมวันละนิดได้อย่างสม่ำเสมอ!"
              }
            </p>
          </div>
          <div className="w-1.5 h-14 bg-gradient-to-b from-blue-500 via-emerald-500 to-orange-400 rounded-full shrink-0" />
        </div>

      </div>

      {/* Smart Insights Summary Section */}
      <div id="smartInsightsSection" className="p-6 bg-[#111520] border border-amber-500/20 rounded-[24px] shadow-xl relative overflow-hidden">
        {/* Decorative ambient glowing backdrops matching visual guide */}
        <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none" />
        <div className="absolute bottom-[-50px] left-[-50px] w-40 h-40 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/60 relative z-10">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-blue-450 flex items-center gap-2 font-display uppercase tracking-wide">
              <span>🧠</span> Smart Insights: บทวิเคราะห์รูปแบบผลิตภาพรอบสัปดาห์
            </h4>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">สมาร์ตบอร์ดประเมินเวลาทองคำและขีดความสามารถการเสร็จสิ้นงานรายบุคคล</p>
          </div>
          <div className="shrink-0 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-mono font-bold">
            ⚡ ประมวลผลจากรายการวิเคราะห์ {smartInsights.totalAnalyzed} รายการ
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          {/* Card 1: Peak productive day */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/40">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">วันทำงานที่ทรงพลังที่สุด</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">🔥</span>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-amber-400 block font-display leading-tight">{smartInsights.peakDayBrief}</span>
                <span className="text-[9px] text-slate-550 block mt-0.5">เป็นช่วงวันที่พฤติกรรมสะสางประจักษ์ชัดเจน</span>
              </div>
            </div>
          </div>

          {/* Card 2: Peak time block */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/40">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">ช่วงเวลาทองคำที่มีประสิทธิภาพสูดสุด</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">⚡</span>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-blue-405 block font-display leading-tight">{smartInsights.peakTimeTitle}</span>
                <span className="text-[9.5px] text-slate-400 block font-mono font-bold mt-0.5">{smartInsights.peakTimeRange}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Ratings rating index */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/40">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">ความคงเส้นคงวา (Efficiency Index)</span>
            <div className="flex items-center gap-3">
              <span className="text-2xl select-none">📈</span>
              <div>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-450 block font-display leading-tight">
                  {metrics.successRate >= 70 ? 'ระดับมืออาชีพ (High Velocity)' : 'ผลลัพธ์คงที่ (Balanced Pace)'}
                </span>
                <span className="text-[9px] text-slate-550 block mt-0.5">ดัชนีเคลียร์งานรอบสัปดาห์ {metrics.successRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic description narrative box */}
        <div className="mt-5 p-4 rounded-xl bg-slate-950/30 border border-slate-850/60 relative z-10">
          <p className="text-[12px] text-slate-300 leading-relaxed font-sans">
            จากการประมวลผลการปิดภารกิจสะสมจำนวน <strong className="text-white font-mono">{smartInsights.totalAnalyzed}</strong> งาน ระบบสังเกตเห็นว่าพฤติกรรมของคุณมีความกระตือรือร้นและจดจ่อสูงสุดอย่างเด่นชัดใน <strong className="text-amber-400">{smartInsights.peakDay}</strong> และสามารถรักษาขีดความเร่งสูงสุดในการเคลียร์เป้าหมายต่างๆ ในช่วง <strong className="text-blue-400">{smartInsights.peakTimeTitle} ({smartInsights.peakTimeRange})</strong>
          </p>
          <div className="mt-3 pt-2.5 border-t border-slate-800/50 text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
            <span className="text-amber-400 font-bold shrink-0">🎯 สรุปคำแนะนำ:</span>
            <span>{smartInsights.advice} แนะนำให้จัดส่งภารกิจเร่งด่วนลงปฏิทินให้อยู่ในช่วงเวลานี้เพื่อเพิ่มแรงทวีสูงสุด</span>
          </div>
        </div>
      </div>

    </div>
  );
}
