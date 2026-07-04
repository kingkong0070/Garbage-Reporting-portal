import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, User, Mail, ArrowRight, Lock, Key, Copy, Check, ShieldAlert, Shield } from 'lucide-react';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const copyToClipboard = (text: string, type: 'email' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const handleAutofillAdmin = () => {
    setEmail('admin@example.com');
    setPassword('Admin@123');
    setErrorMessage(null);
  };

  const handleAutofillWorker = () => {
    setEmail('dave.miller@portal.gov');
    setPassword('Secret@123');
    setErrorMessage(null);
  };

  const handleAutofillCitizen = () => {
    setEmail('citizen@example.com');
    setPassword('Citizen123');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!email || !password) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Invalid credentials or inactive account.');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        onLogin({
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          workerId: data.user.workerId
        });
      } else {
        onLogin({
          name: data.name || 'User',
          email: data.email || email,
          role: data.role || 'citizen',
          workerId: data.workerId
        });
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network connection failure. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center bg-brand-slate-bg p-6 gap-8">
      {/* Login Box */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-brand-slate-border"
      >
        <div className="p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-brand-slate-dark rounded-2xl flex items-center justify-center text-white mb-3 shadow-xl shadow-slate-200">
              <Trash2 className="w-7 h-7 text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Welcome Back</h1>
            <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Garbage Overflow Portal</p>
          </div>

          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 mb-4 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email / Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-brand-emerald transition-colors">
                  <Mail className="h-4 w-4 text-slate-300" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com or davem101"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-brand-slate-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-emerald focus:bg-white transition-all text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-brand-emerald transition-colors">
                  <Lock className="h-4 w-4 text-slate-300" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 border border-brand-slate-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-emerald focus:bg-white transition-all text-slate-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 bg-brand-slate-dark hover:bg-slate-800 text-white rounded-xl font-bold text-xs shadow-md transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Verify & Enter Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            Public Service Grievance Systems • PRJ-120
          </p>
        </div>
      </motion.div>

      {/* Demo Credentials Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-md bg-white rounded-3xl border border-brand-slate-border p-6 shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full blur-2xl -mr-8 -mt-8" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800">Demo Login Credentials</h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Select one of the simulated accounts below to log in immediately.
            </p>
            
            {/* Admin Credentials details */}
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-200/50 mb-1">
                <span>Supervisor / Admin Account</span>
                <span className="text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded font-black text-[9px]">Role: Admin</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Email:</span>
                <span className="font-mono font-bold text-slate-700">admin@example.com</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Password:</span>
                <span className="font-mono font-bold text-slate-700">Admin@123</span>
              </div>
              <button
                type="button"
                onClick={handleAutofillAdmin}
                className="w-full py-1.5 bg-amber-100/50 hover:bg-amber-100 text-amber-800 font-bold text-[10px] rounded-lg transition-colors mt-2"
              >
                Autofill Admin
              </button>
            </div>

            {/* Worker Credentials details */}
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-200/50 mb-1">
                <span>Field Officer Account</span>
                <span className="text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded font-black text-[9px]">Role: Worker</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Username/Email:</span>
                <span className="font-mono font-bold text-slate-700">dave.miller@portal.gov</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Password:</span>
                <span className="font-mono font-bold text-slate-700">Secret@123</span>
              </div>
              <button
                type="button"
                onClick={handleAutofillWorker}
                className="w-full py-1.5 bg-emerald-100/50 hover:bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-lg transition-colors mt-2"
              >
                Autofill Field Officer
              </button>
            </div>

            {/* Citizen Credentials details */}
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-1.5 border-b border-slate-200/50 mb-1">
                <span>Citizen Account</span>
                <span className="text-blue-600 px-1.5 py-0.5 bg-blue-50 rounded font-black text-[9px]">Role: Citizen</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Any other input:</span>
                <span className="font-mono font-bold text-slate-700">e.g. citizen@example.com</span>
              </div>
              <button
                type="button"
                onClick={handleAutofillCitizen}
                className="w-full py-1.5 bg-blue-100/50 hover:bg-blue-100 text-blue-800 font-bold text-[10px] rounded-lg transition-colors mt-2"
              >
                Autofill Citizen
              </button>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
