import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Map as MapIcon, 
  BarChart3, 
  Users, 
  Plus, 
  Search, 
  Bell,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  MapPin,
  Trash2,
  LogOut,
  Sparkles,
  UploadCloud,
  FileText,
  User,
  Shield,
  Send,
  Calendar,
  Check,
  ChevronRight,
  Filter,
  XCircle,
  TrendingUp,
  Download,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GrievanceReport, Stats, Severity, Status, User as UserType } from './types';
import { SEVERITIES, STATUS_COLORS, ZONES, DEPARTMENTS } from './constants';
import { categorizeGrievance } from './services/geminiService';
import Login from './components/Login';
import WorkerManagement from './components/WorkerManagement';
import WorkAssignment from './components/WorkAssignment';
import WorkerDashboard from './components/WorkerDashboard';
import WorkerTasks from './components/WorkerTasks';
import AdminTracking from './components/AdminTracking';

// Realistic sample images for proof upload selection
const SAMPLE_GARBAGE_IMAGES = [
  {
    id: "img1",
    name: "Plastic Overspill",
    url: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "img2",
    name: "Domestic Overflow",
    url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "img3",
    name: "Street Scatter litter",
    url: "https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?auto=format&fit=crop&w=600&q=80"
  },
  {
    id: "img4",
    name: "Organic cardboard",
    url: "https://images.unsplash.com/photo-1516996087931-5ae40155304e?auto=format&fit=crop&w=600&q=80"
  }
];

export default function App() {
  const [user, setUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dbLoadErrors, setDbLoadErrors] = useState<Record<string, string>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reports, setReports] = useState<GrievanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active role state so they can easily experience the complete flow!
  const [userRole, setUserRole] = useState<'citizen' | 'admin' | 'worker'>('citizen');
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);

  // Selected report for detail slide-over modal
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Active filters
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Submit report form states
  const [formLocation, setFormLocation] = useState(ZONES[0]);
  const [formDept, setFormDept] = useState(DEPARTMENTS[0]);
  const [formSeverity, setFormSeverity] = useState<Severity>('moderate');
  const [formDescription, setFormDescription] = useState('');
  const [formProofUrl, setFormProofUrl] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // Active comments log for selected report detail
  const [newCommentText, setNewCommentText] = useState('');

  // Notifications simulation
  const [notifications, setNotifications] = useState([
    { id: 1, text: "AI classified REP-001 automatically successfully.", read: false, time: "14m ago" },
    { id: 2, text: "Admin assigned Sanitation crew to Park Street Crossing.", read: true, time: "1h ago" }
  ]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const fetchWorkerTasks = async () => {
    if (!user) return;
    try {
      const url = user.role === 'worker' 
        ? `/api/tasks?workerId=${user.workerId}` 
        : '/api/tasks';
      const res = await fetch(url);
      if (res.ok) {
        setAssignedTasks(await res.json());
      }
    } catch (err) {
      console.error("Failed to load worker dispatches:", err);
    }
  };

  // Startup database loading verification test
  useEffect(() => {
    const testJSONFiles = async () => {
      const filesToTest = [
        "/db_workers.json",
        "/db_grievances.json",
        "/db_assigned_tasks.json",
        "/db_notifications.json",
        "/db_task_history.json",
        "/metadata.json"
      ];
      
      for (const file of filesToTest) {
        try {
          const res = await fetch(file);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText}`);
          }
          const data = await res.json();
          console.log(`[Startup Verification] Successfully loaded ${file}:`, data);
        } catch (err: any) {
          console.error(`[Startup Verification] Failed to load ${file}:`, err);
          setDbLoadErrors(prev => ({
            ...prev,
            [file]: err.message || "Failed to load file"
          }));
        }
      }
    };
    testJSONFiles();
  }, []);

  // Fetch initial reports from Express backend on startup
  useEffect(() => {
    if (user) {
      fetchReports();
      fetchWorkerTasks();
      if (user.role) {
        setUserRole(user.role);
        if (user.role === 'worker') {
          setActiveTab('worker-dashboard');
        } else {
          setActiveTab('dashboard');
        }
      } else if (user.email === 'admin@example.com') {
        setUserRole('admin');
        setActiveTab('dashboard');
      } else {
        setUserRole('citizen');
        setActiveTab('dashboard');
      }
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/reports");
      if (response.ok) {
        const data = await response.json();
        setReports(data);
      } else {
        console.error("Failed to load reports from full-stack API.");
      }
    } catch (err) {
      console.error("Error drawing report lists from server:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle citizen form submission
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formDescription.trim()) return;

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: formLocation,
          department: formDept,
          description: formDescription,
          severity: formSeverity,
          citizenName: user.name,
          citizenEmail: user.email,
          proofUrl: formProofUrl || SAMPLE_GARBAGE_IMAGES[0].url
        })
      });

      if (response.ok) {
        // Refresh grievance state list
        await fetchReports();
        // Reset states
        setFormDescription('');
        setFormProofUrl('');
        setAiAnalysisResult(null);
        setIsModalOpen(false);
        // Add fresh feedback toast simulation
        const toastId = Date.now();
        setNotifications(prev => [
          { id: toastId, text: `Successfully reported complaint to ${formDept}!`, read: false, time: "Just now" },
          ...prev
        ]);
      }
    } catch (err) {
      console.error("Network crash submitting report:", err);
    }
  };

  // Trigger server-side Gemini Smart classification helper!
  const handleAiAutoFill = async () => {
    if (!formDescription.trim()) {
      alert("Please write a small description of the overflow first so Gemini has text details to analyze!");
      return;
    }

    try {
      setIsAiLoading(true);
      setAiAnalysisResult(null);
      const result = await categorizeGrievance(formDescription);
      
      setFormSeverity(result.severity);
      setFormDept(result.department);
      if (ZONES.includes(result.suggestedLocation)) {
        setFormLocation(result.suggestedLocation);
      }
      setAiAnalysisResult(`✨ Gemini Smart Engine Auto-Matched Category: ${result.department} • Severity: ${result.severity.toUpperCase()} • Recommended Zone: ${result.suggestedLocation}`);
    } catch (err) {
      console.error("AI Assistant process crashed:", err);
      // Fallback
      setAiAnalysisResult("⚠️ Local heuristic applied. Make sure the backend serves the Gemini API key correctly.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle Admin workflow status shift
  const handleUpdateStatus = async (reportId: string, newStatus: Status) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setReports(prev => prev.map(report => {
          if (report.id === reportId) {
            return { ...report, status: newStatus, updatedAt: Date.now() };
          }
          return report;
        }));
      }
    } catch (err) {
      console.error("Error reporting status update:", err);
    }
  };

  // Add Official Response Comment
  const handleAddComment = async (e: React.FormEvent, reportId: string) => {
    e.preventDefault();
    if (!user) return;
    if (!newCommentText.trim()) return;

    try {
      const logText = `[${userRole.toUpperCase()}] ${user.name}: ${newCommentText}`;
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: logText })
      });

      if (response.ok) {
        setReports(prev => prev.map(report => {
          if (report.id === reportId) {
            const upComments = report.comments ? [...report.comments, logText] : [logText];
            return { ...report, comments: upComments, updatedAt: Date.now() };
          }
          return report;
        }));
        setNewCommentText('');
      }
    } catch (err) {
      console.error("Error writing message comment logs:", err);
    }
  };

  // Admin delete report capability
  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this report? This action is irreversible.")) {
      return;
    }

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        setReports(prev => prev.filter(r => r.id !== reportId));
        setSelectedReportId(null);
      }
    } catch (err) {
      console.error("Error deleting report:", err);
    }
  };

  // Derived filter matching with useMemo for high performance optimization
  const matchingReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSeverity = filterSeverity === 'all' || r.severity === filterSeverity;
      const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchesDept = filterDept === 'all' || r.department.toLowerCase().includes(filterDept.toLowerCase());
      const matchesSearch = searchQuery === '' || 
        r.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeverity && matchesStatus && matchesDept && matchesSearch;
    });
  }, [reports, filterSeverity, filterStatus, filterDept, searchQuery]);

  const selectedReport = useMemo(() => {
    return reports.find(r => r.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  // Deriving real live metrics metrics with useMemo for performance optimization
  const totalGrievances = reports.length;
  
  const pendingAction = useMemo(() => {
    return reports.filter(r => r.status !== 'resolved' && r.status !== 'verified').length;
  }, [reports]);

  const criticalGrievances = useMemo(() => {
    return reports.filter(r => r.severity === 'critical' && r.status !== 'resolved').length;
  }, [reports]);
  
  // Custom SVG simple line path generator for beautiful analytical charts
  const renderSVGLineChart = () => {
    const pointsArray = reports.map((_, idx) => {
      const x = (idx / Math.max(1, reports.length - 1)) * 350 + 25;
      const y = 135 - ((4 - (idx % 3)) * 22);
      return { x, y };
    });
    
    const pointsString = pointsArray.map(p => `${p.x},${p.y}`).join(' ');
    const lastPoint = pointsArray[pointsArray.length - 1] || { x: 375, y: 80 };

    return (
      <svg viewBox="0 0 400 160" width="100%" height="100%" className="mt-4 overflow-visible">
        <defs>
          <linearGradient id="gradientLine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Helper grid lines */}
        <line x1="10" y1="20" x2="390" y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="10" y1="60" x2="390" y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="10" y1="100" x2="390" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
        <line x1="10" y1="140" x2="390" y2="140" stroke="#e2e8f0" strokeWidth="1.5" />
        {/* Trend area */}
        {pointsString && (
          <>
            <path 
              d={`M 25,140 L ${pointsString} L ${lastPoint.x},140 Z`} 
              fill="url(#gradientLine)" 
            />
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={pointsString}
            />
            {/* Pulsing end point */}
            <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#10b981" />
            <circle cx={lastPoint.x} cy={lastPoint.y} r="9" fill="#10b981" fillOpacity="0.3" className="animate-ping" />
          </>
        )}
      </svg>
    );
  };

  // Custom visual pie chart slices
  const renderSVGPieChart = () => {
    const deptCounts: Record<string, number> = {};
    reports.forEach(r => {
      const dept = r.department.split(' ')[0] || r.department;
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });

    const entries = Object.entries(deptCounts);
    const total = reports.length || 1;
    let accumulatedAngle = 0;

    return (
      <div className="flex flex-col md:flex-row items-center gap-8 mt-6">
        <svg className="w-40 h-40 transform -rotate-90 overflow-visible">
          {entries.map(([dept, count], idx) => {
            const percentage = count / total;
            const angle = percentage * 360;
            const strokeDashOffset = 502 - (percentage * 502);
            const rotation = accumulatedAngle;
            accumulatedAngle += angle;

            const colors = ['#10b981', '#3b82f6', '#f59e0b', '#64748b', '#ec4899'];
            const color = colors[idx % colors.length];

            return (
              <circle
                key={dept}
                cx="80"
                cy="80"
                r="40"
                fill="transparent"
                stroke={color}
                strokeWidth="18"
                strokeDasharray="251"
                strokeDashoffset={251 - (percentage * 251)}
                transform={`rotate(${rotation} 80 80)`}
                className="transition-all duration-500 hover:scale-105 origin-center cursor-pointer"
                title={`${dept}: ${count} (${Math.round(percentage * 100)}%)`}
              />
            );
          })}
          <circle cx="80" cy="80" r="28" fill="white" />
        </svg>
        <div className="flex-1 space-y-2">
          {entries.map(([dept, count], idx) => {
            const colors = ['#10b981', '#3b82f6', '#f59e0b', '#64748b', '#ec4899'];
            const color = colors[idx % colors.length];
            return (
              <div key={dept} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-slate-600">{dept}</span>
                </div>
                <span className="text-slate-900">{count} reports ({Math.round((count / total) * 100)}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render complete selected report details view card dynamically
  const renderReportDetails = (report: GrievanceReport) => {
    return (
      <div className="space-y-6 text-left">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-mono text-xs font-black text-slate-400">{report.id}</span>
            <h3 className="text-base font-bold text-slate-800 tracking-tight mt-1">Grievance Investigations Desk</h3>
          </div>
          <div className="flex items-center gap-2">
            {userRole === 'admin' && (
              <button 
                onClick={() => handleDeleteReport(report.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="Discard complaint"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setSelectedReportId(null)}
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Proof of work image visual support */}
        {report.proofUrl && (
          <div className="rounded-2xl overflow-hidden border border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 px-1 tracking-wider">Submitted Proof Log</p>
            <img 
              src={report.proofUrl} 
              alt="garbage overflow proof record" 
              className="w-full h-40 object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Description Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Citizen Statement Details</p>
          <p className="text-xs font-semibold text-slate-600 leading-normal">{report.description}</p>
          <p className="text-[10px] text-slate-400 mt-2">File Contact: {report.citizenName} ({report.citizenEmail || "not recorded"})</p>
        </div>

        {/* Status timeline logs */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Resolution Status flow</p>
          <div className="grid grid-cols-5 gap-1.5">
            {(['new', 'assigned', 'dispatching', 'resolved', 'verified'] as Status[]).map((st) => (
              <button
                key={st}
                disabled={userRole !== 'admin'}
                onClick={() => handleUpdateStatus(report.id, st)}
                className={`py-1.5 rounded-lg text-[9px] font-extrabold uppercase transition-all tracking-wider ${
                  report.status === st
                    ? 'bg-brand-emerald text-white font-extrabold'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          {userRole !== 'admin' && (
            <p className="text-[9px] italic text-slate-400 text-center">Status transitions reserved for Municipality Admins only</p>
          )}
        </div>

        {/* Official response comment log */}
        <div className="border-t border-slate-100 pt-4 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Official comments & Action Logs</p>
          
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {report.comments && report.comments.length > 0 ? (
              report.comments.map((comm, cidx) => (
                <div key={cidx} className="p-2.5 bg-slate-50 rounded-xl text-xs font-semibold text-slate-600">
                  {comm}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">No formal response comments logged on this grievance yet.</p>
            )}
          </div>

          {/* Submit comment action log form */}
          <form onSubmit={(e) => handleAddComment(e, report.id)} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Add action update log..."
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-emerald focus:bg-white transition-all"
            />
            <button 
              type="submit"
              className="px-3 bg-brand-slate-dark text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <div className="flex flex-col min-h-screen">
        {Object.keys(dbLoadErrors).length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 text-amber-800 text-sm flex items-center justify-between z-50" id="db-load-error-banner-login">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">⚠️ Database Status Warning:</span>
              <span>Some system tables could not be loaded successfully. Please check the browser console.</span>
            </div>
            <button onClick={() => setDbLoadErrors({})} className="text-amber-500 hover:text-amber-700 font-bold px-2 text-xs">Dismiss</button>
          </div>
        )}
        <Login onLogin={setUser} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-brand-slate-bg overflow-hidden text-slate-900 font-sans">
      {/* Sidebar backdrop overlay (mobile only) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation - Responsive Slide Drawer on Mobile, Static on Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-brand-slate-dark text-slate-300 flex flex-col shadow-xl z-40 shrink-0
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex h-full
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-emerald rounded-lg flex items-center justify-center text-white font-bold">
              <Trash2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-base tracking-tight">PRJ-120 Portal</span>
              <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider">Garbage Overflow</span>
            </div>
          </div>
          {/* Close Sidebar button (mobile only) */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Quick Switcher Panel explicitly requested (one admin role, Citizen flow, Field Officer flow) */}
        <div className="px-4 py-3 mx-4 my-4 bg-slate-800/40 rounded-xl border border-slate-800">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Workspace Role Mode</p>
          <div className="grid grid-cols-3 gap-1">
            <button 
              onClick={() => { 
                setUserRole('citizen'); 
                setActiveTab('dashboard');
                setIsSidebarOpen(false); 
              }}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                userRole === 'citizen' 
                  ? 'bg-brand-emerald text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-400" /> Citizen
            </button>
            <button 
              onClick={() => { 
                setUserRole('admin'); 
                setActiveTab('dashboard');
                setIsSidebarOpen(false); 
              }}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                userRole === 'admin' 
                  ? 'bg-slate-300 text-slate-900' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" /> Admin
            </button>
            <button 
              onClick={() => { 
                setUserRole('worker'); 
                setUser({
                  name: 'Dave Miller',
                  email: 'dave.miller@portal.gov',
                  role: 'worker',
                  workerId: 'EMP-001'
                });
                setActiveTab('worker-dashboard');
                setIsSidebarOpen(false); 
              }}
              className={`py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                userRole === 'worker' 
                  ? 'bg-emerald-500 text-white font-semibold' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-amber-400" /> Officer
            </button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {userRole === 'citizen' && (
            <>
              <button 
                onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Dashboard</span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'reports' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Complaint Center</span>
                <span className="ml-auto bg-slate-700 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold">
                  {matchingReports.length}
                </span>
              </button>

              <button 
                onClick={() => { setActiveTab('map'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'map' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Hotspots Map</span>
              </button>
            </>
          )}

          {userRole === 'admin' && (
            <>
              <button 
                onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Dashboard</span>
              </button>
              
              <button 
                onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'reports' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Complaint Center</span>
                <span className="ml-auto bg-slate-700 text-[10px] text-white px-1.5 py-0.5 rounded-full font-bold">
                  {matchingReports.length}
                </span>
              </button>

              <button 
                onClick={() => { setActiveTab('worker-management'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'worker-management' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Worker Registry</span>
              </button>

              <button 
                onClick={() => { setActiveTab('work-assignment'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'work-assignment' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Assign Work</span>
              </button>

              <button 
                onClick={() => { setActiveTab('admin-tracking'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'admin-tracking' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Field Telemetry</span>
              </button>

              <button 
                onClick={() => { setActiveTab('map'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'map' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <MapIcon className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Hotspots Map</span>
              </button>

              <button 
                onClick={() => { setActiveTab('analytics'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'analytics' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Analytical Report</span>
              </button>

              <button 
                onClick={() => { setActiveTab('staff'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'staff' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Staff Allocations</span>
              </button>
            </>
          )}

          {userRole === 'worker' && (
            <>
              <button 
                onClick={() => { setActiveTab('worker-dashboard'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'worker-dashboard' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">Worker Dashboard</span>
              </button>

              <button 
                onClick={() => { setActiveTab('worker-tasks'); setIsSidebarOpen(false); }}
                className={`w-full px-4 py-3 rounded-lg flex items-center gap-3 transition-all cursor-pointer ${
                  activeTab === 'worker-tasks' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <span className="text-sm">My Assigned Tasks</span>
                {assignedTasks.filter(t => t.status === 'Assigned' || t.status === 'In Progress').length > 0 && (
                  <span className="ml-auto bg-emerald-500 text-[10px] text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                    {assignedTasks.filter(t => t.status === 'Assigned' || t.status === 'In Progress').length}
                  </span>
                )}
              </button>
            </>
          )}
        </nav>

        {/* User Badge Info */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Account Active</span>
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
            <button 
              onClick={() => setUser(null)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-1.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="text-[9px] uppercase tracking-wider font-bold p-1 bg-slate-800 text-slate-300 rounded text-center">
            {userRole === 'admin' ? "🛡️ Department Admin Access" : "🔑 Citizen Submission Access"}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {Object.keys(dbLoadErrors).length > 0 && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 text-amber-800 text-sm flex items-center justify-between shrink-0 z-20" id="db-load-error-banner-main">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">⚠️ Database Status Warning:</span>
              <span>Some system tables could not be loaded successfully. Please check the browser console.</span>
            </div>
            <button onClick={() => setDbLoadErrors({})} className="text-amber-500 hover:text-amber-700 font-bold px-2 text-xs">Dismiss</button>
          </div>
        )}
        
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-brand-slate-border px-4 md:px-8 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            {/* Hamburger Menu (mobile only) */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-2xl font-bold text-slate-800 tracking-tight truncate">
                Garbage Overflow Reporting Hub
              </h1>
              <p className="text-[9px] sm:text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1.5 sm:gap-2">
                <span className="hidden sm:inline">Public Service Grievance Systems</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 hidden sm:inline" />
                <span className="text-amber-600 font-bold">PRJ-120</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-6 shrink-0">
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Status</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-emerald-600">Database Server Connected</span>
              </div>
            </div>
            
            <div className="h-8 w-px bg-slate-200 hidden lg:block" />
            
            <div className="flex items-center gap-1.5 sm:gap-3">
              {/* Notification bells drop drawer */}
              <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className="p-2 sm:p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all relative"
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  )}
                </button>
                <AnimatePresence>
                  {isNotificationsOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 15 }}
                      className="absolute right-0 mt-3 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 z-40"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Notifications</span>
                        <button 
                          onClick={() => {
                            setNotifications(prev => prev.map(n => ({...n, read: true})));
                          }} 
                          className="text-[10px] font-bold text-brand-emerald hover:underline"
                        >
                          Mark all read
                        </button>
                      </div>
                      <div className="space-y-2.5 max-h-60 overflow-y-auto">
                        {notifications.map(n => (
                          <div key={n.id} className="flex gap-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                            <div className={`w-2 h-2 rounded-full mt-1.5 ${n.read ? 'bg-slate-300' : 'bg-brand-emerald'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-700 leading-tight">{n.text}</p>
                              <span className="text-[10px] text-slate-400 font-medium">{n.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit trigger complaint button */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-brand-emerald text-white rounded-full text-xs font-bold shadow-lg hover:bg-brand-emerald-dark transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Submit Complaint</span>
                <span className="sm:hidden">Report</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable View Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats metric bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Total Bins Reported", value: totalGrievances, subColor: "emerald", desc: "Total active reported coordinates", icon: ClipboardList },
                  { label: "Awaiting Action Team", value: pendingAction, subColor: "amber", desc: "Complaints in status flow", icon: Clock },
                  { label: "Unresolved Critical", value: criticalGrievances, subColor: "red", desc: "Requires immediate clearance", icon: AlertCircle },
                  { label: "Community Resolution", value: `${Math.round(((totalGrievances - pendingAction) / Math.max(1, totalGrievances)) * 100)}%`, subColor: "emerald", desc: "Successful verified feedback", icon: CheckCircle2 }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-5 md:p-6 bg-white rounded-3xl border border-brand-slate-border shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-3 text-slate-400">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                      <item.icon className="w-4 h-4 text-slate-300" />
                    </div>
                    <div>
                      <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{item.value}</p>
                      <p className="text-[11px] text-slate-400 mt-1 font-medium">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Grid content and layout */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* Visual table component for reports */}
                <div className="xl:col-span-2 bg-white rounded-3xl border border-brand-slate-border shadow-xs flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">Municipal Grievances Feed</h3>
                      <p className="text-xs text-slate-500 mt-1">Select any row below to view investigations and resolution trackers</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('reports')}
                      className="text-xs font-bold text-brand-emerald hover:underline uppercase tracking-wide"
                    >
                      Explore Complaints &rarr;
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100 font-bold">
                          <th className="px-6 py-4">Complaint ID</th>
                          <th className="px-6 py-4">Target Location</th>
                          <th className="px-6 py-4">Severity Gravity</th>
                          <th className="px-6 py-4">Assigned Dept</th>
                          <th className="px-6 py-4">Workflow</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {isLoading ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                              Loading complaints feed...
                            </td>
                          </tr>
                        ) : reports.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                              No reported grievances found. Use "Submit Complaint" to get started!
                            </td>
                          </tr>
                        ) : (
                          reports.slice(0, 5).map((report, idx) => (
                            <tr 
                              key={report.id}
                              onClick={() => setSelectedReportId(report.id)}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                            >
                              <td className="px-6 py-4 font-mono font-bold text-[13px] text-slate-500 group-hover:text-slate-900 transition-colors">
                                {report.id}
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-semibold text-slate-800 block text-[13px]">{report.location}</span>
                                <span className="text-[10px] text-slate-400 block truncate max-w-xs">{report.description}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${SEVERITIES[report.severity].bgColor} ${SEVERITIES[report.severity].color}`}>
                                  {SEVERITIES[report.severity].label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-500 block max-w-[150px] truncate mt-4">
                                {report.department}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="flex items-center gap-2 font-bold text-xs text-slate-700">
                                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[report.status].color}`} />
                                  {STATUS_COLORS[report.status].label}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right widgets */}
                <div className="space-y-6">
                  {/* Live Mini Map Spot Indicator */}
                  <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs flex flex-col justify-between min-h-[240px]">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-brand-emerald" /> Interactive Zone Distribution
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5 font-medium">Georeferenced complaining nodes overlay</p>
                    </div>
                    <div 
                      onClick={() => setActiveTab('map')}
                      className="mt-4 flex-1 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer rounded-2xl flex flex-col items-center justify-center p-4 border border-slate-100 group"
                    >
                      <MapPin className="w-8 h-8 text-brand-emerald mb-2 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-600 block">Open Live Coverage map</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{reports.length} pulsing spots tracked</span>
                    </div>
                  </div>

                  {/* Operational Check Card */}
                  <div className="bg-brand-slate-dark text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-3 tracking-widest">SLA Requirement Metrics</p>
                      <ul className="space-y-3.5">
                        <li className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-300">FastAPI CRUD Endpoint</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">VERIFIED</span>
                        </li>
                        <li className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-300">Gemini AI Auto-categorizer</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">ONLINE</span>
                        </li>
                        <li className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-300">Grievance Status Workflow</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">ACTIVE</span>
                        </li>
                        <li className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-300">Proof-of-work File logs</span>
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px]">INTEGRATED</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 2: Complaint Center List (Fully operational query dashboard) */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              {/* Filter grid and keyword matching */}
              <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Grievance Query Desk</h2>
                    <p className="text-xs text-slate-400 mt-1">Audit, assign departments, and track workflow updates of any bins</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5" /> Filter by
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  {/* Search text input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      placeholder="Keyword / Location Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all"
                    />
                  </div>

                  {/* Filter Severity */}
                  <select 
                    value={filterSeverity} 
                    onChange={(e) => setFilterSeverity(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all cursor-pointer"
                  >
                    <option value="all">⚡ All Severities</option>
                    <option value="low">Low Impact</option>
                    <option value="moderate">Moderate Severity</option>
                    <option value="critical">Critical Gravity</option>
                  </select>

                  {/* Filter Workflow Status */}
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all cursor-pointer"
                  >
                    <option value="all">🛠️ All Statuses</option>
                    <option value="new">New Reports</option>
                    <option value="assigned">Assigned</option>
                    <option value="dispatching">Dispatching</option>
                    <option value="resolved">Resolved</option>
                    <option value="verified">Verified/Checking</option>
                  </select>

                  {/* Filter Assigned Department */}
                  <select 
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all cursor-pointer"
                  >
                    <option value="all">🏢 All Departments</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Matching list displays */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  {matchingReports.length === 0 ? (
                    <div className="bg-white p-12 text-center text-slate-400 font-medium rounded-3xl border border-dashed border-slate-200">
                      No reported complaints match those active filters or query.
                    </div>
                  ) : (
                    matchingReports.map((report) => (
                      <motion.div 
                        key={report.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedReportId(report.id)}
                        className={`p-6 bg-white rounded-3xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start gap-4 ${
                          selectedReportId === report.id 
                            ? 'border-brand-emerald shadow-lg shadow-emerald-500/5 ring-1 ring-brand-emerald' 
                            : 'border-brand-slate-border shadow-xs hover:border-slate-350'
                        }`}
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-extrabold text-slate-400">{report.id}</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                              <MapPin className="w-3.5 h-3.5 text-brand-emerald" /> {report.location}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-800 text-sm leading-snug">{report.description}</h3>

                          <div className="flex flex-wrap items-center gap-2 pt-1.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${SEVERITIES[report.severity].bgColor} ${SEVERITIES[report.severity].color}`}>
                              {SEVERITIES[report.severity].label}
                            </span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-bold tracking-tight">
                              🏢 {report.department}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Reported by: <span className="font-semibold text-slate-600">{report.citizenName}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-stretch sm:items-end justify-between self-stretch shrink-0">
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap text-right self-end">
                            {new Date(report.timestamp).toLocaleDateString()} at {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 font-bold text-xs">
                              <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[report.status].color}`} />
                              {STATUS_COLORS[report.status].label}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-350" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Right side drawer panel with details of selected complaints (Desktop persistent) */}
                <div className="hidden lg:block lg:col-span-1 bg-white rounded-3xl border border-brand-slate-border shadow-xs p-6 h-fit sticky top-6">
                  {selectedReport ? (
                    renderReportDetails(selectedReport)
                  ) : (
                    <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center">
                      <FileText className="w-10 h-10 text-slate-200 mb-3" />
                      <p className="text-xs font-semibold leading-relaxed">No complaint selected.<br />Choose a report from the list to update its workflow tracker and view AI parameters.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Responsive Slide-Over Drawer for Mobile View */}
              <AnimatePresence>
                {selectedReport && selectedReportId && (
                  <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedReportId(null)}
                      className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
                    />
                    {/* Sliding sheet */}
                    <motion.div
                      initial={{ x: "100%" }}
                      animate={{ x: 0 }}
                      exit={{ x: "100%" }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto flex flex-col"
                    >
                      {renderReportDetails(selectedReport)}
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

            </div>
          )}

          {/* Tab 3: Interactive Hotspots Map View */}
          {activeTab === 'map' && (
            <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <MapIcon className="w-5 h-5 text-brand-emerald" /> Interactive Zone Heatmap & Hotspots
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pulsing nodes indicate overflowing hotspots reported by citizens. Hover or click nodes to check statuses immediately.
                </p>
              </div>

              {/* Map grid display */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Simulated geographic canvas map */}
                <div className="lg:col-span-2 bg-slate-50 rounded-3xl overflow-hidden relative border border-slate-100 min-h-[460px] flex items-center justify-center">
                  
                  {/* Styled Background Grid represents a real topographical coordinate layout layout */}
                  <div className="absolute inset-0 bg-slate-100/40" style={{
                    backgroundImage: "radial-gradient(#e2e8f0 1.5px, transparent 1.5px)",
                    backgroundSize: "24px 24px"
                  }} />

                  {/* Simulated road outlines representing City Streets */}
                  <div className="absolute w-[80%] h-1 bg-slate-200 top-1/3 left-10 transform -rotate-12 rounded-full" />
                  <div className="absolute w-[90%] h-1 bg-slate-200 bottom-1/4 left-5 transform rotate-6 rounded-full" />
                  <div className="absolute h-[80%] w-1 bg-slate-200 left-1/3 top-10 transform rotate-12 rounded-full" />
                  <div className="absolute h-[70%] w-1 bg-slate-200 right-1/4 top-5 transform -rotate-15 rounded-full" />

                  {/* Representative Local Landmarks labels */}
                  <span className="absolute text-[10px] font-black uppercase text-slate-400 tracking-wider top-[28%] left-[8%]">Block-4 Residential Area</span>
                  <span className="absolute text-[10px] font-black uppercase text-slate-400 tracking-wider top-[78%] left-[45%]">Main Market Zone</span>
                  <span className="absolute text-[10px] font-black uppercase text-slate-400 tracking-wider top-[15%] right-[20%]">Sector 7 Metro Transit</span>

                  {/* Render pulsing coordinate nodes of reported complaints */}
                  {reports.map((report) => {
                    // Generate pseudo-coordinates based strictly on location names to maintain consistent maps
                    let top = "45%";
                    let left = "45%";
                    if (report.location.includes("Block-4")) { top = "30%"; left = "15%"; }
                    else if (report.location.includes("Park Street")) { top = "60%"; left = "35%"; }
                    else if (report.location.includes("Sector 7")) { top = "20%"; left = "75%"; }
                    else if (report.location.includes("Kovil Lane")) { top = "70%"; left = "65%"; }
                    else if (report.location.includes("Main Market")) { top = "80%"; left = "20%"; }

                    const isCritical = report.severity === 'critical';
                    const isCompleted = report.status === 'resolved' || report.status === 'verified';

                    return (
                      <div 
                        key={report.id}
                        onClick={() => setSelectedReportId(report.id)}
                        className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group z-10"
                        style={{ top, left }}
                      >
                        {/* Outer concentric pulsing wave */}
                        <div className={`absolute -inset-4 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-300/10' :
                          isCritical ? 'bg-red-400/20 animate-ping' : 'bg-amber-400/20 animate-pulse'
                        }`} />

                        {/* Middle glowing circle */}
                        <div className={`w-8 h-8 rounded-full shadow-lg border-2 border-white flex items-center justify-center transition-transform hover:scale-125 ${
                          isCompleted ? 'bg-emerald-500' :
                          isCritical ? 'bg-red-500' : 'bg-amber-500'
                        }`} />

                        <MapPin className="absolute inset-0 m-auto w-4 h-4 text-white pointer-events-none" />

                        {/* Quick hover lookup overlay tooltip */}
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-3 rounded-xl text-left hidden group-hover:block transition-all shadow-xl w-60 z-30 font-medium">
                          <p className="font-bold text-xs flex justify-between">
                            <span>{report.id}</span>
                            <span className="text-[10px] uppercase text-emerald-400 tracking-wider">
                              {report.status}
                            </span>
                          </p>
                          <p className="text-[11px] font-semibold text-slate-200 mt-1">{report.location}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs block truncate">{report.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right side contextual map information card */}
                <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 text-sm">Active complaints list on Geolocation</h3>
                    <p className="text-xs text-slate-500 leading-normal">
                      Each pinpoint matches a report of a bin overflow that requires city sanitation crews to target and empty.
                    </p>

                    <div className="space-y-3 pt-2">
                      {reports.map(r => (
                        <div 
                          key={r.id} 
                          onClick={() => setSelectedReportId(r.id)}
                          className="p-3 bg-white hover:border-brand-emerald border border-slate-200/60 rounded-2xl cursor-pointer transition-all flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] tracking-tight font-black font-mono text-slate-400">{r.id}</span>
                            <h4 className="text-xs font-bold text-slate-800 truncate">{r.location}</h4>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            r.status === 'resolved' || r.status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {r.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-150 mt-6">
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Map Legend key</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                        <span className="text-slate-600">Critical Red Spot</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-600">Moderate Yellow Spot</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs col-span-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-slate-600">Resolved / Clearance confirmed</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Tab 4: Analytical reports */}
          {activeTab === 'analytics' && (
            <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-brand-emerald" /> Sanitation analytics metrics
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Automatic statistics analysis compiled in real-time from active citizen complaints database
                  </p>
                </div>
                <button 
                  onClick={() => alert("Report Export feature compiled. Opening PDF save request...")}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-slate-dark text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Incident PDF
                </button>
              </div>

              {/* Analytics diagrams */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between">
                      <span>Daily complaints reported volume</span>
                      <TrendingUp className="w-3.5 h-3.5 text-brand-emerald" />
                    </h3>
                    <p className="text-xs text-slate-400">Pulsing distribution trend over representative timeline scale</p>
                  </div>
                  {renderSVGLineChart()}
                </div>

                <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Grievance category by assigned Department</h3>
                    <p className="text-xs text-slate-400">Total bins division amongst active civic department units</p>
                  </div>
                  {renderSVGPieChart()}
                </div>
              </div>

              {/* Administrative report tables */}
              <div className="bg-white p-6 rounded-2xl border border-slate-100 mt-4">
                <h3 className="font-bold text-slate-800 text-sm mb-4">Department efficiency score checklist</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { dept: "Sanitation Dept", sla: "95.2%", resolved: "234", ongoing: "12" },
                    { dept: "Waste Management Board", sla: "96.4%", resolved: "405", ongoing: "19" },
                    { dept: "Health & Environment", sla: "93.8%", resolved: "152", ongoing: "6" },
                    { dept: "Municipal Administration", sla: "98.1%", resolved: "493", ongoing: "5" }
                  ].map((row, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-1.5">
                      <h4 className="font-bold text-slate-700 text-xs truncate">{row.dept}</h4>
                      <p className="text-2xl font-black text-slate-800">{row.sla}</p>
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>Cleared: {row.resolved}</span>
                        <span>Pending: {row.ongoing}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 5: Staff allocations */}
          {activeTab === 'staff' && (
            <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-emerald" /> Operational duty staff Allocations
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Assign administrative officers, dispatch teams, and view duty personnel assigned to municipal blocks.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: "Pradeep Kumar S", role: "Sanitation Lead", block: "Block-1 & 2", status: "On Duty", avatar: "P" },
                  { name: "Nivedita Shaji", role: "Field Inspector", block: "Block-4 North Gate", status: "Surveying", avatar: "N" },
                  { name: "Gurusamy Karthik", role: "Truck Fleet Dispatch", block: "Sector 7 Metro Area", status: "Dispatched", avatar: "G" }
                ].map((staff, idx) => (
                  <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4 shadow-xs">
                    <div className="w-12 h-12 rounded-2xl bg-brand-slate-dark text-emerald-400 font-black flex items-center justify-center text-lg shadow-md shrink-0">
                      {staff.avatar}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-slate-800 text-sm truncate">{staff.name}</h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{staff.role}</p>
                      <p className="text-xs text-brand-emerald font-semibold select-none flex items-center gap-1.5 pt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {staff.block} • {staff.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-slate-150 p-6">
                <h3 className="font-bold text-slate-800 text-sm">Assign task force crew immediately</h3>
                <p className="text-xs text-slate-400 mt-0.5">Quick dispatcher tool for administrative supervisors</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all cursor-pointer">
                    <option>Wrecking Sanitation Crew #4</option>
                    <option>Waste board Dispatch Truck #15</option>
                    <option>Health sanitation officer squad</option>
                  </select>

                  <select className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-emerald transition-all cursor-pointer">
                    {reports.map(r => (
                      <option key={r.id}>{r.id} ({r.location})</option>
                    ))}
                  </select>

                  <button 
                    onClick={() => alert("Sanitation task force crew has been notified on their field tablets and dispatched!")}
                    className="sm:col-span-2 py-3 bg-brand-emerald text-white rounded-xl text-xs font-bold shadow-md hover:bg-brand-emerald-dark transition-all transform hover:scale-[1.01]"
                  >
                    🚀 Trigger Immediate Field Dispatch
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Worker Dashboard */}
          {activeTab === 'worker-dashboard' && user && (
            <WorkerDashboard 
              worker={{
                id: user.workerId || 'EMP-001',
                fullName: user.name,
                employeeId: user.workerId || 'EMP-001',
                email: user.email,
                mobileNumber: '9876543210',
                address: 'Sanitation Depot Staff Quarters',
                profilePhoto: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=150&q=80',
                dateOfJoining: '2025-01-10',
                department: 'Sanitation Dept',
                areaZone: 'Block-4 North Gate',
                username: user.email.split('@')[0],
                passwordHash: '',
                status: 'Active'
              }}
              tasks={assignedTasks}
              onNotify={(msg) => {
                setNotifications(prev => [
                  { id: Date.now(), text: msg, read: false, time: "Just now" },
                  ...prev
                ]);
              }}
              onRefreshTasks={fetchWorkerTasks}
            />
          )}

          {/* Tab: Worker Tasks */}
          {activeTab === 'worker-tasks' && user && (
            <WorkerTasks 
              worker={{
                id: user.workerId || 'EMP-001',
                fullName: user.name,
                employeeId: user.workerId || 'EMP-001',
                email: user.email,
                mobileNumber: '9876543210',
                address: 'Sanitation Depot Staff Quarters',
                profilePhoto: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=150&q=80',
                dateOfJoining: '2025-01-10',
                department: 'Sanitation Dept',
                areaZone: 'Block-4 North Gate',
                username: user.email.split('@')[0],
                passwordHash: '',
                status: 'Active'
              }}
              tasks={assignedTasks}
              onNotify={(msg) => {
                setNotifications(prev => [
                  { id: Date.now(), text: msg, read: false, time: "Just now" },
                  ...prev
                ]);
              }}
              onRefreshTasks={fetchWorkerTasks}
            />
          )}

          {/* Tab: Worker Management */}
          {activeTab === 'worker-management' && (
            <WorkerManagement 
              onNotify={(msg) => {
                setNotifications(prev => [
                  { id: Date.now(), text: msg, read: false, time: "Just now" },
                  ...prev
                ]);
              }}
            />
          )}

          {/* Tab: Work Assignment */}
          {activeTab === 'work-assignment' && (
            <WorkAssignment 
              onNotify={(msg) => {
                setNotifications(prev => [
                  { id: Date.now(), text: msg, read: false, time: "Just now" },
                  ...prev
                ]);
              }}
            />
          )}

          {/* Tab: Admin Tracking */}
          {activeTab === 'admin-tracking' && (
            <AdminTracking 
              onNotify={(msg) => {
                setNotifications(prev => [
                  { id: Date.now(), text: msg, read: false, time: "Just now" },
                  ...prev
                ]);
              }}
            />
          )}

        </div>

        {/* Create grievance report modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-50 text-left"
              >
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center pb-2">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 tracking-tight">Report Bin Overflow</h2>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Submit new field civic complaint</p>
                    </div>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 rotate-45"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>

                  <form className="space-y-4" onSubmit={handleSubmitReport}>
                    
                    {/* Description field with AI classification trigger */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Describe Overflow issue</label>
                        <button 
                          type="button"
                          onClick={handleAiAutoFill}
                          disabled={isAiLoading}
                          className="flex items-center gap-1.5 text-xs text-brand-emerald font-bold hover:underline hover:text-brand-emerald-dark transition-all"
                        >
                          {isAiLoading ? (
                            <span className="flex items-center gap-1"><div className="w-3.5 h-3.5 border-2 border-brand-emerald/30 border-t-brand-emerald rounded-full animate-spin" /> Classifying...</span>
                          ) : (
                            <><Sparkles className="w-3.5 h-3.5" /> ✨ Analyze with Gemini AI</>
                          )}
                        </button>
                      </div>
                      <textarea 
                        rows={3}
                        required
                        placeholder="Provide details (e.g., 'A giant mountain of organic garbage bags spilled near Block-4 gate and stray dogs are tearing it...')"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:bg-white transition-all resize-none leading-relaxed"
                      />
                    </div>

                    {/* Show results returned by Gemini server analysis */}
                    {aiAnalysisResult && (
                      <div className="p-3 bg-emerald-50 rounded-2xl text-[11px] font-bold text-emerald-800 border-2 border-dashed border-emerald-100 text-left">
                        {aiAnalysisResult}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      {/* Select Zone location */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Target Zone / Block</label>
                        <select 
                          value={formLocation}
                          onChange={(e) => setFormLocation(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:bg-white transition-all cursor-pointer"
                        >
                          {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>

                      {/* Select Department */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Assigned Department</label>
                        <select 
                          value={formDept}
                          onChange={(e) => setFormDept(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-emerald focus:bg-white transition-all cursor-pointer"
                        >
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Select Severity */}
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Grievance Gravity Severity</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['low', 'moderate', 'critical'] as Severity[]).map((sv) => (
                            <button
                              key={sv}
                              type="button"
                              onClick={() => setFormSeverity(sv)}
                              className={`py-2 px-3 border rounded-xl text-xs font-bold uppercase transition-all tracking-wide text-center ${
                                formSeverity === sv 
                                  ? 'border-brand-emerald bg-emerald-50 text-brand-emerald' 
                                  : 'border-slate-100 bg-slate-50 text-slate-400'
                              }`}
                            >
                              {sv}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Proof selection drawer simulating files picker */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 block">Attach Visual Proof logs</label>
                      <div className="grid grid-cols-4 gap-2">
                        {SAMPLE_GARBAGE_IMAGES.map((img) => (
                          <div 
                            key={img.id}
                            onClick={() => setFormProofUrl(img.url)}
                            className={`rounded-xl overflow-hidden border-2 cursor-pointer transition-all relative h-14 ${
                              formProofUrl === img.url ? 'border-brand-emerald scale-102 shadow' : 'border-transparent opacity-80 hover:opacity-100'
                            }`}
                          >
                            <img src={img.url} alt="garbage preview slot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            {formProofUrl === img.url && (
                              <div className="absolute inset-0 bg-brand-emerald/20 flex items-center justify-center">
                                <Check className="w-5 h-5 text-white bg-brand-emerald rounded-full p-0.5" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button 
                        type="submit"
                        className="w-full py-4 bg-brand-emerald text-white font-extrabold text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:bg-brand-emerald-dark transition-all transform hover:scale-[1.01]"
                      >
                        Submit Grievance Complaint Record
                      </button>
                    </div>

                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
