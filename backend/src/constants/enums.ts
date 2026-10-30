export const ROLES = {
  STUDENT: 'student',
  ADMIN: 'admin',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const CATEGORIES = {
  ELECTRICAL: 'Electrical',
  PLUMBING: 'Plumbing',
  IT_SUPPORT: 'IT Support',
  HOUSEKEEPING: 'Housekeeping',
  INFRASTRUCTURE: 'Infrastructure',
} as const;

export type Category = (typeof CATEGORIES)[keyof typeof CATEGORIES];

export const PRIORITIES = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
} as const;

export type Priority = (typeof PRIORITIES)[keyof typeof PRIORITIES];

export const COMPLAINT_STATUSES = {
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
  DUPLICATE: 'Duplicate',
} as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[keyof typeof COMPLAINT_STATUSES];

export const AI_ANALYSIS_STATUSES = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
} as const;

export type AiAnalysisStatus = (typeof AI_ANALYSIS_STATUSES)[keyof typeof AI_ANALYSIS_STATUSES];
