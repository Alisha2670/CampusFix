import { Types } from 'mongoose';
import { Complaint } from '../models/Complaint.js';
import { ENV } from '../config/env.js';
import { AI_ANALYSIS_STATUSES } from '../constants/enums.js';

export interface AiAnalysisResult {
  suggestedCategory: string;
  suggestedPriority: string;
  possibleDuplicates: Array<{
    complaintId: string;
    similarity: number;
  }>;
  confidence: number;
}

export class AiService {
  private static readonly TIMEOUT_MS = 3000;

  /**
   * Asynchronously analyze a complaint with the Python FastAPI microservice.
   * Enforces 3000ms timeout budget and graceful fallback on failure.
   */
  static async analyzeComplaintAsync(complaintObjectId: string | Types.ObjectId): Promise<void> {
    try {
      const complaint = await Complaint.findById(complaintObjectId);
      if (!complaint) return;

      // Find candidates in the same building or recent active complaints
      const candidates = await Complaint.find({
        _id: { $ne: complaint._id },
        'location.building': complaint.location.building,
        status: { $in: ['Submitted', 'Acknowledged', 'Assigned', 'In Progress'] },
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('complaintId title description category status');

      const payload = {
        complaint: {
          complaintId: complaint.complaintId,
          title: complaint.title,
          description: complaint.description,
          category: complaint.category,
          location: complaint.location,
        },
        candidates: candidates.map((c) => ({
          complaintId: c.complaintId,
          title: c.title,
          description: c.description,
          category: c.category,
          status: c.status,
        })),
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(`${ENV.AI_SERVICE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = (await response.json()) as AiAnalysisResult;
        complaint.aiAnalysis = {
          status: AI_ANALYSIS_STATUSES.COMPLETED,
          suggestedCategory: data.suggestedCategory as any,
          suggestedPriority: data.suggestedPriority as any,
          possibleDuplicates: data.possibleDuplicates || [],
          analyzedAt: new Date(),
          errorMessage: null,
        };
        await complaint.save();
      }
    } catch (error: any) {
      // Graceful degradation: Record failure without throwing or blocking
      try {
        const complaint = await Complaint.findById(complaintObjectId);
        if (complaint) {
          complaint.aiAnalysis = {
            status: AI_ANALYSIS_STATUSES.FAILED,
            suggestedCategory: null,
            suggestedPriority: null,
            possibleDuplicates: [],
            analyzedAt: new Date(),
            errorMessage: error.name === 'AbortError' ? 'AI service timed out (>3000ms)' : (error.message || 'AI service unavailable'),
          };
          await complaint.save();
        }
      } catch (innerError) {
        console.error('[AiService] Failed to persist fallback state:', innerError);
      }
    }
  }
}

