import React, { useState } from "react";
import { 
  ClipboardCheck, Clock, MapPin, AlertCircle, AlertTriangle, CheckCircle2, 
  X, Image as ImageIcon, Navigation, Edit3, Send, Check, RefreshCw 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AssignedTask, Worker } from "../types";

interface WorkerTasksProps {
  worker: Worker;
  tasks: AssignedTask[];
  onNotify: (text: string) => void;
  onRefreshTasks: () => void;
}

// Preset photo arrays to simulate visual uploads
const BEFORE_MUNICIPAL_PRESETS = [
  "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80", // Overflow trash bin
  "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80", // Litter on street
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=600&q=80"  // Unsorted heaps
];

const AFTER_MUNICIPAL_PRESETS = [
  "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80", // Clean street curb
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80", // Empty recycle bins
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=600&q=80"  // Spotless municipal lot
];

export default function WorkerTasks({ worker, tasks, onNotify, onRefreshTasks }: WorkerTasksProps) {
  const [selectedTask, setSelectedTask] = useState<AssignedTask | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // Update Progress Form states
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [workNotes, setWorkNotes] = useState("");
  const [gpsLocation, setGpsLocation] = useState("");
  const [beforeImage, setBeforeImage] = useState("");
  const [afterImage, setAfterImage] = useState("");

  const handleFetchTaskUpdate = async (id: string, updates: Partial<AssignedTask>) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok) {
        onNotify(`Task marked as ${updates.status}!`);
        onRefreshTasks();
        setSelectedTask(null);
      } else {
        onNotify(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      onNotify("Failed to update task.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = (task: AssignedTask) => {
    handleFetchTaskUpdate(task.id, { status: "In Progress", beforeImageUrl: BEFORE_MUNICIPAL_PRESETS[Math.floor(Math.random() * BEFORE_MUNICIPAL_PRESETS.length)] });
  };

  const handleOpenReject = (task: AssignedTask) => {
    setSelectedTask(task);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      onNotify("Rejection reason is required.");
      return;
    }
    if (selectedTask) {
      await handleFetchTaskUpdate(selectedTask.id, {
        status: "Rejected",
        rejectReason: rejectReason
      });
      setShowRejectModal(false);
    }
  };

  const handleOpenProgress = (task: AssignedTask) => {
    setSelectedTask(task);
    setWorkNotes(task.workNotes || "");
    setGpsLocation(task.gpsLocation || "");
    setBeforeImage(task.beforeImageUrl || BEFORE_MUNICIPAL_PRESETS[0]);
    setAfterImage(task.afterImageUrl || AFTER_MUNICIPAL_PRESETS[Math.floor(Math.random() * AFTER_MUNICIPAL_PRESETS.length)]);
    setShowProgressModal(true);
  };

  const grabGPSLocation = () => {
    if (navigator.geolocation) {
      onNotify("Acquiring GPS Signal...");
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation(`${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
          onNotify("GPS Lock Acquired!");
        },
        (error) => {
          console.error(error);
          // Fallback to random municipal mock coordinate inside city bounds
          const mockLat = (28.6139 + (Math.random() - 0.5) * 0.05).toFixed(6);
          const mockLng = (77.2090 + (Math.random() - 0.5) * 0.05).toFixed(6);
          setGpsLocation(`${mockLat}, ${mockLng} (Simulated Signal)`);
          onNotify("Simulated GPS Lock Acquired (Browser Restricted)");
        }
      );
    } else {
      onNotify("Geolocation is not supported by your device.");
    }
  };

  const submitCompletion = async () => {
    if (!workNotes.trim()) {
      onNotify("Please enter completed work summary notes.");
      return;
    }
    if (selectedTask) {
      await handleFetchTaskUpdate(selectedTask.id, {
        status: "Completed",
        workNotes,
        gpsLocation: gpsLocation || "28.6139, 77.2090",
        beforeImageUrl: beforeImage,
        afterImageUrl: afterImage,
        completedAt: new Date().toISOString()
      });
      setShowProgressModal(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.complaintLocation.toLowerCase().includes(search.toLowerCase()) ||
                          t.id.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Urgent": return "bg-red-100 text-red-800 border-red-200";
      case "High": return "bg-amber-100 text-amber-800 border-amber-200";
      case "Medium": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "Completed": return "bg-emerald-100 text-emerald-800";
      case "In Progress": return "bg-blue-100 text-blue-800 animate-pulse";
      case "Rejected": return "bg-rose-100 text-rose-800";
      case "Cancelled": return "bg-slate-100 text-slate-500";
      default: return "bg-amber-100 text-amber-800";
    }
  };

  return (
    <div className="space-y-6" id="worker_tasks_view">
      {/* Title bar */}
      <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-500" />
            My Active Dispatch Tasks
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review your assigned municipal grievances, start dispatch clearings, and log before/after cleanup telemetry.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl border border-brand-slate-border shadow-xs">
        <div className="md:col-span-2 relative">
          <input
            type="text"
            placeholder="Search tasks by location or dispatch details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
          >
            <option value="all">All Dispatches</option>
            <option value="Assigned">Assigned / New</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Task List Layout */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-3xl border">
            No dispatch tasks found under your account matching current filters.
          </div>
        ) : (
          filteredTasks.map((t) => (
            <motion.div
              key={t.id}
              layoutId={t.id}
              className="bg-white rounded-3xl border border-brand-slate-border shadow-xs p-5 md:p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:shadow-md transition-shadow"
            >
              <div className="space-y-3 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-bold">{t.id}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getPriorityColor(t.priority)}`}>
                    {t.priority} Priority
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadge(t.status)}`}>
                    {t.status}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm sm:text-base leading-tight truncate">{t.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">Linked Complaint: {t.complaintId}</p>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-600 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100/50">
                  <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="truncate">{t.complaintLocation}</span>
                </div>

                {t.remarks && (
                  <p className="text-[11px] text-slate-500 italic bg-yellow-50/40 p-2 rounded-lg border border-yellow-100/35">
                    <strong>Instructions:</strong> &ldquo;{t.remarks}&rdquo;
                  </p>
                )}
              </div>

              {/* Action Buttons based on task state */}
              <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center justify-end gap-2.5 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                {t.status === "Assigned" && (
                  <>
                    <button
                      onClick={() => handleAccept(t)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept & Start Duty
                    </button>
                    <button
                      onClick={() => handleOpenReject(t)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject Dispatch
                    </button>
                  </>
                )}

                {t.status === "In Progress" && (
                  <button
                    onClick={() => handleOpenProgress(t)}
                    className="px-5 py-2.5 bg-brand-emerald hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 animate-bounce"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Sanitation Job
                  </button>
                )}

                {t.status === "Completed" && (
                  <div className="text-right space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed Milestone
                    </span>
                    <p className="text-[9px] text-slate-400">At {t.completedAt ? new Date(t.completedAt).toLocaleString() : ""}</p>
                    <button
                      onClick={() => handleOpenProgress(t)}
                      className="text-[10px] text-slate-500 hover:text-emerald-600 underline font-semibold block ml-auto"
                    >
                      View Logs & Telemetry
                    </button>
                  </div>
                )}

                {t.status === "Rejected" && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-rose-500 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Dispatch Rejected
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] italic line-clamp-1">
                      &ldquo;{t.rejectReason}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Reject Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 text-rose-600">
                <AlertTriangle className="w-5 h-5 text-rose-500" /> Reject Dispatch Duty
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-normal">
                Please enter the rejection rationale. This will immediately log on the Admin dashboard and notify supervisor.
              </p>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Broken vacuum gear, vehicle maintenance, out-of-bounds safety risk..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 shrink-0 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={submitReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl"
              >
                Submit Rejection
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Complete Task / Telemetry Modal */}
      {showProgressModal && selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                {selectedTask.status === "Completed" ? "Completed Dispatch Logs" : "Mark Job Complete & Upload Telemetry"}
              </h3>
              <button onClick={() => setShowProgressModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1">
              {/* Linked task overview */}
              <div className="p-3.5 bg-slate-50 rounded-2xl text-xs border border-slate-100">
                <p className="font-bold text-slate-700">{selectedTask.title}</p>
                <p className="text-slate-500 text-[11px] mt-1">{selectedTask.complaintLocation}</p>
              </div>

              {/* Work Notes */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Sanitation Summary / Work Notes *</label>
                {selectedTask.status === "Completed" ? (
                  <p className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 italic">
                    &ldquo;{selectedTask.workNotes}&rdquo;
                  </p>
                ) : (
                  <textarea
                    rows={3}
                    required
                    value={workNotes}
                    onChange={(e) => setWorkNotes(e.target.value)}
                    placeholder="Describe clearings: e.g. Cleared 200kg plastic, swept the pavement, container disinfected."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                )}
              </div>

              {/* Geolocation */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Recorded GPS Coordinates</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder="No GPS telemetry logged"
                    value={gpsLocation}
                    className="flex-1 p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-600"
                  />
                  {selectedTask.status !== "Completed" && (
                    <button
                      type="button"
                      onClick={grabGPSLocation}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Acquire GPS
                    </button>
                  )}
                </div>
              </div>

              {/* Before/After Progress Photos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Before Dispatch Photo</label>
                  <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                    {beforeImage ? (
                      <img src={beforeImage} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] text-slate-400">No Photo</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">After Completion Photo</label>
                  <div className="aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center relative">
                    {afterImage ? (
                      <img src={afterImage} alt="After" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[10px] text-slate-400">No Photo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowProgressModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 rounded-xl"
              >
                Close
              </button>
              {selectedTask.status !== "Completed" && (
                <button
                  type="button"
                  onClick={submitCompletion}
                  className="px-5 py-2 bg-brand-emerald hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  Confirm Completion
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
