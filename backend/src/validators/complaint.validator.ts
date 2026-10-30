import { z } from 'zod';
import { CATEGORIES, PRIORITIES } from '../constants/enums.js';

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

