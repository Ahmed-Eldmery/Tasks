import React, { useState, useEffect } from 'react';
import { taskService } from '../services/taskService';
import { Task } from '../types';
import { scheduleService } from '../services/scheduleService';
import { ScheduleMark } from '../types';
import { Calendar, User, Clock, ChevronRight, ChevronLeft, LogOut, GraduationCap, Settings, Save, X } from 'lucide-react';

interface HRDashboardProps {
    onLogout: () => void;
}

const HRDashboard: React.FC<HRDashboardProps> = ({ onLogout }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    // Schedule State
    const [collegeMarks, setCollegeMarks] = useState<any[]>([]);
    const [scheduleUrl, setScheduleUrl] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [savingUrl, setSavingUrl] = useState(false);

    useEffect(() => {
        loadTasks();
        loadMarks();
    }, [selectedDate]);

    useEffect(() => {
        loadScheduleSettings();
    }, []);

    const loadScheduleSettings = async () => {
        const url = await scheduleService.getScheduleUrl();
        if (url) setScheduleUrl(url);
    };

    const loadMarks = async () => {
        try {
            const marks = await scheduleService.getMarks(selectedDate);
            setCollegeMarks(marks);
        } catch (e) {
            console.error(e);
        }
    };

    const loadTasks = async () => {
        setLoading(true);
        try {
            const data = await taskService.fetchAllTasksForHR(selectedDate);
            setTasks(data);
        } catch (error) {
            console.error("Error loading HR tasks", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveScheduleUrl = async () => {
        setSavingUrl(true);
        try {
            await scheduleService.setScheduleUrl(scheduleUrl);
            setIsSettingsOpen(false);
            alert('تم حفظ رابط الجدول بنجاح');
        } catch (e) {
            console.error(e);
            alert('فشل الحفظ');
        } finally {
            setSavingUrl(false);
        }
    };

    const changeDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    // Group tasks by User
    const tasksByUser = tasks.reduce((acc, task) => {
        const key = task.userEmail || 'Unknown User';
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
    }, {} as Record<string, Task[]>);

    const formatTotal = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <div className="min-h-screen bg-[#fff7ed] text-gray-800 font-sans pb-10">
            <header className="bg-white border-b border-orange-100 sticky top-0 z-10 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <span className="bg-orange-500 text-white px-2 py-1 rounded-lg text-sm">HR</span>
                        لوحة المتابعة
                    </h1>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors"
                        >
                            <Settings className="w-5 h-5" />
                            <span className="hidden sm:inline text-sm font-medium">إعدادات الجدول</span>
                        </button>
                        <button onClick={onLogout} className="text-gray-500 hover:text-red-500">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Date Nav */}
                <div className="flex items-center justify-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-orange-100 mb-8">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-orange-50 rounded-xl text-orange-500">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-400" />
                        <span className="font-bold text-lg">{selectedDate}</span>
                    </div>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-orange-50 rounded-xl text-orange-500">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                </div>

                {/* College Attendance Section */}
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl mb-8">
                    <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                        <GraduationCap className="w-6 h-6 text-blue-600" />
                        زملاء في الكلية اليوم
                    </h3>
                    {collegeMarks.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {collegeMarks.map((m, idx) => (
                                <div key={idx} className="bg-white text-blue-700 px-4 py-2 rounded-xl text-sm font-bold border border-blue-200 shadow-sm flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    {m.userName || m.userEmail || 'User'}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-blue-400 text-sm">لا يوجد أحد في الكلية اليوم.</p>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-10 text-gray-500">جاري التحميل...</div>
                ) : Object.keys(tasksByUser).length === 0 ? (
                    <div className="text-center py-10 text-gray-500">مفيش مهام في اليوم ده</div>
                ) : (
                    <div className="grid gap-6">
                        {Object.entries(tasksByUser).map(([email, userTasks]) => {
                            const totalSeconds = userTasks.reduce((acc, t) => acc + t.durationSeconds, 0);
                            return (
                                <div key={email} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                                    <div className="bg-orange-50/50 p-4 border-b border-orange-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                                <User className="w-5 h-5 text-orange-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{email}</h3>
                                                <p className="text-xs text-gray-500">{userTasks.length} مهام</p>
                                            </div>
                                        </div>
                                        <div className="bg-white px-3 py-1 rounded-lg border border-orange-100 shadow-sm flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-orange-500" />
                                            <span className="font-bold text-orange-700">{formatTotal(totalSeconds)}</span>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {userTasks.map(task => (
                                            <div key={task.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${task.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                    <span className={`${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                        {task.content}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                                    {formatTotal(task.durationSeconds)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative">
                        <button
                            onClick={() => setIsSettingsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold mb-4">إعدادات الجدول</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                رابط صورة الجدول
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                1. ارفع الصورة على موقع <a href="https://imgbb.com/" target="_blank" className="text-blue-500 underline">ImgBB</a><br />
                                2. انسخ "الرابط المباشر" (Direct Link) وضعه هنا.<br />
                                (يجب أن ينتهي الرابط بـ .jpg أو .png)
                            </p>
                            <input
                                type="url"
                                value={scheduleUrl}
                                onChange={(e) => setScheduleUrl(e.target.value)}
                                placeholder="https://example.com/schedule.jpg"
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <button
                            onClick={handleSaveScheduleUrl}
                            disabled={savingUrl}
                            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                        >
                            {savingUrl ? 'جاري الحفظ...' :
                                <>
                                    <Save className="w-5 h-5" />
                                    حفظ التغييرات
                                </>
                            }
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRDashboard;
