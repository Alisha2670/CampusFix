import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Complaint } from '../src/models/Complaint.js';
import { AiService } from '../src/services/ai.service.js';
import {
  CATEGORIES,
  PRIORITIES,
  COMPLAINT_STATUSES,
  AI_ANALYSIS_STATUSES,
} from '../src/constants/enums.js';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Complaint.deleteMany({});
});

describe('Node.js <-> AI Service Integration & Resiliency (Day 5)', () => {
  it('should gracefully degrade to Failed status without throwing when AI service is offline', async () => {
    // 1. Create a ticket in MongoDB
    const complaint = await Complaint.create({
      complaintId: 'FC-AI-TEST-01',
      studentId: new mongoose.Types.ObjectId(),
      title: 'Water tap leaking heavily',
      description: 'The restroom tap on floor 2 is gushing water constantly.',
      category: CATEGORIES.PLUMBING,
      priority: PRIORITIES.HIGH,
      status: COMPLAINT_STATUSES.SUBMITTED,
      location: { building: 'Science Block', floor: '2', room: 'Restroom' },
      aiAnalysis: {
        status: AI_ANALYSIS_STATUSES.PENDING,
        suggestedCategory: null,
        suggestedPriority: null,
        possibleDuplicates: [],
        analyzedAt: null,
        errorMessage: null,
      },
    });

    // 2. Invoke analyzeComplaintAsync (with AI service currently offline on port 8000)
    await AiService.analyzeComplaintAsync(complaint._id);

    // 3. Verify complaint is 100% preserved with aiAnalysis.status = Failed
    const updated = await Complaint.findById(complaint._id);
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe(COMPLAINT_STATUSES.SUBMITTED);
    expect(updated!.aiAnalysis.status).toBe(AI_ANALYSIS_STATUSES.FAILED);
    expect(updated!.aiAnalysis.errorMessage).toBeDefined();
  });

  it('should record completed AI analysis when AI returns valid payload', async () => {
    // 1. Create candidate and target complaints
    await Complaint.create({
      complaintId: 'FC-PREV-88',
      studentId: new mongoose.Types.ObjectId(),
      title: 'Water tap broken',
      description: 'Restroom tap dripping continuously.',
      category: CATEGORIES.PLUMBING,
      priority: PRIORITIES.MEDIUM,
      status: COMPLAINT_STATUSES.IN_PROGRESS,
      location: { building: 'Science Block', floor: '2', room: 'Restroom' },
    });

    const complaint = await Complaint.create({
      complaintId: 'FC-AI-TEST-02',
      studentId: new mongoose.Types.ObjectId(),
      title: 'Water pipe leaking',
      description: 'Restroom pipe leaking water under the sink.',
      category: CATEGORIES.PLUMBING,
      priority: PRIORITIES.MEDIUM,
      status: COMPLAINT_STATUSES.SUBMITTED,
      location: { building: 'Science Block', floor: '2', room: 'Restroom' },
      aiAnalysis: {
        status: AI_ANALYSIS_STATUSES.PENDING,
        suggestedCategory: null,
        suggestedPriority: null,
        possibleDuplicates: [],
        analyzedAt: null,
        errorMessage: null,
      },
    });

    // Mock global fetch to simulate successful FastAPI response
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        suggestedCategory: 'Plumbing',
        suggestedPriority: 'High',
        possibleDuplicates: [
          { complaintId: 'FC-PREV-88', similarity: 0.86 },
        ],
        confidence: 0.92,
      }),
    } as any);

    try {
      await AiService.analyzeComplaintAsync(complaint._id);

      const updated = await Complaint.findById(complaint._id);
      expect(updated).not.toBeNull();
      expect(updated!.aiAnalysis.status).toBe(AI_ANALYSIS_STATUSES.COMPLETED);
      expect(updated!.aiAnalysis.suggestedCategory).toBe('Plumbing');
      expect(updated!.aiAnalysis.suggestedPriority).toBe('High');
      expect(updated!.aiAnalysis.possibleDuplicates.length).toBe(1);
      expect(updated!.aiAnalysis.possibleDuplicates[0].complaintId).toBe('FC-PREV-88');
      expect(updated!.aiAnalysis.possibleDuplicates[0].similarity).toBe(0.86);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

