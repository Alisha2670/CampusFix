import { COMPLAINT_STATUSES, ComplaintStatus } from '../constants/enums.js';

/**
 * Complaint Lifecycle State Machine Transition Rules
 *
 * Strict progression:
 * Submitted -> Acknowledged / Duplicate / Rejected
 * Acknowledged -> Assigned / Duplicate / Rejected
 * Assigned -> In Progress / Duplicate / Rejected
 * In Progress -> Resolved / Duplicate / Rejected
 * Resolved, Duplicate, Rejected -> Terminal
 */
export const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  [COMPLAINT_STATUSES.SUBMITTED]: [
    COMPLAINT_STATUSES.ACKNOWLEDGED,
    COMPLAINT_STATUSES.DUPLICATE,
    COMPLAINT_STATUSES.REJECTED,
  ],
  [COMPLAINT_STATUSES.ACKNOWLEDGED]: [
    COMPLAINT_STATUSES.ASSIGNED,
    COMPLAINT_STATUSES.DUPLICATE,
    COMPLAINT_STATUSES.REJECTED,
  ],
  [COMPLAINT_STATUSES.ASSIGNED]: [
    COMPLAINT_STATUSES.IN_PROGRESS,
    COMPLAINT_STATUSES.DUPLICATE,
    COMPLAINT_STATUSES.REJECTED,
  ],
  [COMPLAINT_STATUSES.IN_PROGRESS]: [
    COMPLAINT_STATUSES.RESOLVED,
    COMPLAINT_STATUSES.DUPLICATE,
    COMPLAINT_STATUSES.REJECTED,
  ],
  [COMPLAINT_STATUSES.RESOLVED]: [],
  [COMPLAINT_STATUSES.DUPLICATE]: [],
  [COMPLAINT_STATUSES.REJECTED]: [],
};

export class StateMachineService {
  /**
   * Check if a proposed status transition is permitted by the state machine
   */
  static isValidTransition(currentStatus: ComplaintStatus, newStatus: ComplaintStatus): boolean {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  /**
   * Return the list of valid next statuses for a given state
   */
  static getAllowedTransitions(currentStatus: ComplaintStatus): ComplaintStatus[] {
    return VALID_TRANSITIONS[currentStatus] || [];
  }
}

