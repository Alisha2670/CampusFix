import { z } from 'zod';
import { CATEGORIES, PRIORITIES, COMPLAINT_STATUSES } from '../constants/enums.js';

export const createComplaintSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  category: z.enum(
    Object.values(CATEGORIES) as [string, ...string[]],
    {
      errorMap: () => ({
        message: `Category must be one of: ${Object.values(CATEGORIES).join(', ')}`,
      }),
    }
  ),
  priority: z
    .enum(Object.values(PRIORITIES) as [string, ...string[]])
    .optional()
    .default(PRIORITIES.MEDIUM),
  location: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
      return val;
    },
    z.object({
      building: z.string({ required_error: 'Building is required' }).trim().min(1, 'Building cannot be empty'),
      floor: z.string({ required_error: 'Floor is required' }).trim().min(1, 'Floor cannot be empty'),
      room: z.string({ required_error: 'Room is required' }).trim().min(1, 'Room cannot be empty'),
    })
  ),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const updateComplaintStatusSchema = z.object({
  status: z.enum(
    Object.values(COMPLAINT_STATUSES) as [string, ...string[]],
    {
      errorMap: () => ({
        message: `Status must be one of: ${Object.values(COMPLAINT_STATUSES).join(', ')}`,
      }),
    }
  ),
  comment: z
    .string()
    .trim()
    .max(500, 'Comment cannot exceed 500 characters')
    .optional(),
});

export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;

export const adminUpdateComplaintSchema = z.object({
  category: z
    .enum(Object.values(CATEGORIES) as [string, ...string[]])
    .optional(),
  priority: z
    .enum(Object.values(PRIORITIES) as [string, ...string[]])
    .optional(),
  assignedDepartment: z
    .string()
    .trim()
    .max(100, 'Department name cannot exceed 100 characters')
    .nullable()
    .optional(),
  duplicateOf: z
    .string()
    .trim()
    .nullable()
    .optional(),
});

export type AdminUpdateComplaintInput = z.infer<typeof adminUpdateComplaintSchema>;


