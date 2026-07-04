import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Edit2, Trash2, Check, X, UserX, UserCheck, 
  Mail, Phone, MapPin, Calendar, Briefcase, Key, Shield, UserPlus 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Worker } from "../types";

interface WorkerManagementProps {
  onNotify: (text: string) => void;
}

export default function WorkerManagement({ onNotify }: WorkerManagementProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [address, setAddress] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [department, setDepartment] = useState("Sanitation Dept");
  const [areaZone, setAreaZone] = useState("Block-4 North Gate");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<'Active' | 'Inactive'>("Active");

  // Notification states
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
    fetchWorkers();
  }, []);

  const fetchWorkers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/workers");
      if (res.ok) {
        const data = await res.json();
        setWorkers(data);
      }
    } catch (err) {
      console.error(err);
      showError("Failed to fetch workers database");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setMobileNumber("");
    setAddress("");
    setProfilePhoto("");
    setDateOfJoining(new Date().toISOString().split("T")[0]);
    setDepartment("Sanitation Dept");
    setAreaZone("Block-4 North Gate");
    setUsername("");
    setPassword("");
    setStatus("Active");
    setEditingWorker(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (w: Worker) => {
    setEditingWorker(w);
    setFullName(w.fullName);
    setEmail(w.email);
    setMobileNumber(w.mobileNumber);
    setAddress(w.address);
    setProfilePhoto(w.profilePhoto);
    setDateOfJoining(w.dateOfJoining);
    setDepartment(w.department);
    setAreaZone(w.areaZone);
    setUsername(w.username);
    setPassword(w.passwordHash); // Decrypted/plain representation for edit mode
    setStatus(w.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !mobileNumber.trim() || !username.trim() || !password.trim()) {
      showError("Please fill out all required fields marked with *");
      return;
    }

    // Client-side validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError("Please enter a valid email address");
      return;
    }

    const payload = {
      fullName,
      email,
      mobileNumber,
      address,
      profilePhoto: profilePhoto || `https://images.unsplash.com/photo-${editingWorker ? "1535713875002-d1d0cf377fde" : "1540569014015-19a7be504e3a"}?auto=format&fit=crop&w=150&q=80`,
      dateOfJoining,
      department,
      areaZone,
      username,
      password,
      status
    };

    try {
      setIsLoading(true);
      const url = editingWorker ? `/api/workers/${editingWorker.employeeId}` : "/api/workers";
      const method = editingWorker ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || "An error occurred saving worker");
        return;
      }

      showSuccess(editingWorker ? `Worker ${data.fullName} details updated!` : `New worker ${data.fullName} registered successfully!`);
      setIsModalOpen(false);
      resetForm();
      fetchWorkers();
    } catch (err) {
      console.error(err);
      showError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (employeeId: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to remove worker ${name} (${employeeId})? This action is permanent.`)) {
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/workers/${employeeId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Worker ${name} removed from registry.`);
        fetchWorkers();
      } else {
        showError(data.error || "Failed to delete worker");
      }
    } catch (err) {
      console.error(err);
      showError("Failed to delete worker");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (worker: Worker) => {
    const newStatus = worker.status === "Active" ? "Inactive" : "Active";
    try {
      setIsLoading(true);
      const res = await fetch(`/api/workers/${worker.employeeId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showSuccess(`Worker ${worker.fullName} status marked ${newStatus}`);
        fetchWorkers();
      } else {
        const d = await res.json();
        showError(d.error || "Failed to update status");
      }
    } catch (err) {
      console.error(err);
      showError("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWorkers = workers.filter(w => {
    const matchesSearch = w.fullName.toLowerCase().includes(search.toLowerCase()) || 
                          w.employeeId.toLowerCase().includes(search.toLowerCase()) ||
                          w.email.toLowerCase().includes(search.toLowerCase()) ||
                          w.username.toLowerCase().includes(search.toLowerCase());
    const matchesDept = filterDept === "all" || w.department === filterDept;
    const matchesStatus = filterStatus === "all" || w.status === filterStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6" id="worker_management_panel">
      {/* Upper bar with Title & Create button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-brand-slate-border shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-500" />
            Worker Management Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain municipal staff, auto-generate employee IDs, configure departments, and enable portal logins.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-emerald hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          Add New Worker
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
            <Check className="w-4 h-4 text-emerald-500" />
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
          <Search className="absolute left-3 top-2.5 h-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, EMP ID, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
          >
            <option value="all">All Departments</option>
            <option value="Sanitation Dept">Sanitation Dept</option>
            <option value="Waste Management Board">Waste Management Board</option>
            <option value="Health & Environment">Health & Environment</option>
            <option value="Municipal Administration">Municipal Administration</option>
          </select>
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active Workers</option>
            <option value="Inactive">Inactive Workers</option>
          </select>
        </div>
      </div>

      {/* Table / Grid for mobile */}
      <div className="bg-white rounded-3xl border border-brand-slate-border shadow-xs overflow-hidden">
        {isLoading && workers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading worker directory...</div>
        ) : filteredWorkers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No workers match the search parameters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Worker Info</th>
                  <th className="p-4">EMP ID</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Sector Duty</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {filteredWorkers.map((w) => (
                  <tr key={w.employeeId} className="hover:bg-slate-50/55 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <img 
                          src={w.profilePhoto} 
                          alt={w.fullName} 
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0" 
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="font-bold text-slate-800">{w.fullName}</p>
                          <p className="text-[10px] text-slate-400">@{w.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                        {w.employeeId}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="space-y-0.5 text-[11px]">
                        <p className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {w.email}</p>
                        <p className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {w.mobileNumber}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {w.areaZone}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold">
                        {w.department}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(w)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          w.status === "Active" 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {w.status === "Active" ? (
                          <><UserCheck className="w-3 h-3" /> Active</>
                        ) : (
                          <><UserX className="w-3 h-3" /> Inactive</>
                        )}
                      </button>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(w)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit Worker"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(w.employeeId, w.fullName)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove Worker"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Sheet Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-base font-extrabold text-slate-800">
                {editingWorker ? `Modify Field Officer: ${editingWorker.fullName}` : "Register Field Officer"}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dave Miller"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@portal.gov"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Date of Joining */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Date of Joining</label>
                  <input
                    type="date"
                    value={dateOfJoining}
                    onChange={(e) => setDateOfJoining(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Sanitation Dept">Sanitation Dept</option>
                    <option value="Waste Management Board">Waste Management Board</option>
                    <option value="Health & Environment">Health & Environment</option>
                    <option value="Municipal Administration">Municipal Administration</option>
                  </select>
                </div>

                {/* Area Zone */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Area / Zone Assignment</label>
                  <input
                    type="text"
                    value={areaZone}
                    onChange={(e) => setAreaZone(e.target.value)}
                    placeholder="e.g. Block-4 North Gate"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Zone A, Sanitation Depot Staff Quarters"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Profile Photo Url */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Profile Image URL</label>
                <input
                  type="url"
                  value={profilePhoto}
                  onChange={(e) => setProfilePhoto(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/photo-..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Key className="w-3 h-3 text-slate-400" /> Worker Account Login Settings
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">Username *</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. davem101"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 mb-0.5">Password *</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="e.g. Secret@123"
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">Status</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === "Active"}
                      onChange={() => setStatus("Active")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={status === "Inactive"}
                      onChange={() => setStatus("Inactive")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    Inactive
                  </label>
                </div>
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
                  {isLoading ? "Saving..." : editingWorker ? "Save Changes" : "Register Worker"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
