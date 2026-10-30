# FixMyCampus — Database Schema Contract

This document specifies the MongoDB collections, fields, types, indexes, and relationship constraints.

---

## 1. Universal Enums (Master Constants)

These values are strictly identical across React, Node.js, MongoDB, and Python:

```typescript
export type Role = 'student' | 'admin';

export type Category = 
  | 'Electrical' 
  | 'Plumbing' 
  | 'IT Support' 
  | 'Housekeeping' 
  | 'Infrastructure';

export type Priority = 
  | 'Low' 
  | 'Medium' 
  | 'High' 
  | 'Urgent';

export type ComplaintStatus = 
  | 'Submitted' 
  | 'Acknowledged' 
  | 'Assigned' 
  | 'In Progress' 
  | 'Resolved' 
  | 'Rejected' 
  | 'Duplicate';

export type AiAnalysisStatus = 
  | 'Pending' 
  | 'Processing' 
  | 'Completed' 
  | 'Failed';
```

---

## 2. Collections Specification

### 2.1 `users` Collection

Stores authentication credentials and profiles for students and campus administrators.

```json
{
  "_id": "ObjectId",
  "name": "String (required, trimmed)",
  "email": "String (required, unique, lowercase, trimmed, indexed)",
  "passwordHash": "String (required, bcrypt hash, 10 rounds)",
  "role": "String (required, enum: ['student', 'admin'], default: 'student')",
  "createdAt": "Date (timestamp)",
  "updatedAt": "Date (timestamp)"
}
```

- **Indexes:**
  - `{ email: 1 }` (unique constraint)
- **Security Invariant:** Public registration `/api/auth/register` strictly hardcodes `role: 'student'`. Admin creation requires an administrative invitation or a dedicated CLI seed script.

---

### 2.2 `complaints` Collection

Single source of truth for all campus complaints, location data, image URLs, audit history, and AI suggestions.

```json
{
  "_id": "ObjectId",
  "complaintId": "String (required, unique, indexed, e.g. 'FC1024')",
  "studentId": "ObjectId (required, ref: 'users', indexed)",
  "title": "String (required, min 5, max 100, trimmed)",
  "description": "String (required, min 10, max 2000, trimmed)",
  "location": {
    "building": "String (required)",
    "floor": "String (required)",
    "room": "String (required)"
  },
  "imageUrl": "String (optional, default: null, Cloudinary secure URL)",
  "category": "String (required, enum: Category)",
  "priority": "String (required, enum: Priority, default: 'Medium')",
  "status": "String (required, enum: ComplaintStatus, default: 'Submitted', indexed)",
  "assignedDepartment": "String (optional, default: null)",
  "duplicateOf": "ObjectId (optional, ref: 'complaints', default: null)",
  "aiAnalysis": {
    "status": "String (required, enum: AiAnalysisStatus, default: 'Pending')",
    "suggestedCategory": "String (optional, enum: Category, default: null)",
    "suggestedPriority": "String (optional, enum: Priority, default: null)",
    "possibleDuplicates": [
      {
        "complaintId": "String (required)",
        "similarity": "Number (required, range: 0.0 to 1.0)"
      }
    ],
    "analyzedAt": "Date (optional, default: null)",
    "errorMessage": "String (optional, default: null)"
  },
  "statusHistory": [
    {
      "status": "String (required, enum: ComplaintStatus)",
      "changedBy": "ObjectId (required, ref: 'users')",
      "comment": "String (optional)",
      "timestamp": "Date (required, default: Date.now)"
    }
  ],
  "createdAt": "Date (timestamp, indexed)",
  "updatedAt": "Date (timestamp)"
}
```

- **Indexes:**
  - `{ complaintId: 1 }` (unique)
  - `{ studentId: 1, createdAt: -1 }` (fast query for student portal)
  - `{ status: 1, category: 1, priority: 1 }` (compound index for admin filtering)
  - `{ "location.building": 1, category: 1 }` (fast lookup for duplicate candidate pre-filtering)

- **Why `statusHistory` is embedded:**
  The lifecycle of a single complaint has a bounded number of transitions ($\le 10$). Embedding eliminates unnecessary joins, ensures atomic status transitions, and preserves historical context in a single read.

---

### 2.3 `notifications` Collection

In-app alerts delivered to students and administrators.

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (required, ref: 'users', indexed)",
  "complaintId": "ObjectId (required, ref: 'complaints')",
  "message": "String (required)",
  "isRead": "Boolean (required, default: false, indexed)",
  "createdAt": "Date (timestamp, default: Date.now, indexed)"
}
```

- **Indexes:**
  - `{ userId: 1, isRead: 1, createdAt: -1 }` (optimal index for rendering unread notification bell)

