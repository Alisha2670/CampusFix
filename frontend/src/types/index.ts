export type Role = 'student' | 'admin';

export type Category =
  | 'Electrical'
  | 'Plumbing'
  | 'IT Support'
  | 'Housekeeping'
  | 'Infrastructure';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type ComplaintStatus =
  | 'Submitted'
  | 'Acknowledged'
  | 'Assigned'
  | 'In Progress'
  | 'Resolved'
  | 'Rejected'
  | 'Duplicate';

export type AiAnalysisStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface ILocation {
  building: string;
  floor: string;
  room: string;
}

export interface IStatusHistoryItem {
  status: ComplaintStatus;
  changedBy: string;
  comment?: string;
  timestamp: string;
}

export interface IPossibleDuplicate {
  complaintId: string;
  similarity: number;
}

export interface IAiAnalysis {
  status: AiAnalysisStatus;
  suggestedCategory: Category | null;
  suggestedPriority: Priority | null;
  possibleDuplicates: IPossibleDuplicate[];
  analyzedAt: string | null;
  errorMessage?: string | null;
}

export interface IComplaint {
  id: string;
  complaintId: string;
  studentId: string | IUser;
  title: string;
  description: string;
  location: ILocation;
  imageUrl: string | null;
  category: Category;
  priority: Priority;
  status: ComplaintStatus;
  assignedDepartment: string | null;
  duplicateOf: string | null;
  aiAnalysis: IAiAnalysis;
  statusHistory: IStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface INotification {
  id: string;
  userId: string;
  complaintId: {
    id: string;
    complaintId: string;
    title: string;
    status: ComplaintStatus;
  } | string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: string;
    details?: any;
  };
}

