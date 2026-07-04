import React, { useState, useEffect } from "react";
import { 
  ClipboardList, Clock, AlertTriangle, CheckCircle2, 
  Bell, Check, MapPin, Mail, Phone, Calendar, User, ShieldAlert 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Worker, AssignedTask, WorkerNotification } from "../types";

interface WorkerDashboardProps {
  worker: Worker;
  tasks: AssignedTask[];
  onNotify: (text: string) => void;
  onRefreshTasks: () => void;
}

export default function WorkerDashboard({ worker, tasks, onNotify, onRefreshTasks }: WorkerDashboardProps) {
  const [notifications, setNotifications] = useState<WorkerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [worker]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?userId=${worker.username}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        onNotify("Notification marked read.");
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: worker.username })
      });
      if (res.ok) {
        onNotify("All notifications cleared!");
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const totalAssigned = tasks.length;
  const pending = tasks.filter(t => t.status === "Assigned" || t.status === "Pending").length;
  const inProgress = tasks.filter(t => t.status === "In Progress").length;
  const completed = tasks.filter(t => t.status === "Completed").length;
  const rejected = tasks.filter(t => t.status === "Rejected").length;

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <div className="space-y-6" id="worker_dashboard_view">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white border border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold border border-emerald-500/20 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Field Officer Duty Mode
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome Back, {worker.fullName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            You are currently assigned to <strong className="text-emerald-400 font-bold">{worker.areaZone}</strong> for the <strong>{worker.department}</strong>. Below are your daily metrics and assignments.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/60">
          <img 
            src={worker.profilePhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"} 
            alt={worker.fullName} 
            className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400 shrink-0 shadow-lg"
            referrerPolicy="no-referrer"
          />
          <div>
            <p className="text-xs font-bold text-white uppercase tracking-wider">Badge ID</p>
            <p className="font-mono text-emerald-400 font-extrabold text-sm">{worker.employeeId}</p>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assignments", value: totalAssigned, color: "text-slate-900", icon: ClipboardList, bg: "bg-slate-100" },
          { label: "Pending Briefs", value: pending, color: "text-amber-600", icon: Clock, bg: "bg-amber-50" },
          { label: "In Active Progress", value: inProgress, color: "text-blue-600", icon: AlertTriangle, bg: "bg-blue-50 animate-pulse" },
          { label: "Cleans Completed", value: completed, color: "text-emerald-600", icon: CheckCircle2, bg: "bg-emerald-50" }
        ].map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-4 md:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4`}
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-2xl md:text-3xl font-extrabold tracking-tight ${item.color}`}>{item.value}</p>
            </div>
            <div className={`p-3 rounded-xl shrink-0 ${item.bg}`}>
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Notifications & Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Notifications Column */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-brand-slate-border p-6 shadow-xs flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-500" />
              Direct Dispatches & Notifications
              {unreadNotifications.length > 0 && (
                <span className="bg-red-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full animate-bounce">
                  {unreadNotifications.length} New
                </span>
              )}
            </h3>
            {unreadNotifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 flex-1">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                You have no active notifications at this time.
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  className={`p-3.5 rounded-2xl border text-xs flex justify-between gap-4 transition-colors ${
                    n.read 
                      ? "bg-slate-50/50 border-slate-100 text-slate-500" 
                      : "bg-emerald-50/20 border-emerald-100/70 text-slate-800 font-medium shadow-xs"
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800 flex items-center gap-1">
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                      {n.title}
                    </p>
                    <p className="text-slate-600 leading-normal">{n.message}</p>
                    <span className="text-[9px] text-slate-400 font-mono block">
                      {new Date(n.createdAt).toLocaleTimeString()} - {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {!n.read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="p-1 h-fit text-emerald-600 hover:bg-emerald-100/70 rounded-full shrink-0"
                      title="Mark Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Profile Card Column */}
        <div className="bg-white rounded-3xl border border-brand-slate-border p-6 shadow-xs flex flex-col space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-500" />
              Duty Registry Profile
            </h3>
          </div>

          <div className="space-y-4 text-xs text-slate-600">
            <div className="flex justify-center py-2 shrink-0">
              <img 
                src={worker.profilePhoto} 
                alt={worker.fullName} 
                className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                <MapPin className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Patrol Sector Duty</p>
                  <p className="font-bold text-slate-700">{worker.areaZone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                <Mail className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Corporate Email</p>
                  <p className="font-semibold text-slate-700">{worker.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                <Phone className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Mobile Number</p>
                  <p className="font-semibold text-slate-700">{worker.mobileNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-xl">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-[9px] uppercase font-bold text-slate-400">Date of Joining</p>
                  <p className="font-semibold text-slate-700">{worker.dateOfJoining}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
