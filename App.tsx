import React, { useState, useEffect, useMemo } from 'react';
import { Task } from './types';
import TaskItem from './components/TaskItem';
import Login from './components/Login';
import HRDashboard from './components/HRDashboard';
import { Plus, Zap, ChevronRight, ChevronLeft, Calendar, LogOut, Loader2 } from 'lucide-react';
import { authService, UserProfile } from './services/authService';
import { taskService } from './services/taskService';
import { supabase } from './services/supabaseClient';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';

import { scheduleService } from './services/scheduleService';
import { ScheduleMark } from './types';
import { X, Image as ImageIcon, GraduationCap, Check } from 'lucide-react';


const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingObj, setLoadingObj] = useState(true);

  // Task App State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Schedule State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleUrl, setScheduleUrl] = useState<string | null>(null);
  const [isCollegeDay, setIsCollegeDay] = useState(false);
  const [markingSchedule, setMarkingSchedule] = useState(false);

  // Initialize Session
  useEffect(() => {
    supabase.auth.getSession().then((response: any) => {
      const session = response.data.session;
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoadingObj(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setLoadingObj(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const profile = await authService.getUserProfile(userId);
    setUserProfile(profile);
    setLoadingObj(false);
  };

  // Fetch Tasks and Schedule Mark
  useEffect(() => {
    if (session && userProfile?.role !== 'hr') {
      loadTasks();
      checkScheduleMark();
    }
  }, [selectedDate, session, userProfile]);

  // Load Schedule Image URL once
  useEffect(() => {
    if (session) {
      loadScheduleUrl();
    }
  }, [session]);

  const loadScheduleUrl = async () => {
    try {
      const url = await scheduleService.getScheduleUrl();
      setScheduleUrl(url); // Set even if null
    } catch (e) {
      console.error('Failed to load schedule URL', e);
    }
  };

  const loadTasks = async () => {
    setTasksLoading(true);
    try {
      const fetched = await taskService.fetchTasks(selectedDate);
      setTasks(fetched);
    } catch (e) {
      console.error(e);
    } finally {
      setTasksLoading(false);
    }
  };

  const checkScheduleMark = async () => {
    try {
      const mark = await scheduleService.getMyMark(selectedDate);
      setIsCollegeDay(!!mark); // If data exists, true
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCollegeMark = async () => {
    setMarkingSchedule(true);
    try {
      await scheduleService.toggleMark(selectedDate, 'college');
      setIsCollegeDay(!isCollegeDay);
    } catch (e) {
      console.error(e);
    } finally {
      setMarkingSchedule(false);
    }
  };

  // Timer Logic: Runs every second locally for UI updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(currentTasks =>
        currentTasks.map(task => {
          if (task.isTimerRunning) {
            // If we have a start time, calculate elapsed
            // For now, simple increment, but ideally we sync with server start time
            return { ...task, durationSeconds: task.durationSeconds + 1 };
          }
          return task;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Sync running timers to DB every 10 seconds (more frequent)
  useEffect(() => {
    const interval = setInterval(() => {
      tasks.forEach(t => {
        if (t.isTimerRunning) {
          taskService.updateTask(t.id, { durationSeconds: t.durationSeconds });
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [tasks]);


  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Optimistic Update
    const tempId = crypto.randomUUID();
    const newTaskOpt: Task = {
      id: tempId,
      content: inputValue,
      isCompleted: false,
      durationSeconds: 0,
      isTimerRunning: false,
      date: selectedDate,
    };

    setTasks([newTaskOpt, ...tasks]);
    setInputValue('');

    try {
      const created = await taskService.createTask({
        content: inputValue,
        date: selectedDate
      });
      // Replace temp task with real one
      setTasks(prev => prev.map(t => t.id === tempId ? created : t));
    } catch (e) {
      console.error(e);
      // Rollback?
    }
  };

  const toggleTimer = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newIsRunning = !task.isTimerRunning;
    const now = new Date().toISOString();

    // UI Update immediately
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, isTimerRunning: newIsRunning };
      }
      return t;
    }));

    // DB Update
    try {
      // If starting, we might want to record start time (simplified here)
      await taskService.updateTask(id, {
        isTimerRunning: newIsRunning,
        durationSeconds: task.durationSeconds
      });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleComplete = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newVal = !task.isCompleted;

    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, isCompleted: newVal, isTimerRunning: false } : t
    ));

    try {
      await taskService.updateTask(id, {
        isCompleted: newVal,
        isTimerRunning: false,
        durationSeconds: task.durationSeconds
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteTask = async (id: string) => {
    if (confirm('مسح المهمة؟')) {
      const oldTasks = [...tasks];
      setTasks(prev => prev.filter(t => t.id !== id));
      try {
        await taskService.deleteTask(id);
      } catch (e) {
        console.error(e);
        setTasks(oldTasks); // Rollback
      }
    }
  };

  // Date Navigation Helpers
  const changeDate = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    if (dateStr === today) return 'اليوم';
    if (dateStr === yesterday) return 'أمس';
    if (dateStr === tomorrow) return 'غداً';

    return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'short' }).format(date);
  };

  const totalSeconds = tasks.reduce((acc, t) => acc + t.durationSeconds, 0);
  const formatTotal = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const handleLogout = async () => {
    await authService.signOut();
    setSession(null);
    setUserProfile(null);
  };

  if (loadingObj) {
    return (
      <div className="min-h-screen bg-[#fff7ed] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => { }} />;
  }

  if (userProfile?.role === 'hr') {
    return <HRDashboard onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-[#fff7ed] text-gray-800 font-sans pb-10">

      {/* Simple Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-orange-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 rounded-xl shadow-lg shadow-orange-200">
              <Zap className="w-6 h-6 text-white" fill="currentColor" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dmdm</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsScheduleOpen(true)}
              className="text-orange-500 hover:bg-orange-50 p-2 rounded-xl transition-colors"
              title="عرض الجدول"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <div className="text-sm font-bold bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full border border-orange-200">
              {formatTotal(totalSeconds)}
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* Date Navigation */}
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl shadow-sm border border-orange-100 mb-6">
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-orange-50 rounded-xl text-orange-500 transition-colors">
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2 cursor-pointer" onClick={goToToday}>
            <Calendar className="w-5 h-5 text-orange-400" />
            <span className="text-lg font-bold text-gray-800 select-none">
              {formatDateDisplay(selectedDate)}
            </span>
            <span className="text-xs text-gray-400 font-mono mt-1">({selectedDate})</span>
          </div>

          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-orange-50 rounded-xl text-orange-500 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        {/* College Mark Checkbox */}
        <div className="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center justify-between cursor-pointer hover:bg-orange-50 transition-colors" onClick={toggleCollegeMark}>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isCollegeDay ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
              {isCollegeDay && <Check className="w-4 h-4 text-white" />}
            </div>
            <div className="flex flex-col">
              <span className={`font-bold text-lg ${isCollegeDay ? 'text-blue-900' : 'text-gray-700'}`}>
                عندي كلية في اليوم ده
              </span>
              <span className="text-xs text-gray-500">
                علم هنا لو انت هتروح الكلية في تاريخ {selectedDate}
              </span>
            </div>
          </div>
          <GraduationCap className={`w-8 h-8 ${isCollegeDay ? 'text-blue-600' : 'text-gray-300'}`} />
        </div>

        {/* Input Area */}
        <form onSubmit={addTask} className="mb-8 relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`إضافة مهمة لـ ${formatDateDisplay(selectedDate)}...`}
            className="w-full p-5 pl-14 bg-white border border-orange-200 rounded-2xl shadow-sm focus:shadow-orange-200 focus:ring-4 focus:ring-orange-100 focus:border-orange-400 outline-none text-lg transition-all placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="absolute left-3 top-3 bottom-3 aspect-square bg-orange-500 hover:bg-orange-600 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-orange-500 hover:scale-105 active:scale-95"
          >
            <Plus className="w-6 h-6" />
          </button>
        </form>

        {/* Task List */}
        <div className="space-y-3">
          {tasksLoading && tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-400">تحميل المهام...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-100 opacity-70">
                <Calendar className="w-8 h-8 text-orange-300" />
              </div>
              <p className="text-gray-500 font-medium">مفيش مهام في اليوم ده.</p>
              {selectedDate !== new Date().toISOString().split('T')[0] && (
                <button onClick={goToToday} className="mt-2 text-orange-500 text-sm font-bold hover:underline">
                  الرجوع لليوم
                </button>
              )}
            </div>
          ) : (
            tasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleTimer={toggleTimer}
                onToggleComplete={toggleComplete}
                onDelete={deleteTask}
              />
            ))
          )}
        </div>
      </main>

      {/* Schedule Modal */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsScheduleOpen(false)}>
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto p-4 relative shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setIsScheduleOpen(false)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              جدول المحاضرات
            </h2>
            <div className="bg-gray-50 rounded-xl border border-gray-200 min-h-[300px] flex items-center justify-center">
              {scheduleUrl ? (
                <img src={scheduleUrl} alt="College Schedule" className="max-w-full h-auto rounded-lg shadow-sm" />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-50" />
                  <p>لم يتم رفع الجدول بعد</p>
                </div>
              )}
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setIsScheduleOpen(false);
                  toggleCollegeMark();
                }}
                className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${isCollegeDay ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isCollegeDay ? 'إلغاء تحديد اليوم كـ يوم كلية' : 'تحديد هذا اليوم كـ يوم كلية'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;