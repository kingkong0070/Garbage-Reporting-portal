export interface User {
  name: string;
  email: string;
  role?: 'citizen' | 'admin' | 'worker';
  workerId?: string;
}

export type Severity = 'low' | 'moderate' | 'critical';
export type Status = 'new' | 'assigned' | 'dispatching' | 'resolved' | 'verified';

export interface GrievanceReport {
  id: string;
  location: string;
  department: string;
  description: string;
  severity: Severity;
  status: Status;
  citizenName: string;
  citizenEmail?: string;
  timestamp: number;
  updatedAt: number;
  latitude?: number;
  longitude?: number;
  comments?: string[];
  proofUrl?: string;
}

export interface Stats {
  total: number;
  pending: number;
  avgResolution: string;
  completionRate: string;
}

export interface Worker {
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

export interface AssignedTask {
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

export interface TaskStatusHistory {
  id: string;
  taskId: string;
  status: string;
  changedBy: string;
  remarks: string;
  timestamp: string;
}

export interface WorkerNotification {
  id: string;
  userId: string; // worker username or 'admin' or 'all'
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface WorkerActivity {
  id: string;
  workerId: string;
  workerName: string;
  action: string;
  timestamp: string;
}
