import React, { useState, useEffect } from "react";
import { 
  Plus, Edit2, Clipboard, User, Clock, AlertTriangle, 
  MapPin, CheckCircle2, FileText, ChevronRight, Search, 
  RefreshCw, Info, Calendar, X, Trash2, ShieldAlert 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AssignedTask, Worker, GrievanceReport } from "../types";

interface WorkAssignmentProps {
  onNotify: (text: string) => void;
}

export default function WorkAssignment({ onNotify }: WorkAssignmentProps) {
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [reports, setReports] = useState<GrievanceReport[]>([]);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<AssignedTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [complaintId, setComplaintId] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("2 hours");
  const [remarks, setRemarks] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    onNotify(msg);
    setTimeout(() => setSuccess(null), 4000);
  };

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resTasks, resWorkers, resReports] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/workers"),
        fetch("/api/reports")
      ]);

      if (resTasks.ok) setTasks(await resTasks.json());
      if (resWorkers.ok) setWorkers(await resWorkers.json());
      if (resReports.ok) setReports(await resReports.json());
    } catch (err) {
      console.error(err);
      showError("Failed to fetch databases for Work Assignment");
    } finally {
      setIsLoading(false);
    }
  };

  // When a complaint is selected, auto-populate title and description
  const handleComplaintChange = (id: string) => {
    setComplaintId(id);
    const selectedGrievance = reports.find(r => r.id === id);
    if (selectedGrievance) {
      setTitle(`Clear Overflow at ${selectedGrievance.location}`);
      setRemarks(`Grievance filed by ${selectedGrievance.citizenName}. Severity: ${selectedGrievance.severity.toUpperCase()}`);
    }
  };

  const resetForm = () => {
    setTitle("");
    setComplaintId("");
    setWorkerId("");
    setPriority("Medium");
    setDueDate(new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]); // 2 days from now
    setEstimatedTime("3 hours");
    setRemarks("");
    setEditingTask(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    // Pre-select first unassigned grievance if any
    const unassigned = reports.filter(r => r.status === "new" || r.status === "dispatching");
    if (unassigned.length > 0) {
      handleComplaintChange(unassigned[0].id);
    }
    // Pre-select first active worker if any
    const activeWorkers = workers.filter(w => w.status === "Active");
    if (activeWorkers.length > 0) {
      setWorkerId(activeWorkers[0].employeeId);
    }
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: AssignedTask) => {
    setEditingTask(t);
    setTitle(t.title);
    setComplaintId(t.complaintId);
    setWorkerId(t.workerId);
    setPriority(t.priority);
    setDueDate(t.dueDate);
    setEstimatedTime(t.estimatedTime);
    setRemarks(t.remarks);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !complaintId || !workerId) {
      showError("Please fill out all required fields.");
      return;
    }

    const payload = {
      title,
      complaintId,
      workerId,
      priority,
      dueDate,
      estimatedTime,
      remarks
    };

    try {
      setIsLoading(true);
      const url = editingTask ? `/api/tasks/${editingTask.id}` : "/api/tasks";
      const method = editingTask ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "An error occurred saving task assignment.");
        return;
      }

      showSuccess(editingTask ? `Task ${editingTask.id} reassigned/updated successfully!` : `Task assigned successfully to ${data.workerName}!`);
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      console.error(err);
      showError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tasks based on search & selectors
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.id.toLowerCase().includes(search.toLowerCase()) ||
                          t.workerName.toLowerCase().includes(search.toLowerCase()) ||
                          t.complaintId.toLowerCase().includes(search.toLowerCase());
    const matchesPriority = filterPriority === "all" || t.priority === filterPriority;
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityBadgeClass = (p: string) => {
    switch(p) {
      case "Urgent": return "bg-red-100 text-red-800 border-red-200";
      case "High": return "bg-amber-100 text-amber-800 border-amber-200";
      case "Medium": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch(s) {
      case "Completed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "In Progress": return "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
      case "Rejected": return "bg-rose-100 text-rose-800 border-rose-200";
      case "Cancelled": return "bg-slate-100 text-slate-500 border-slate-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <div className="space-y-6" id="work_assignment_panel">
      {/* Upper bar with Title & Create button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-emerald-500" />
            Field Work Assignment Board
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dispatch sanitation field officers, link municipal complaints, configure priorities, and review completion SLA.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-emerald hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Assign New Task
        </button>
      </div>

      {/* Snackbar alerts */}
      <AnimatePresence>
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-2 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {success}
          </motion.div>
        )}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-50 text-red-800 text-xs font-semibold rounded-xl border border-red-200 flex items-center gap-2 shadow-xs"
          >
            <X className="w-4 h-4 text-red-500" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-3xl border border-brand-slate-border shadow-xs">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, worker name, task/complaint ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
          >
            <option value="all">All Priorities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Grid displaying tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isLoading && tasks.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-400">Loading assignments database...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-2 p-12 bg-white rounded-3xl border text-center text-xs text-slate-400">No active work assignments found.</div>
        ) : (
          filteredTasks.map((t) => (
            <motion.div
              key={t.id}
              layoutId={t.id}
              className="bg-white rounded-3xl border border-brand-slate-border shadow-xs hover:shadow-md transition-shadow p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold text-slate-600">{t.id}</span>
                      Linked to complaint: <span className="font-mono text-emerald-600 font-bold">{t.complaintId}</span>
                    </span>
                    <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">{t.title}</h4>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getPriorityBadgeClass(t.priority)}`}>
                      {t.priority}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl text-xs space-y-2 border border-slate-100">
                  <p className="text-slate-600 font-medium line-clamp-2">
                    <strong className="text-slate-800">Location:</strong> {t.complaintLocation}
                  </p>
                  <p className="text-slate-500 italic text-[11px] line-clamp-3">
                    &ldquo;{t.complaintDescription}&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Field Officer</p>
                      <p className="font-bold text-slate-700">{t.workerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">SLA Due Date</p>
                      <p className="font-bold text-slate-700">{t.dueDate}</p>
                    </div>
                  </div>
                </div>

                {t.remarks && (
                  <p className="text-[11px] text-slate-500 flex items-start gap-1 p-2 bg-yellow-50/50 rounded-lg text-xs border border-yellow-100/50">
                    <Info className="w-3.5 h-3.5 text-yellow-600 shrink-0 mt-0.5" />
                    <span><strong>Admin note:</strong> {t.remarks}</span>
                  </p>
                )}

                {t.rejectReason && t.status === "Rejected" && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 flex gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[9px] text-red-500">Rejection Reason Specified</p>
                      <p className="mt-0.5 italic">&ldquo;{t.rejectReason}&rdquo;</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Task edit actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  Est: {t.estimatedTime}
                </span>
                {t.status !== "Completed" && t.status !== "Cancelled" && (
                  <button
                    onClick={() => handleOpenEdit(t)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-[10px] rounded-lg transition-all"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-400" />
                    Edit or Reassign
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Task Assignment / Edit Form Sheet Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-extrabold text-slate-800">
                {editingTask ? `Edit Assignment TSK-${editingTask.id}` : "Delegate Field Assignment"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
              {/* Linked Grievance Complaint Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Select Active Grievance *</label>
                {editingTask ? (
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 font-mono">
                    {editingTask.complaintId} (Immutable linked report)
                  </div>
                ) : (
                  <select
                    required
                    value={complaintId}
                    onChange={(e) => handleComplaintChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 text-slate-700 font-semibold"
                  >
                    <option value="" disabled>-- Choose active complaint --</option>
                    {reports
                      .filter(r => r.status !== "resolved" && r.status !== "verified")
                      .map(r => (
                        <option key={r.id} value={r.id}>
                          [{r.id}] {r.location} - {r.description.substring(0, 50)}...
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Task Dispatch Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sweep and clear domestic waste bins"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 font-bold text-slate-800"
                />
              </div>

              {/* Select Worker */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Assign Field Officer *</label>
                <select
                  required
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 text-slate-700 font-semibold"
                >
                  <option value="" disabled>-- Choose field officer --</option>
                  {workers
                    .filter(w => w.status === "Active")
                    .map(w => (
                      <option key={w.employeeId} value={w.employeeId}>
                        {w.fullName} ({w.employeeId}) - Active [{w.department}]
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Priority */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">SLA Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500 font-medium text-slate-700"
                  />
                </div>

                {/* Estimated Completion Time */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Estimated Duration</label>
                  <input
                    type="text"
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="e.g. 4 hours"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Remarks or Special Instructions</label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide specialized safety notes, specific truck numbers, gate codes..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2 bg-brand-emerald hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  {isLoading ? "Saving..." : editingTask ? "Reassign Assignment" : "Issue Task Assignment"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
