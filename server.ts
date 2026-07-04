import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "public", "db_grievances.json");

interface GrievanceReport {
  id: string;
  location: string;
  department: string;
  description: string;
  severity: "low" | "moderate" | "critical";
  status: "new" | "assigned" | "dispatching" | "resolved" | "verified";
  citizenName: string;
  citizenEmail: string;
  timestamp: number;
  updatedAt: number;
  comments?: string[];
  proofUrl?: string;
  latitude?: number;
  longitude?: number;
}

// Initial demo grievances
const INITIAL_DEMO: GrievanceReport[] = [
  {
    id: "REP-001",
    location: "Block-4 North Gate",
    department: "Sanitation Dept",
    description: "Huge mountain of plastic garbage bags overflowing and blocking the walkway outside the gate. Bad smell is overwhelming.",
    severity: "critical",
    status: "dispatching",
    citizenName: "Alice Johnson",
    citizenEmail: "alice.johnson@edu.com",
    timestamp: Date.now() - 1000 * 60 * 14,
    updatedAt: Date.now() - 1000 * 60 * 14,
    latitude: 12.9845,
    longitude: 80.2201,
    proofUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80",
    comments: ["Assigned sanitation officer has been notified.", "Sanitation dispatch vehicle #402 dispatched."]
  },
  {
    id: "REP-002",
    location: "Park Street Crossing",
    department: "Waste Management Board",
    description: "The garbage bin near the intersection has been full for several days, domestic waste starting to spill on the grass park area.",
    severity: "moderate",
    status: "assigned",
    citizenName: "Bob Smith",
    citizenEmail: "bob.smith@outlook.com",
    timestamp: Date.now() - 1000 * 60 * 72,
    updatedAt: Date.now() - 1000 * 60 * 72,
    latitude: 12.9782,
    longitude: 80.2190,
    proofUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80",
    comments: ["Assigned to Zone 4 Waste Management unit."]
  },
  {
    id: "REP-003",
    location: "Sector 7 Metro Station",
    department: "Health & Environment",
    description: "Several stray dogs digging through organic wet garbage bags and scattering them all over the main metro entrance steps.",
    severity: "critical",
    status: "new",
    citizenName: "Charlie Brown",
    citizenEmail: "charlie@gmail.com",
    timestamp: Date.now() - 1000 * 60 * 150,
    updatedAt: Date.now() - 1000 * 60 * 150,
    latitude: 12.9899,
    longitude: 80.2265,
    proofUrl: "https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?auto=format&fit=crop&w=600&q=80",
    comments: []
  },
  {
    id: "REP-004",
    location: "Kovil Lane Commercial",
    department: "Municipal Administration",
    description: "Commercial cardboard boxes and hotel organic food leftovers combined into a giant pile that is attracting flies and vermin.",
    severity: "critical",
    status: "resolved",
    citizenName: "David Wilson",
    citizenEmail: "david.wilson@shop.com",
    timestamp: Date.now() - 1000 * 60 * 300,
    updatedAt: Date.now() - 1000 * 60 * 120,
    latitude: 12.9712,
    longitude: 80.2081,
    proofUrl: "https://images.unsplash.com/photo-1516996087931-5ae40155304e?auto=format&fit=crop&w=600&q=80",
    comments: ["Municipal service cleared the road successfully.", "Citizen verified & confirmed resolution."]
  }
];

// Load grievances from DB file or set defaults
function loadGrievances(): GrievanceReport[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read grievance DB file:", err);
  }
  // Store default ones initially
  saveGrievances(INITIAL_DEMO);
  return INITIAL_DEMO;
}

function saveGrievances(reports: GrievanceReport[]): void {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(reports, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to grievance DB file:", err);
  }
}

// Lazy initialization of Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
  }
  return aiClient;
}

// Additional Database paths
const WORKERS_DB = path.join(process.cwd(), "public", "db_workers.json");
const TASKS_DB = path.join(process.cwd(), "public", "db_assigned_tasks.json");
const TASK_HISTORY_DB = path.join(process.cwd(), "public", "db_task_history.json");
const NOTIFICATIONS_DB = path.join(process.cwd(), "public", "db_notifications.json");
const ACTIVITIES_DB = path.join(process.cwd(), "public", "db_worker_activity.json");

// Worker and Task Interfaces
interface Worker {
  id: string; // EMP-101
  fullName: string;
  employeeId: string;
  email: string;
  mobileNumber: string;
  address: string;
  profilePhoto: string;
  dateOfJoining: string;
  department: string;
  areaZone: string;
  username: string;
  passwordHash: string;
  status: 'Active' | 'Inactive';
}

interface AssignedTask {
  id: string; // TSK-001
  title: string;
  complaintId: string;
  complaintLocation: string;
  complaintDescription: string;
  workerId: string;
  workerName: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueDate: string;
  estimatedTime: string;
  remarks: string;
  status: 'Pending' | 'Assigned' | 'In Progress' | 'Completed' | 'Rejected' | 'Cancelled';
  rejectReason?: string;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  workNotes?: string;
  gpsLocation?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TaskStatusHistory {
  id: string;
  taskId: string;
  status: string;
  changedBy: string;
  remarks: string;
  timestamp: string;
}

interface WorkerNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface WorkerActivity {
  id: string;
  workerId: string;
  workerName: string;
  action: string;
  timestamp: string;
}

// Initial Mock Workers
const INITIAL_WORKERS: Worker[] = [
  {
    id: "EMP-101",
    fullName: "Dave Miller",
    employeeId: "EMP-101",
    email: "dave.miller@portal.gov",
    mobileNumber: "9876543210",
    address: "Zone A, Sanitation Depot",
    profilePhoto: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&w=150&q=80",
    dateOfJoining: "2024-01-15",
    department: "Sanitation Dept",
    areaZone: "Block-4 North Gate",
    username: "worker1",
    passwordHash: "Secret@123",
    status: "Active"
  },
  {
    id: "EMP-102",
    fullName: "Elena Rostova",
    employeeId: "EMP-102",
    email: "worker2@example.com",
    mobileNumber: "9876543211",
    address: "Zone B, Waste Center",
    profilePhoto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80",
    dateOfJoining: "2024-02-10",
    department: "Waste Management Board",
    areaZone: "Park Street Crossing",
    username: "worker2",
    passwordHash: "Worker@123",
    status: "Active"
  }
];

// Initial Mock Tasks
const INITIAL_TASKS: AssignedTask[] = [
  {
    id: "TSK-001",
    title: "Clear Block-4 Gate Overflow",
    complaintId: "REP-001",
    complaintLocation: "Block-4 North Gate",
    complaintDescription: "Huge mountain of plastic garbage bags overflowing and blocking the walkway outside the gate. Bad smell is overwhelming.",
    workerId: "EMP-101",
    workerName: "Dave Miller",
    priority: "Urgent",
    dueDate: "2026-07-10",
    estimatedTime: "3 hours",
    remarks: "Priority task. Heavy trucks needed.",
    status: "In Progress",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "TSK-002",
    title: "Litter sweep near crossroad bin",
    complaintId: "REP-002",
    complaintLocation: "Park Street Crossing",
    complaintDescription: "The garbage bin near the intersection has been full for several days, domestic waste starting to spill on the grass park area.",
    workerId: "EMP-102",
    workerName: "Elena Rostova",
    priority: "Medium",
    dueDate: "2026-07-12",
    estimatedTime: "1.5 hours",
    remarks: "Make sure grass area is completely swept clean.",
    status: "Assigned",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Load and Save helpers
function loadJSON<T>(filePath: string, initialData: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error(`Failed to read JSON DB file at ${filePath}:`, err);
  }
  saveJSON(filePath, initialData);
  return initialData;
}

function saveJSON<T>(filePath: string, data: T): void {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed to write JSON DB file at ${filePath}:`, err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Serve public database files and metadata statically
  app.use(express.static(path.join(process.cwd(), "public")));

  // Global list of reports (persisted in file)
  let activeReports = loadGrievances();

  // Load secondary DB tables
  let workers = loadJSON<Worker[]>(WORKERS_DB, INITIAL_WORKERS);
  let tasks = loadJSON<AssignedTask[]>(TASKS_DB, INITIAL_TASKS);
  let taskHistory = loadJSON<TaskStatusHistory[]>(TASK_HISTORY_DB, []);
  let notifications = loadJSON<WorkerNotification[]>(NOTIFICATIONS_DB, [
    {
      id: "NTF-001",
      userId: "worker1",
      title: "Welcome aboard!",
      message: "You have been registered as an official sanitation worker.",
      read: false,
      createdAt: new Date().toISOString()
    }
  ]);
  let activities = loadJSON<WorkerActivity[]>(ACTIVITIES_DB, []);

  // API Endpoints
  // 1. Get all reports
  app.get("/api/reports", (req, res) => {
    res.json(activeReports);
  });

  // 2. Submit new report with support for optional AI auto-categorization
  app.post("/api/reports", async (req, res) => {
    try {
      const { 
        location, 
        department, 
        description, 
        severity, 
        citizenName, 
        citizenEmail,
        proofUrl,
        latitude,
        longitude 
      } = req.body;

      if (!description || !location) {
        return res.status(400).json({ error: "Description and Location are required." });
      }

      const id = `REP-${String(Math.floor(Math.random() * 900) + 100)}`;
      const timestamp = Date.now();

      const newReport: GrievanceReport = {
        id,
        location,
        department: department || "Sanitation Dept",
        description,
        severity: severity || "moderate",
        status: "new",
        citizenName: citizenName || "Anonymous Citizen",
        citizenEmail: citizenEmail || "anonymous@portal.gov",
        timestamp,
        updatedAt: timestamp,
        comments: [],
        proofUrl: proofUrl || undefined,
        latitude: latitude || 12.97 + (Math.random() - 0.5) * 0.04,
        longitude: longitude || 80.21 + (Math.random() - 0.5) * 0.04
      };

      activeReports.unshift(newReport);
      saveGrievances(activeReports);
      res.status(201).json(newReport);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Update report status / department / comment
  app.patch("/api/reports/:id", (req, res) => {
    const { id } = req.params;
    const { status, department, severity, comment } = req.body;

    const reportIndex = activeReports.findIndex(r => r.id === id);
    if (reportIndex === -1) {
      return res.status(404).json({ error: "complaint report not found" });
    }

    const report = activeReports[reportIndex];
    if (status) report.status = status;
    if (department) report.department = department;
    if (severity) report.severity = severity;
    
    if (comment) {
      if (!report.comments) report.comments = [];
      report.comments.push(comment);
    }

    report.updatedAt = Date.now();
    activeReports[reportIndex] = report;
    saveGrievances(activeReports);

    res.json(report);
  });

  // 4. AI-powered description categorization
  app.post("/api/gemini/categorize", async (req, res) => {
    const { description } = req.body;
    if (!description) {
      return res.status(400).json({ error: "Grievance text description is required." });
    }

    const client = getGeminiClient();
    if (!client) {
      console.warn("Gemini API key is not set. Falling back to local heuristic categorization.");
      // Soft local heuristic in case key isn't provided
      const text = description.toLowerCase();
      let severity: "low" | "moderate" | "critical" = "moderate";
      let department = "Sanitation Dept";
      let suggestedLocation = "Block-4 North Gate";

      if (text.includes("block") || text.includes("gate")) suggestedLocation = "Block-4 North Gate";
      else if (text.includes("metro") || text.includes("station")) suggestedLocation = "Sector 7 Metro Station";
      else if (text.includes("park") || text.includes("crossing")) suggestedLocation = "Park Street Crossing";
      else if (text.includes("kovil") || text.includes("commercial")) suggestedLocation = "Kovil Lane Commercial";

      if (text.includes("emergency") || text.includes("critical") || text.includes("mountain") || text.includes("smell") || text.includes("choke") || text.includes("dogs") || text.includes("stray")) {
        severity = "critical";
      } else if (text.includes("minor") || text.includes("empty") || text.includes("regular")) {
        severity = "low";
      }

      if (text.includes("health") || text.includes("toxic") || text.includes("medical") || text.includes("smell")) {
        department = "Health & Environment";
      } else if (text.includes("commercial") || text.includes("shop") || text.includes("cardboard")) {
        department = "Municipal Administration";
      } else if (text.includes("boards") || text.includes("street") || text.includes("road")) {
        department = "Waste Management Board";
      }

      const summary = description.split(" ").slice(0, 8).join(" ") + "(Local Smart Match)";

      return res.json({
        severity,
        department,
        suggestedLocation,
        summary,
        aiUsed: false
      });
    }

    try {
      // Structured AI generation using gemini-3.5-flash
      const prompt = `
        Analyze the following garbage overflow grievance report filed by a citizen.
        Determine:
        1. Recommended department category. Must be exactly one of: ["Sanitation Dept", "Waste Management Board", "Health & Environment", "Municipal Administration"]
        2. Gravity Severity. Must be exactly one of: ["low", "moderate", "critical"]
        3. Match to best known administrative location. Must be exactly one of: ["Block-4 North Gate", "Park Street Crossing", "Sector 7 Metro Station", "Kovil Lane Commercial", "Main Market Square", "University Campus East"]
        4. Emergency Summary. A 4-8 word extremely concise summary label.

        Let's classify this description:
        "${description}"

        Return ONLY a raw, valid JSON object with matching structure. Do not wrap in markdown or backticks.
        JSON format:
        {
          "department": "Department Name",
          "severity": "severity_tag",
          "suggestedLocation": "Location Name",
          "summary": "Summary text description"
        }
      `;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "{}";
      const cleaned = text.trim();
      const parsed = JSON.parse(cleaned);

      res.json({
        ...parsed,
        aiUsed: true
      });
    } catch (error: any) {
      console.error("AI Categorization Engine Error:", error);
      res.status(500).json({ error: "AI categorizer failed to parse description, using fallbacks." });
    }
  });

  // 5. Delete general reports (Admin capability)
  app.delete("/api/reports/:id", (req, res) => {
    const { id } = req.params;
    const initialLen = activeReports.length;
    activeReports = activeReports.filter(r => r.id !== id);
    if (activeReports.length === initialLen) {
      return res.status(404).json({ error: "complaint report not found" });
    }
    saveGrievances(activeReports);
    res.json({ success: true, message: `Report ${id} permanently discarded.` });
  });

  // ==========================================
  // AUTHENTICATION ENDPOINT
  // ==========================================
  app.post("/api/auth/login", (req, res) => {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: "Username/Email and Password are required." });
    }

    // 1. Admin login
    if (usernameOrEmail === "admin@example.com" && password === "Admin@123") {
      return res.json({
        user: {
          name: "Administrator",
          email: "admin@example.com",
          role: "admin"
        }
      });
    }

    // 2. Worker login
    const worker = workers.find(
      w => (w.email.toLowerCase() === usernameOrEmail.toLowerCase() || w.username.toLowerCase() === usernameOrEmail.toLowerCase()) && 
      w.passwordHash === password
    );

    if (worker) {
      if (worker.status !== "Active") {
        return res.status(403).json({ error: "This worker account is currently inactive." });
      }
      return res.json({
        user: {
          name: worker.fullName,
          email: worker.email,
          role: "worker",
          workerId: worker.employeeId
        }
      });
    }

    // 3. Fallback/Citizen login
    // If it looks like an email and doesn't match above, it's just a citizen login (no password enforced to maintain existing flow)
    const citizenName = usernameOrEmail.split("@")[0];
    const citizenEmail = usernameOrEmail.includes("@") ? usernameOrEmail : `${usernameOrEmail}@portal.gov`;
    return res.json({
      user: {
        name: citizenName.charAt(0).toUpperCase() + citizenName.slice(1),
        email: citizenEmail,
        role: "citizen"
      }
    });
  });

  // ==========================================
  // WORKER MANAGEMENT ENDPOINTS
  // ==========================================
  app.get("/api/workers", (req, res) => {
    res.json(workers);
  });

  app.post("/api/workers", (req, res) => {
    const { 
      fullName, email, mobileNumber, address, profilePhoto, 
      dateOfJoining, department, areaZone, username, password 
    } = req.body;

    if (!fullName || !email || !mobileNumber || !username || !password) {
      return res.status(400).json({ error: "Full Name, Email, Mobile, Username, and Password are required." });
    }

    // Prevent duplicate email
    if (workers.some(w => w.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "A worker with this email already exists." });
    }

    // Prevent duplicate username
    if (workers.some(w => w.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: "This username is already taken." });
    }

    // Generate unique employee ID
    let nextIdNum = 103;
    while (workers.some(w => w.employeeId === `EMP-${nextIdNum}`)) {
      nextIdNum++;
    }
    const employeeId = `EMP-${nextIdNum}`;

    const newWorker: Worker = {
      id: employeeId,
      fullName,
      employeeId,
      email,
      mobileNumber,
      address: address || "",
      profilePhoto: profilePhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      dateOfJoining: dateOfJoining || new Date().toISOString().split("T")[0],
      department: department || "Sanitation Dept",
      areaZone: areaZone || "Block-4 North Gate",
      username,
      passwordHash: password, // Store password
      status: "Active"
    };

    workers.push(newWorker);
    saveJSON(WORKERS_DB, workers);

    // Create Notification
    const notifId = `NTF-${Date.now()}`;
    notifications.push({
      id: notifId,
      userId: username,
      title: "Welcome to Government Grievance Hub!",
      message: `Your worker account has been successfully created. Employee ID: ${employeeId}`,
      read: false,
      createdAt: new Date().toISOString()
    });
    saveJSON(NOTIFICATIONS_DB, notifications);

    res.status(201).json(newWorker);
  });

  app.put("/api/workers/:id", (req, res) => {
    const { id } = req.params;
    const { 
      fullName, email, mobileNumber, address, profilePhoto, 
      dateOfJoining, department, areaZone, username, password, status 
    } = req.body;

    const workerIndex = workers.findIndex(w => w.employeeId === id);
    if (workerIndex === -1) {
      return res.status(404).json({ error: "Worker not found." });
    }

    // Prevent duplicate email against other workers
    if (email && workers.some(w => w.employeeId !== id && w.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({ error: "Another worker is already registered with this email." });
    }

    // Prevent duplicate username
    if (username && workers.some(w => w.employeeId !== id && w.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: "This username is already taken by another worker." });
    }

    const worker = workers[workerIndex];
    if (fullName) worker.fullName = fullName;
    if (email) worker.email = email;
    if (mobileNumber) worker.mobileNumber = mobileNumber;
    if (address !== undefined) worker.address = address;
    if (profilePhoto) worker.profilePhoto = profilePhoto;
    if (dateOfJoining) worker.dateOfJoining = dateOfJoining;
    if (department) worker.department = department;
    if (areaZone) worker.areaZone = areaZone;
    if (username) worker.username = username;
    if (password) worker.passwordHash = password;
    if (status) worker.status = status;

    workers[workerIndex] = worker;
    saveJSON(WORKERS_DB, workers);
    res.json(worker);
  });

  app.patch("/api/workers/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== "Active" && status !== "Inactive") {
      return res.status(400).json({ error: "Invalid status value. Must be 'Active' or 'Inactive'." });
    }

    const workerIndex = workers.findIndex(w => w.employeeId === id);
    if (workerIndex === -1) {
      return res.status(404).json({ error: "Worker not found." });
    }

    workers[workerIndex].status = status;
    saveJSON(WORKERS_DB, workers);
    res.json(workers[workerIndex]);
  });

  app.delete("/api/workers/:id", (req, res) => {
    const { id } = req.params;
    const initialLen = workers.length;
    workers = workers.filter(w => w.employeeId !== id);
    if (workers.length === initialLen) {
      return res.status(404).json({ error: "Worker not found." });
    }
    saveJSON(WORKERS_DB, workers);
    res.json({ success: true, message: `Worker ${id} successfully removed.` });
  });

  // ==========================================
  // WORK ASSIGNMENT ENDPOINTS
  // ==========================================
  app.get("/api/tasks", (req, res) => {
    res.json(tasks);
  });

  app.post("/api/tasks", (req, res) => {
    const { 
      title, complaintId, complaintLocation, complaintDescription, 
      workerId, priority, dueDate, estimatedTime, remarks 
    } = req.body;

    if (!title || !complaintId || !workerId) {
      return res.status(400).json({ error: "Task Title, Complaint ID, and Worker ID are required." });
    }

    // Find the worker
    const worker = workers.find(w => w.employeeId === workerId);
    if (!worker) {
      return res.status(404).json({ error: "Selected worker not found." });
    }

    if (worker.status !== "Active") {
      return res.status(400).json({ error: "Cannot assign task to an Inactive worker." });
    }

    // Find the complaint
    const complaintIndex = activeReports.findIndex(r => r.id === complaintId);
    if (complaintIndex === -1) {
      return res.status(404).json({ error: "Complaint report not found." });
    }

    const complaint = activeReports[complaintIndex];
    if (complaint.status === "resolved" || complaint.status === "verified") {
      return res.status(400).json({ error: "Cannot assign a completed or resolved complaint." });
    }

    // Create unique Task ID
    let nextTaskId = 101;
    while (tasks.some(t => t.id === `TSK-${nextTaskId}`)) {
      nextTaskId++;
    }
    const taskId = `TSK-${nextTaskId}`;

    const newTask: AssignedTask = {
      id: taskId,
      title,
      complaintId,
      complaintLocation: complaintLocation || complaint.location,
      complaintDescription: complaintDescription || complaint.description,
      workerId,
      workerName: worker.fullName,
      priority: priority || "Medium",
      dueDate: dueDate || new Date().toISOString().split("T")[0],
      estimatedTime: estimatedTime || "2 hours",
      remarks: remarks || "",
      status: "Assigned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.push(newTask);
    saveJSON(TASKS_DB, tasks);

    // Update the complaint report's status to 'assigned' and add comment
    complaint.status = "assigned";
    if (!complaint.comments) complaint.comments = [];
    complaint.comments.push(`Task assigned to field worker ${worker.fullName} (${workerId}).`);
    complaint.updatedAt = Date.now();
    activeReports[complaintIndex] = complaint;
    saveGrievances(activeReports);

    // Create Status History entry
    taskHistory.push({
      id: `HST-${Date.now()}-1`,
      taskId,
      status: "Assigned",
      changedBy: "Admin",
      remarks: "Initial task assignment to worker.",
      timestamp: new Date().toISOString()
    });
    saveJSON(TASK_HISTORY_DB, taskHistory);

    // Create activity log
    activities.push({
      id: `ACT-${Date.now()}-1`,
      workerId,
      workerName: worker.fullName,
      action: `Assigned task ${taskId}: "${title}"`,
      timestamp: new Date().toISOString()
    });
    saveJSON(ACTIVITIES_DB, activities);

    // Notification for worker
    notifications.push({
      id: `NTF-${Date.now()}-2`,
      userId: worker.username,
      title: "New Task Assigned",
      message: `You have been assigned task: "${title}". Due: ${newTask.dueDate}`,
      read: false,
      createdAt: new Date().toISOString()
    });
    saveJSON(NOTIFICATIONS_DB, notifications);

    res.status(201).json(newTask);
  });

  app.put("/api/tasks/:id", (req, res) => {
    const { id } = req.params;
    const { 
      title, workerId, priority, dueDate, estimatedTime, remarks 
    } = req.body;

    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }

    const task = tasks[taskIndex];
    let workerChanged = false;
    let oldWorkerId = task.workerId;
    let newWorker = null;

    if (workerId && workerId !== task.workerId) {
      newWorker = workers.find(w => w.employeeId === workerId);
      if (!newWorker) {
        return res.status(404).json({ error: "Selected worker not found." });
      }
      if (newWorker.status !== "Active") {
        return res.status(400).json({ error: "Cannot assign task to an Inactive worker." });
      }
      workerChanged = true;
    }

    if (title) task.title = title;
    if (priority) task.priority = priority;
    if (dueDate) task.dueDate = dueDate;
    if (estimatedTime) task.estimatedTime = estimatedTime;
    if (remarks !== undefined) task.remarks = remarks;

    if (workerChanged && newWorker) {
      // Reassign to new worker
      const oldWorkerName = task.workerName;
      task.workerId = workerId;
      task.workerName = newWorker.fullName;
      task.status = "Assigned"; // Reset back to Assigned status for the new worker

      // Add to status history
      taskHistory.push({
        id: `HST-${Date.now()}-2`,
        taskId: id,
        status: "Assigned",
        changedBy: "Admin",
        remarks: `Reassigned from ${oldWorkerName} to ${newWorker.fullName}.`,
        timestamp: new Date().toISOString()
      });

      // Notification to old worker
      const oldWorkerObj = workers.find(w => w.employeeId === oldWorkerId);
      if (oldWorkerObj) {
        notifications.push({
          id: `NTF-${Date.now()}-3`,
          userId: oldWorkerObj.username,
          title: "Task Reassigned",
          message: `Task "${task.title}" has been reassigned to another worker.`,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      // Notification to new worker
      notifications.push({
        id: `NTF-${Date.now()}-4`,
        userId: newWorker.username,
        title: "New Task Assigned (Reassignment)",
        message: `You have been reassigned task: "${task.title}".`,
        read: false,
        createdAt: new Date().toISOString()
      });

      // Activity log
      activities.push({
        id: `ACT-${Date.now()}-2`,
        workerId: newWorker.employeeId,
        workerName: newWorker.fullName,
        action: `Reassigned task ${id} from ${oldWorkerName}`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Just normal update
      taskHistory.push({
        id: `HST-${Date.now()}-2`,
        taskId: id,
        status: task.status,
        changedBy: "Admin",
        remarks: "Task details updated by Admin.",
        timestamp: new Date().toISOString()
      });
    }

    task.updatedAt = new Date().toISOString();
    tasks[taskIndex] = task;

    saveJSON(TASKS_DB, tasks);
    saveJSON(TASK_HISTORY_DB, taskHistory);
    saveJSON(NOTIFICATIONS_DB, notifications);
    saveJSON(ACTIVITIES_DB, activities);

    res.json(task);
  });

  // Worker task response: Accept, Reject, Start, Complete
  app.patch("/api/tasks/:id/status", (req, res) => {
    const { id } = req.params;
    const { status, remarks, rejectReason, beforeImageUrl, afterImageUrl, workNotes, gpsLocation } = req.body;

    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) {
      return res.status(404).json({ error: "Task not found." });
    }

    const task = tasks[taskIndex];
    const oldStatus = task.status;
    task.status = status;
    task.updatedAt = new Date().toISOString();

    if (status === "Rejected") {
      task.rejectReason = rejectReason || "No reason specified";
    }
    if (beforeImageUrl) task.beforeImageUrl = beforeImageUrl;
    if (afterImageUrl) task.afterImageUrl = afterImageUrl;
    if (workNotes) task.workNotes = workNotes;
    if (gpsLocation) task.gpsLocation = gpsLocation;

    if (status === "Completed") {
      task.completedAt = new Date().toISOString();
      
      // Auto resolve the matching complaint report
      const complaintIndex = activeReports.findIndex(r => r.id === task.complaintId);
      if (complaintIndex !== -1) {
        activeReports[complaintIndex].status = "resolved";
        if (!activeReports[complaintIndex].comments) activeReports[complaintIndex].comments = [];
        activeReports[complaintIndex].comments.push(`Resolved by worker ${task.workerName}. Notes: ${workNotes || "None"}`);
        activeReports[complaintIndex].updatedAt = Date.now();
        saveGrievances(activeReports);
      }
    }

    tasks[taskIndex] = task;
    saveJSON(TASKS_DB, tasks);

    // Save history
    taskHistory.push({
      id: `HST-${Date.now()}-3`,
      taskId: id,
      status,
      changedBy: task.workerName,
      remarks: remarks || rejectReason || `Status changed from ${oldStatus} to ${status}.`,
      timestamp: new Date().toISOString()
    });
    saveJSON(TASK_HISTORY_DB, taskHistory);

    // Save activity log
    activities.push({
      id: `ACT-${Date.now()}-3`,
      workerId: task.workerId,
      workerName: task.workerName,
      action: `Updated task ${id} status to: "${status}"`,
      timestamp: new Date().toISOString()
    });
    saveJSON(ACTIVITIES_DB, activities);

    // Create Admin notification
    notifications.push({
      id: `NTF-${Date.now()}-5`,
      userId: "admin",
      title: `Task ${status}`,
      message: `Worker ${task.workerName} updated task "${task.title}" to ${status}.${rejectReason ? ' Reason: ' + rejectReason : ''}`,
      read: false,
      createdAt: new Date().toISOString()
    });
    saveJSON(NOTIFICATIONS_DB, notifications);

    res.json(task);
  });

  // ==========================================
  // NOTIFICATIONS & UTILITY ENDPOINTS
  // ==========================================
  app.get("/api/notifications", (req, res) => {
    const { userId } = req.query;
    if (userId) {
      // Return specific notifications for user (case insensitive) or general
      const filtered = notifications.filter(
        n => n.userId.toLowerCase() === String(userId).toLowerCase() || n.userId === "all"
      );
      return res.json(filtered);
    }
    res.json(notifications);
  });

  app.post("/api/notifications/mark-read", (req, res) => {
    const { userId, notificationId } = req.body;

    if (notificationId) {
      const idx = notifications.findIndex(n => n.id === notificationId);
      if (idx !== -1) {
        notifications[idx].read = true;
      }
    } else if (userId) {
      notifications.forEach((n, idx) => {
        if (n.userId.toLowerCase() === String(userId).toLowerCase() || n.userId === "all") {
          notifications[idx].read = true;
        }
      });
    } else {
      notifications.forEach((n, idx) => {
        notifications[idx].read = true;
      });
    }

    saveJSON(NOTIFICATIONS_DB, notifications);
    res.json({ success: true });
  });

  app.get("/api/task-history", (req, res) => {
    res.json(taskHistory);
  });

  app.get("/api/worker-activities", (req, res) => {
    res.json(activities);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production build delivery
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
}

startServer();
