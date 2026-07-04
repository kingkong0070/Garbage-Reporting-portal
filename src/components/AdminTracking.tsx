import React, { useState, useEffect } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from "recharts";
import { 
  Users, UserCheck, UserMinus, CheckCircle2, Clock, 
  Activity, FileSpreadsheet, Printer, Search, ArrowRight,
  Filter, Download, RefreshCw, Calendar, MapPin, AlertCircle 
} from "lucide-react";
import { Worker, AssignedTask, WorkerActivity } from "../types";

interface AdminTrackingProps {
  onNotify: (text: string) => void;
}

export default function AdminTracking({ onNotify }: AdminTrackingProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tasks, setTasks] = useState<AssignedTask[]>([]);
  const [activities, setActivities] = useState<WorkerActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Report Generator States
  const [reportType, setReportType] = useState<"by-worker" | "completed" | "pending" | "area-wise" | "date-wise">("by-worker");
  const [selectedWorkerId, setSelectedWorkerId] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll database updates every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [resWorkers, resTasks, resActivities] = await Promise.all([
        fetch("/api/workers"),
        fetch("/api/tasks"),
        fetch("/api/worker-activities")
      ]);

      if (resWorkers.ok) setWorkers(await resWorkers.json());
      if (resTasks.ok) setTasks(await resTasks.json());
      if (resActivities.ok) setActivities(await resActivities.json());
    } catch (err) {
      console.error(err);
    }
  };

  const forceRefresh = async () => {
    setIsLoading(true);
    await fetchData();
    setIsLoading(false);
    onNotify("Tracking telemetry updated!");
  };

  // Compute live metrics
  const totalWorkers = workers.length;
  const activeWorkers = workers.filter(w => w.status === "Active");
  const busyWorkerIds = new Set(tasks.filter(t => t.status === "In Progress").map(t => t.workerId));
  
  const busyWorkersCount = activeWorkers.filter(w => busyWorkerIds.has(w.employeeId)).length;
  const availableWorkersCount = activeWorkers.length - busyWorkersCount;

  const todayStr = new Date().toISOString().split("T")[0];
  const completedToday = tasks.filter(t => t.status === "Completed" && t.updatedAt?.startsWith(todayStr)).length;
  const pendingTasks = tasks.filter(t => t.status === "Pending" || t.status === "Assigned").length;
  const inProgressTasks = tasks.filter(t => t.status === "In Progress").length;
  
  const completionRate = tasks.length > 0 
    ? Math.round((tasks.filter(t => t.status === "Completed").length / tasks.length) * 100) 
    : 0;

  // Prepare chart data: Tasks by status
  const statusCounts = tasks.reduce((acc: any, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const statusChartData = Object.keys(statusCounts).map(k => ({
    name: k,
    value: statusCounts[k]
  }));

  const STATUS_COLORS = {
    "Completed": "#10b981", // emerald
    "In Progress": "#3b82f6", // blue
    "Assigned": "#f59e0b", // amber
    "Pending": "#6366f1", // indigo
    "Rejected": "#f43f5e", // rose
    "Cancelled": "#94a3b8" // slate
  };

  // Prepare chart data: Tasks by Area/Zone
  const areaCounts = tasks.reduce((acc: any, t) => {
    acc[t.complaintLocation] = (acc[t.complaintLocation] || 0) + 1;
    return acc;
  }, {});

  const areaChartData = Object.keys(areaCounts).map(k => ({
    name: k.length > 20 ? k.substring(0, 18) + "..." : k,
    Count: areaCounts[k]
  })).slice(0, 6);

  // Report generation algorithm
  const generateReportData = () => {
    let list = [...tasks];

    if (reportType === "by-worker") {
      if (selectedWorkerId !== "all") {
        list = list.filter(t => t.workerId === selectedWorkerId);
      }
    } else if (reportType === "completed") {
      list = list.filter(t => t.status === "Completed");
    } else if (reportType === "pending") {
      list = list.filter(t => t.status === "Pending" || t.status === "Assigned" || t.status === "In Progress");
    } else if (reportType === "area-wise") {
      if (selectedArea !== "all") {
        list = list.filter(t => t.complaintLocation.toLowerCase().includes(selectedArea.toLowerCase()));
      }
    } else if (reportType === "date-wise") {
      if (dateFilter) {
        list = list.filter(t => t.dueDate === dateFilter || t.createdAt.startsWith(dateFilter));
      }
    }

    return list;
  };

  const reportRows = generateReportData();

  // Export to Excel (CSV download)
  const handleExportExcel = () => {
    if (reportRows.length === 0) {
      onNotify("No data available to export.");
      return;
    }

    const headers = ["Task ID", "Grievance ID", "Title", "Location", "Worker Assigned", "Priority", "Due Date", "Status", "Duration", "Remarks"];
    const csvContent = [
      headers.join(","),
      ...reportRows.map(r => [
        `"${r.id}"`,
        `"${r.complaintId}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.complaintLocation.replace(/"/g, '""')}"`,
        `"${r.workerName.replace(/"/g, '""')}"`,
        `"${r.priority}"`,
        `"${r.dueDate}"`,
        `"${r.status}"`,
        `"${r.estimatedTime}"`,
        `"${r.remarks.replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Municipal_Report_${reportType}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify("Report exported to Excel successfully!");
  };

  // Export to PDF (Print preview)
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="admin_tracking_dashboard">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
            Field Duty Tracking & Audits
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time tracking of active municipal field officers, telemetry dispatches, and SLA completion analytics.
          </p>
        </div>
        <button
          onClick={forceRefresh}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-md shrink-0 active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Sync Live Telemetry
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Officers", val: totalWorkers, sub: "Registered base", icon: Users, col: "text-slate-800" },
          { label: "Available Staff", val: availableWorkersCount, sub: "Ready for dispatch", icon: UserCheck, col: "text-emerald-600" },
          { label: "On Field Duties", val: busyWorkersCount, sub: "Active clearing jobs", icon: UserMinus, col: "text-blue-600" },
          { label: "Cleared Today", val: completedToday, sub: "SLA completed", icon: CheckCircle2, col: "text-emerald-500" },
          { label: "Unassigned Tasks", val: pendingTasks, sub: "Pending dispatches", icon: Clock, col: "text-amber-500" },
          { label: "Total Completion", val: `${completionRate}%`, sub: "Work rate metric", icon: CheckCircle2, col: "text-indigo-600" }
        ].map((m, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-brand-slate-border shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider">{m.label}</span>
              <m.icon className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className={`text-xl sm:text-2xl font-extrabold tracking-tight ${m.col}`}>{m.val}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Charts & Live Feed Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Chart status distributions */}
        <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Task Status Allocations</h3>
          <div className="h-64 flex-1">
            {statusChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No telemetry data.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={(STATUS_COLORS as any)[entry.name] || "#cbd5e1"} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Area-wise charts */}
        <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Grievance Cleans by Area</h3>
          <div className="h-64 flex-1">
            {areaChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No local data mapped.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaChartData}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                  <YAxis stroke="#94a3b8" fontSize={9} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Live activities log */}
        <div className="bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Dispatch Activity Terminal
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3.5 max-h-64 pr-1">
            {activities.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">No activity logged. Try changing task statuses.</div>
            ) : (
              activities.slice(0, 10).map((act) => (
                <div key={act.id} className="text-xs border-l-2 border-emerald-500 pl-3 py-1 space-y-0.5">
                  <p className="text-slate-700 font-semibold leading-snug">
                    <strong className="text-slate-900">{act.workerName}</strong> {act.action}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Reports Center Panel */}
      <div className="bg-white rounded-3xl border border-brand-slate-border p-6 shadow-xs space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <Filter className="w-5 h-5 text-emerald-500" />
              Municipal Report & Compliance Center
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Assemble analytical tabular reports on field tasks and perform structural exports for auditors.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all"
            >
              <Printer className="w-4 h-4" />
              Print PDF
            </button>
          </div>
        </div>

        {/* Report Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Report Category</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold"
            >
              <option value="by-worker">Tasks by Worker</option>
              <option value="completed">Completed Tasks</option>
              <option value="pending">Pending Tasks</option>
              <option value="area-wise">Area-wise Tasks</option>
              <option value="date-wise">Date-wise Reports</option>
            </select>
          </div>

          {reportType === "by-worker" && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Field Officer</label>
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700"
              >
                <option value="all">All Workers</option>
                {workers.map(w => (
                  <option key={w.employeeId} value={w.employeeId}>{w.fullName} ({w.employeeId})</option>
                ))}
              </select>
            </div>
          )}

          {reportType === "area-wise" && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Area or Zone</label>
              <input
                type="text"
                placeholder="e.g. Sector 4, Block"
                value={selectedArea === "all" ? "" : selectedArea}
                onChange={(e) => setSelectedArea(e.target.value || "all")}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}

          {reportType === "date-wise" && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Filter Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}
        </div>

        {/* Tabular Output */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="p-3 pl-4">Task ID</th>
                <th className="p-3">Title</th>
                <th className="p-3">Officer</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Location</th>
                <th className="p-3">Due Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 pr-4 text-right">Completion At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {reportRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No records found matching report parameters.
                  </td>
                </tr>
              ) : (
                reportRows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-4 font-mono font-bold text-slate-500">{r.id}</td>
                    <td className="p-3 font-semibold text-slate-800">{r.title}</td>
                    <td className="p-3 text-slate-600">{r.workerName}</td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-700">{r.priority}</span>
                    </td>
                    <td className="p-3 max-w-[150px] truncate">{r.complaintLocation}</td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">{r.dueDate}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === "Completed" ? "bg-emerald-100 text-emerald-800" :
                        r.status === "In Progress" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3 pr-4 text-right font-mono text-[10px] text-slate-400">
                      {r.completedAt ? new Date(r.completedAt).toLocaleString() : "Pending"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
