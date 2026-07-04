import { Severity, Status } from './types';

export const DEPARTMENTS = [
  'Sanitation Dept',
  'Public Works',
  'Health & Environment',
  'Municipal Administration',
  'Waste Management Board'
];

export const SEVERITIES: Record<Severity, { label: string; color: string; bgColor: string }> = {
  low: { label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  moderate: { label: 'Moderate', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  critical: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' }
};

export const STATUS_COLORS: Record<Status, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-400' },
  assigned: { label: 'Assigned', color: 'bg-blue-500' },
  dispatching: { label: 'Dispatching', color: 'bg-amber-500' },
  resolved: { label: 'Resolved', color: 'bg-emerald-500' },
  verified: { label: 'Verification', color: 'bg-slate-400' }
};

export const ZONES = [
  'Block-4 North Gate',
  'Park Street Crossing',
  'Sector 7 Metro Station',
  'Kovil Lane Commercial',
  'Main Market Square',
  'University Campus East',
  'Industrial Area Zone 2'
];
