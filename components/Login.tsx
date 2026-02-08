import React, { useState } from 'react';
import { authService } from '../services/authService';
import { Zap, Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState<'member' | 'hr'>('member');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (isSignUp) {
                // Sign up
                await authService.runSignUp(email, password, role);

                // Try to login immediately (Assuming auto-confirm is active via SQL Trigger)
                try {
                    await authService.runLogin(email, password);
                    onLoginSuccess();
                } catch (loginErr: any) {
                    // If login fails (maybe trigger didn't run fast enough?), warn user
                    if (loginErr.message?.includes('Email not confirmed')) {
                        alert('تم إنشاء الحساب! إذا لم يتم تسجيل الدخول تلقائياً، يرجى التحقق من تفعيل الحساب.');
                    } else {
                        throw loginErr;
                    }
                }
            } else {
                await authService.runLogin(email, password);
                onLoginSuccess();
            }
        } catch (err: any) {
            console.error(err);
            let msg = err.message || 'حدث خطأ ما';

            // Translate common errors
            if (msg.includes('Invalid login credentials')) msg = 'خطأ في الايميل أو كلمة المرور';
            if (msg.includes('Email not confirmed')) msg = 'لم يتم تفعيل الحساب بعد.';
            if (msg.includes('User already registered')) msg = 'هذا البريد الإلكتروني مسجل بالفعل';
            if (msg.includes('Password should be at least')) msg = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fff7ed] flex items-center justify-center p-4 font-sans">
            <div className="bg-white max-w-md w-full rounded-3xl shadow-xl border border-orange-100 p-8">

                <div className="flex flex-col items-center mb-8">
                    <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-200 rotate-3 mb-4">
                        <Zap className="w-8 h-8 text-white" fill="currentColor" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Dmdm - إدارة المهام للفريق
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                        <div className="relative">
                            <Mail className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none transition-all"
                                placeholder="example@company.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pr-10 pl-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-500 outline-none transition-all"
                                placeholder="********"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute left-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    {isSignUp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">نوع الحساب</label>
                            <div className="grid grid-cols-2 gap-3">
                                <label className={`cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${role === 'member' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="member"
                                        checked={role === 'member'}
                                        onChange={() => setRole('member')}
                                        className="hidden"
                                    />
                                    <span className="font-bold">عضو فريق</span>
                                </label>
                                <label className={`cursor-pointer border rounded-xl p-3 flex items-center justify-center gap-2 transition-all ${role === 'hr' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="hr"
                                        checked={role === 'hr'}
                                        onChange={() => setRole('hr')}
                                        className="hidden"
                                    />
                                    <span className="font-bold">HR / مدير</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {isSignUp ? 'إنشاء حساب' : 'دخول'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setError(null);
                        }}
                        className="text-sm text-orange-600 font-medium hover:underline"
                    >
                        {isSignUp ? 'لديك حساب بالفعل؟ تسجيل دخول' : 'ليس لديك حساب؟ إنشاء حساب جديد'}
                    </button>
                </div>

            </div >
        </div >
    );
}

export default Login;
