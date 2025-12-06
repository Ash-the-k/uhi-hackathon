# 🧪 Postman Commands for Consultations API Testing

## Base URL
```
http://localhost:4000/api
```

---

## Step 1: Login to Get JWT Token

### **POST `/api/auth/login`**

#### cURL Command:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "doctor1@test.com",
    "password": "password123"
  }'
```

#### Postman Setup:
- **Method:** POST
- **URL:** `http://localhost:4000/api/auth/login`
- **Headers:**
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "email": "doctor1@test.com",
  "password": "password123"
}
```

#### Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "doctor",
  "userId": "6778c1e4f1f0a9a8f0000001"
}
```

**💡 Save the `token` value for use in subsequent requests!**

---

## Step 2: Create Consultation

### **POST `/api/consultations`**

**📌 Frontend should call this when recording STARTS.**

#### cURL Command:
```bash
# Replace <TOKEN> with the token from Step 1
# Replace <patientId> and <doctorId> with actual IDs

curl -X POST http://localhost:4000/api/consultations \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "6778c1e4f1f0a9a8f0000001",
    "doctorId": "6778c1e4f1f0a9a8f0000002"
  }'
```

#### Postman Setup:
- **Method:** POST
- **URL:** `http://localhost:4000/api/consultations`
- **Headers:**
  - `Authorization: Bearer <YOUR_TOKEN>`
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "patientId": "6778c1e4f1f0a9a8f0000001",
  "doctorId": "6778c1e4f1f0a9a8f0000002"
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "_id": "6778c1e4f1f0a9a8f0000003",
    "patientId": "6778c1e4f1f0a9a8f0000001",
    "doctorId": "6778c1e4f1f0a9a8f0000002",
    "createdByRole": "doctor",
    "createdByUserId": "6778c1e4f1f0a9a8f0000001",
    "status": "UNVERIFIED",
    "soap": {
      "current": null,
      "history": []
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**💡 Save the `_id` from the response for use in subsequent requests!**

---

## Step 3: List Consultations

### **GET `/api/consultations`**

**Auto-filtering based on role:**
- **doctor** → only consultations where `doctorId = JWT.doctorId`
- **patient** → only consultations where `patientId = JWT.patientId`
- **staff** → empty (unless admin filter manually applied)
- **admin** → full list

#### cURL Command (Doctor):
```bash
curl -X GET http://localhost:4000/api/consultations \
  -H "Authorization: Bearer <TOKEN>"
```

#### cURL Command (Admin with filter):
```bash
# Filter by doctorId
curl -X GET "http://localhost:4000/api/consultations?doctorId=6778c1e4f1f0a9a8f0000002" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Filter by patientId
curl -X GET "http://localhost:4000/api/consultations?patientId=6778c1e4f1f0a9a8f0000001" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

#### Postman Setup:
- **Method:** GET
- **URL:** `http://localhost:4000/api/consultations`
  - For admin filtering: `http://localhost:4000/api/consultations?doctorId=<id>`
  - Or: `http://localhost:4000/api/consultations?patientId=<id>`
- **Headers:**
  - `Authorization: Bearer <YOUR_TOKEN>`

#### Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "6778c1e4f1f0a9a8f0000003",
      "patientId": "6778c1e4f1f0a9a8f0000001",
      "doctorId": "6778c1e4f1f0a9a8f0000002",
      "status": "UNVERIFIED",
      "soap": {
        "current": null,
        "history": []
      },
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

## Step 4: Get Consultation by ID

### **GET `/api/consultations/:id`**

**Access rules enforced by backend:**
- **doctor** → only if `consultation.doctorId = JWT.doctorId`
- **patient** → only if `consultation.patientId = JWT.patientId`
- **admin** → allowed

#### cURL Command:
```bash
# Replace <CONSULTATION_ID> with the ID from Step 2
curl -X GET http://localhost:4000/api/consultations/<CONSULTATION_ID> \
  -H "Authorization: Bearer <TOKEN>"
```

#### Postman Setup:
- **Method:** GET
- **URL:** `http://localhost:4000/api/consultations/<CONSULTATION_ID>`
- **Headers:**
  - `Authorization: Bearer <YOUR_TOKEN>`

#### Response:
```json
{
  "success": true,
  "data": {
    "_id": "6778c1e4f1f0a9a8f0000003",
    "patientId": "6778c1e4f1f0a9a8f0000001",
    "doctorId": "6778c1e4f1f0a9a8f0000002",
    "status": "UNVERIFIED",
    "audioPath": "/uploads/audio/consultation-1234567890.webm",
    "transcript": null,
    "soap": {
      "current": null,
      "history": []
    },
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

## Step 5: Verify SOAP (Doctor Only)

### **PUT `/api/consultations/:id/verify`**

**Backend does:**
- ✔ Moves previous SOAP to `history`
- ✔ Updates `soap.current`
- ✔ Marks as `VERIFIED_DOCTOR`

#### cURL Command:
```bash
# Replace <CONSULTATION_ID> with the ID from Step 2
curl -X PUT http://localhost:4000/api/consultations/<CONSULTATION_ID>/verify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "soap": {
      "subjective": "Patient complains of persistent cough and fever for 3 days. No chest pain.",
      "objective": "Temperature: 38.5°C, BP: 120/80, Heart rate: 90 bpm. Mild congestion on auscultation.",
      "assessment": "Acute upper respiratory tract infection, likely viral. Rule out bacterial infection.",
      "plan": "1. Prescribe paracetamol 500mg TID for fever. 2. Advise rest and hydration. 3. Follow-up in 3 days if symptoms persist. 4. Consider antibiotics if fever persists beyond 5 days."
    }
  }'
```

#### Postman Setup:
- **Method:** PUT
- **URL:** `http://localhost:4000/api/consultations/<CONSULTATION_ID>/verify`
- **Headers:**
  - `Authorization: Bearer <YOUR_TOKEN>`
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "soap": {
    "subjective": "Patient complains of persistent cough and fever for 3 days. No chest pain.",
    "objective": "Temperature: 38.5°C, BP: 120/80, Heart rate: 90 bpm. Mild congestion on auscultation.",
    "assessment": "Acute upper respiratory tract infection, likely viral. Rule out bacterial infection.",
    "plan": "1. Prescribe paracetamol 500mg TID for fever. 2. Advise rest and hydration. 3. Follow-up in 3 days if symptoms persist. 4. Consider antibiotics if fever persists beyond 5 days."
  }
}
```

#### Response:
```json
{
  "success": true,
  "data": {
    "_id": "6778c1e4f1f0a9a8f0000003",
    "patientId": "6778c1e4f1f0a9a8f0000001",
    "doctorId": "6778c1e4f1f0a9a8f0000002",
    "status": "VERIFIED_DOCTOR",
    "soap": {
      "current": {
        "subjective": "Patient complains of persistent cough and fever for 3 days. No chest pain.",
        "objective": "Temperature: 38.5°C, BP: 120/80, Heart rate: 90 bpm. Mild congestion on auscultation.",
        "assessment": "Acute upper respiratory tract infection, likely viral. Rule out bacterial infection.",
        "plan": "1. Prescribe paracetamol 500mg TID for fever. 2. Advise rest and hydration. 3. Follow-up in 3 days if symptoms persist. 4. Consider antibiotics if fever persists beyond 5 days.",
        "editedByUserId": "6778c1e4f1f0a9a8f0000001",
        "editedByRole": "doctor",
        "editedAt": "2025-01-15T10:30:00.000Z"
      },
      "history": []
    },
    "lastVerifiedBy": "6778c1e4f1f0a9a8f0000001",
    "lastVerifiedAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

---

## Step 6: Verify SOAP Again (Test History)

If you verify SOAP again, the previous version moves to `history`:

#### Second Verification:
```json
{
  "soap": {
    "subjective": "Updated: Patient reports improvement. Cough reduced.",
    "objective": "Temperature: 37.2°C, BP: 118/78. Clear lungs.",
    "assessment": "Improving. Continue current treatment.",
    "plan": "Continue paracetamol as needed. Follow-up in 2 days."
  }
}
```

#### Response (with history):
```json
{
  "success": true,
  "data": {
    "soap": {
      "current": {
        "subjective": "Updated: Patient reports improvement. Cough reduced.",
        ...
      },
      "history": [
        {
          "subjective": "Patient complains of persistent cough and fever for 3 days. No chest pain.",
          "objective": "Temperature: 38.5°C, BP: 120/80, Heart rate: 90 bpm. Mild congestion on auscultation.",
          "assessment": "Acute upper respiratory tract infection, likely viral. Rule out bacterial infection.",
          "plan": "1. Prescribe paracetamol 500mg TID for fever...",
          "editedByUserId": "6778c1e4f1f0a9a8f0000001",
          "editedByRole": "doctor",
          "editedAt": "2025-01-15T10:30:00.000Z"
        }
      ]
    }
  }
}
```

---

## 📝 Quick Test Sequence

1. **Login as Doctor:**
   ```bash
   POST /api/auth/login
   # Save token as $DOC_TOKEN
   ```

2. **Create Consultation:**
   ```bash
   POST /api/consultations
   # Save consultation._id as $CONSULTATION_ID
   ```

3. **List Consultations:**
   ```bash
   GET /api/consultations
   ```

4. **Get Consultation:**
   ```bash
   GET /api/consultations/$CONSULTATION_ID
   ```

5. **Verify SOAP:**
   ```bash
   PUT /api/consultations/$CONSULTATION_ID/verify
   ```

6. **Verify Again (test history):**
   ```bash
   PUT /api/consultations/$CONSULTATION_ID/verify
   # Previous SOAP should be in history
   ```

---

## 🔍 Getting Patient/Doctor IDs

To get valid IDs for testing:

### Get All Patients:
```bash
curl -X GET http://localhost:4000/api/patients \
  -H "Authorization: Bearer <TOKEN>"
```

### Get All Doctors:
```bash
curl -X GET http://localhost:4000/api/doctors \
  -H "Authorization: Bearer <TOKEN>"
```

---

## ⚠️ Common Issues

1. **401 Unauthorized:** Make sure you're including the `Authorization: Bearer <TOKEN>` header
2. **403 Forbidden:** You're trying to access a consultation that doesn't belong to you
3. **404 Not Found:** The consultation ID doesn't exist
4. **400 Bad Request:** Missing required fields (`patientId`, `doctorId`, or `soap` object)

---

## 🎯 Testing Different Roles

### Test as Patient:
```bash
# Login as patient
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"patient1@test.com","password":"password123"}'

# List consultations (will only see their own)
curl -X GET http://localhost:4000/api/consultations \
  -H "Authorization: Bearer <PATIENT_TOKEN>"
```

### Test as Admin:
```bash
# Login as admin
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# List all consultations
curl -X GET http://localhost:4000/api/consultations \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# Filter by doctor
curl -X GET "http://localhost:4000/api/consultations?doctorId=<id>" \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
