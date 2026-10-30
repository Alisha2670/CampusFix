# FixMyCampus — API Contract Specification

Base URL: `/api`  
Standard format: JSON  
Authentication: JWT via HTTP-only Cookie (`token`)

---

## 1. Standard Response Envelopes

### 1.1 Success Envelope
```json
{
  "success": true,
  "message": "Human readable success message",
  "data": {}
}
```

### 1.2 Error Envelope
```json
{
  "success": false,
  "message": "Human readable error message",
  "error": {
    "code": "ERROR_CODE_STRING",
    "details": []
  }
}
```

---

## 2. Authentication Endpoints

### 2.1 Register Student
- **Method:** `POST`
- **Route:** `/api/auth/register`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "janedoe@campus.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Validation:**
  - `name`: string, 2-50 chars
  - `email`: valid campus email format, unique
  - `password`: min 8 chars, at least 1 number and 1 letter
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Student registered successfully",
    "data": {
      "user": {
        "id": "672223a48e71c9001b2a9e10",
        "name": "Jane Doe",
        "email": "janedoe@campus.edu",
        "role": "student"
      }
    }
  }
  ```
  *(Sets `token` HTTP-only cookie)*

---

### 2.2 Login
- **Method:** `POST`
- **Route:** `/api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "janedoe@campus.edu",
    "password": "SecurePassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "user": {
        "id": "672223a48e71c9001b2a9e10",
        "name": "Jane Doe",
        "email": "janedoe@campus.edu",
        "role": "student"
      }
    }
  }
  ```
  *(Sets `token` HTTP-only cookie)*

---

### 2.3 Logout
- **Method:** `POST`
- **Route:** `/api/auth/logout`
- **Access:** Authenticated
- **Response (200 OK):** Clears `token` cookie.

---

### 2.4 Get Current User Profile
- **Method:** `GET`
- **Route:** `/api/auth/me`
- **Access:** Authenticated
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User profile fetched",
    "data": {
      "user": {
        "id": "672223a48e71c9001b2a9e10",
        "name": "Jane Doe",
        "email": "janedoe@campus.edu",
        "role": "student"
      }
    }
  }
  ```

---

## 3. Complaint Management Endpoints

### 3.1 Create Complaint
- **Method:** `POST`
- **Route:** `/api/complaints`
- **Access:** Authenticated (Student)
- **Content-Type:** `multipart/form-data` or `application/json`
- **Request Body:**
  ```json
  {
    "title": "Projector not working in Room 204",
    "description": "The overhead projector power button flashes red and displays no image.",
    "category": "Electrical",
    "location": {
      "building": "Engineering Block A",
      "floor": "2",
      "room": "204"
    }
  }
  ```
  *(Optional file field: `image` - max 5MB, jpeg/png/webp)*
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Complaint submitted successfully",
    "data": {
      "complaintId": "FC-1024",
      "status": "Submitted",
      "aiAnalysisStatus": "Pending"
    }
  }
  ```

---

### 3.2 Get My Complaints
- **Method:** `GET`
- **Route:** `/api/complaints/my`
- **Access:** Authenticated (Student)
- **Query Params:** `page` (default 1), `limit` (default 10)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Complaints retrieved successfully",
    "data": {
      "complaints": [],
      "total": 0,
      "page": 1,
      "totalPages": 1
    }
  }
  ```

---

### 3.3 Get Single Complaint
- **Method:** `GET`
- **Route:** `/api/complaints/:id`
- **Access:** Authenticated (Owner or Admin)
- **Response (200 OK):** Full complaint document.

---

## 4. Administrator Endpoints

### 4.1 List All Complaints (Admin Triage)
- **Method:** `GET`
- **Route:** `/api/admin/complaints`
- **Access:** Admin only
- **Query Params:** `status`, `category`, `priority`, `page`, `limit`, `search`
- **Response (200 OK):** Paginated complaints with student details populated.

---

### 4.2 Update Complaint (Assignment / Triage)
- **Method:** `PATCH`
- **Route:** `/api/admin/complaints/:id`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "category": "Electrical",
    "priority": "High",
    "assignedDepartment": "Electrical Maintenance",
    "duplicateOf": null
  }
  ```
- **Response (200 OK):** Updated complaint object.

---

### 4.3 Change Complaint Status
- **Method:** `PATCH`
- **Route:** `/api/admin/complaints/:id/status`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "status": "In Progress",
    "comment": "Dispatched technician John to room 204"
  }
  ```
- **Response (200 OK):** Returns updated complaint and creates in-app notification.

---

### 4.4 Analytics Aggregations
- **Method:** `GET`
- **Route:** `/api/admin/analytics`
- **Access:** Admin only
- **Response (200 OK):** Total complaints, status breakdown, category distribution, average resolution time.

---

## 5. Notification Endpoints

### 5.1 Get User Notifications
- **Method:** `GET`
- **Route:** `/api/notifications`
- **Access:** Authenticated
- **Response (200 OK):** List of notifications sorted with unread first.

---

### 5.2 Mark Notification as Read
- **Method:** `PATCH`
- **Route:** `/api/notifications/:id/read`
- **Access:** Authenticated (Owner)
- **Response (200 OK):** Updated notification object.

---

## 6. AI Microservice Internal Contract

- **Route:** `POST http://localhost:8000/analyze`
- **Request Body:**
  ```json
  {
    "title": "Projector not working in Room 204",
    "description": "The overhead projector power button flashes red and displays no image.",
    "building": "Engineering Block A",
    "floor": "2",
    "room": "204",
    "existingComplaints": [
      {
        "complaintId": "FC-1019",
        "title": "Projector HDMI dead in Room 204",
        "description": "HDMI port has no signal."
      }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "suggestedCategory": "Electrical",
    "suggestedPriority": "Medium",
    "possibleDuplicates": [
      {
        "complaintId": "FC-1019",
        "similarity": 0.84
      }
    ]
  }
  ```

