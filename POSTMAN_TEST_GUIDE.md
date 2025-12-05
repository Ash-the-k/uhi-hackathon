# Postman Test Guide - Appointment System

## Test Credentials

### Doctor (asdf)
- Email: (use the created doctor email)
- User ID: `6932e64df48a2d74781cdb5d`
- Doctor ID: `6932e64cf48a2d74781cdb5b`
- Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTMyZTY0ZGY0OGEyZDc0NzgxY2RiNWQiLCJyb2xlIjoiZG9jdG9yIiwibmFtZSI6ImFzZGYiLCJkb2N0b3JJZCI6IjY5MzJlNjRjZjQ4YTJkNzQ3ODFjZGI1YiIsImlhdCI6MTc2NDk0NDY2NywiZXhwIjoxNzY0OTczNDY3fQ.5I3DmX6wX3-V9c4V9ixl0oumgXxgkM4xzwtPGhezekM`

### Patient (asdf)
- Email: (use the created patient email)
- User ID: `6932e67df48a2d74781cdb64`
- Patient ID: `6932e67cf48a2d74781cdb62`
- Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTMyZTY3ZGY0OGEyZDc0NzgxY2RiNjQiLCJyb2xlIjoicGF0aWVudCIsIm5hbWUiOiJhc2RmIiwicGF0aWVudElkIjoiNjkzMmU2N2NmNDhhMmQ3NDc4MWNkYjYyIiwiaWF0IjoxNzY0OTQ0NzEzLCJleHAiOjE3NjQ5NzM1MTN9.Y1rmLdyS0LbGyP6l2r8v4waqLrMG6FhfeV5sstt2ou8`

---

## Test 1: Patient Books Appointment

**Endpoint:** `POST http://localhost:4000/api/appointments`

**Authorization:** Bearer Token (Patient)

**Body:**
```json
{
  "doctorId": "6932e64df48a2d74781cdb5d",
  "datetime": "2025-12-06T14:00:00.000Z",
  "notes": "Cardiology consultation"
}
```

**Expected Response (201):**
```json
{
  "success": true,
  "appointment": {
    "_id": "<appointmentId>",
    "patientId": "6932e67cf48a2d74781cdb62",
    "doctorId": "6932e64cf48a2d74781cdb5b",
    "patientName": "asdf",
    "patientEmail": "patient@example.com",
    "doctorName": "asdf",
    "specialization": "General",
    "datetime": "2025-12-06T14:00:00.000Z",
    "notes": "Cardiology consultation",
    "status": "scheduled",
    "createdBy": "6932e67df48a2d74781cdb64",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Success Criteria:**
- ✅ Status 201
- ✅ Appointment created with status "scheduled"
- ✅ Patient and doctor details snapshotted
- ✅ Note the `appointmentId` for next tests

---

## Test 2: Patient Views Their Appointments

**Endpoint:** `GET http://localhost:4000/api/appointments/mine`

**Authorization:** Bearer Token (Patient)

**Body:** None

**Expected Response (200):**
```json
[
  {
    "_id": "<appointmentId from Test 1>",
    "patientId": "6932e67cf48a2d74781cdb62",
    "doctorId": "6932e64cf48a2d74781cdb5b",
    "patientName": "asdf",
    "patientEmail": "patient@example.com",
    "doctorName": "asdf",
    "specialization": "General",
    "datetime": "2025-12-06T14:00:00.000Z",
    "notes": "Cardiology consultation",
    "status": "scheduled",
    "createdBy": "6932e67df48a2d74781cdb64",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

**Success Criteria:**
- ✅ Status 200
- ✅ Returns array of patient's appointments
- ✅ Can see the appointment booked in Test 1

---

## Test 3: Doctor Views Their Appointments

**Endpoint:** `GET http://localhost:4000/api/appointments/doctor`

**Authorization:** Bearer Token (Doctor)

**Body:** None

**Expected Response (200):**
```json
[
  {
    "_id": "<appointmentId from Test 1>",
    "patientId": "6932e67cf48a2d74781cdb62",
    "doctorId": "6932e64cf48a2d74781cdb5b",
    "patientName": "asdf",
    "patientEmail": "patient@example.com",
    "doctorName": "asdf",
    "specialization": "General",
    "datetime": "2025-12-06T14:00:00.000Z",
    "notes": "Cardiology consultation",
    "status": "scheduled",
    "createdBy": "6932e67df48a2d74781cdb64",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

**Success Criteria:**
- ✅ Status 200
- ✅ Doctor sees only their appointments
- ✅ Shows same appointment from Test 1

---

## Test 4: Doctor Starts Consultation

**Endpoint:** `PATCH http://localhost:4000/api/appointments/<appointmentId>/start`

**Authorization:** Bearer Token (Doctor)

Replace `<appointmentId>` with the ID from Test 1.

**Body:** None (or empty `{}`)

**Expected Response (200):**
```json
{
  "success": true,
  "appointment": {
    "_id": "<appointmentId>",
    "patientId": "6932e67cf48a2d74781cdb62",
    "doctorId": "6932e64cf48a2d74781cdb5b",
    "patientName": "asdf",
    "patientEmail": "patient@example.com",
    "doctorName": "asdf",
    "specialization": "General",
    "datetime": "2025-12-06T14:00:00.000Z",
    "notes": "Cardiology consultation",
    "status": "ongoing",
    "createdBy": "6932e67df48a2d74781cdb64",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Success Criteria:**
- ✅ Status 200
- ✅ Status changes from "scheduled" to "ongoing"
- ✅ Can only be done by the assigned doctor

---

## Test 5: Doctor Completes Appointment

**Endpoint:** `PATCH http://localhost:4000/api/appointments/<appointmentId>/status`

**Authorization:** Bearer Token (Doctor)

Replace `<appointmentId>` with the ID from Test 1.

**Body:**
```json
{
  "status": "completed"
}
```

**Expected Response (200):**
```json
{
  "success": true,
  "appointment": {
    "_id": "<appointmentId>",
    "patientId": "6932e67cf48a2d74781cdb62",
    "doctorId": "6932e64cf48a2d74781cdb5b",
    "patientName": "asdf",
    "patientEmail": "patient@example.com",
    "doctorName": "asdf",
    "specialization": "General",
    "datetime": "2025-12-06T14:00:00.000Z",
    "notes": "Cardiology consultation",
    "status": "completed",
    "createdBy": "6932e67df48a2d74781cdb64",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Success Criteria:**
- ✅ Status 200
- ✅ Status changes to "completed"
- ✅ Valid status: "scheduled", "ongoing", "completed", "cancelled"

---

## Test 6: Doctor Cancels Appointment

**Endpoint:** `PATCH http://localhost:4000/api/appointments/<appointmentId>/status`

**Authorization:** Bearer Token (Doctor)

**Body:**
```json
{
  "status": "cancelled"
}
```

**Expected Response (200):**
- ✅ Status changes to "cancelled"

---

## Test 7: Admin Views All Appointments

**Endpoint:** `GET http://localhost:4000/api/appointments`

**Authorization:** Bearer Token (Admin)

**Body:** None

**Expected Response (200):**
```json
[
  {
    "_id": "<appointmentId>",
    "patientId": "6932e67cf48a2d74781cdb62",
    "doctorId": "6932e64cf48a2d74781cdb5b",
    "patientName": "asdf",
    "patientEmail": "patient@example.com",
    "doctorName": "asdf",
    "specialization": "General",
    "datetime": "2025-12-06T14:00:00.000Z",
    "notes": "Cardiology consultation",
    "status": "completed",
    "createdBy": "6932e67df48a2d74781cdb64",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

**Success Criteria:**
- ✅ Status 200
- ✅ Admin can see all appointments (across all patients/doctors)
- ✅ Shows the appointment in final "completed" status

---

## Test 8: Error Case - Patient Can't Complete Appointment

**Endpoint:** `PATCH http://localhost:4000/api/appointments/<appointmentId>/status`

**Authorization:** Bearer Token (Patient)

**Body:**
```json
{
  "status": "completed"
}
```

**Expected Response (403):**
```json
{
  "error": "Forbidden"
}
```

**Success Criteria:**
- ✅ Status 403 Forbidden
- ✅ Only doctors can update status

---

## Test 9: Error Case - Doctor Can't View Patient's Appointments

**Endpoint:** `GET http://localhost:4000/api/appointments/mine`

**Authorization:** Bearer Token (Doctor)

**Expected Response (403):**
```json
{
  "error": "Forbidden"
}
```

**Success Criteria:**
- ✅ Status 403
- ✅ Doctors use `/appointments/doctor`, not `/mine`

---

## Test 10: Error Case - Invalid Doctor ID

**Endpoint:** `POST http://localhost:4000/api/appointments`

**Authorization:** Bearer Token (Patient)

**Body:**
```json
{
  "doctorId": "invalidid123",
  "datetime": "2025-12-06T14:00:00.000Z",
  "notes": "Test"
}
```

**Expected Response (400):**
```json
{
  "success": false,
  "message": "Invalid doctorId format"
}
```

**Success Criteria:**
- ✅ Status 400
- ✅ Validates ObjectId format

---

## Test 11: Admin Creates Appointment for Patient

**Endpoint:** `POST http://localhost:4000/api/appointments`

**Authorization:** Bearer Token (Admin)

**Body:**
```json
{
  "doctorId": "6932e64df48a2d74781cdb5d",
  "patientId": "6932e67cf48a2d74781cdb64",
  "datetime": "2025-12-07T10:00:00.000Z",
  "notes": "Admin-booked appointment"
}
```

**Expected Response (201):**
- ✅ Status 201
- ✅ Appointment created with specified patient and doctor

---

## Quick Postman Collection Setup

In Postman, create a collection with these variables:

```
{
  "baseUrl": "http://localhost:4000",
  "doctorToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTMyZTY0ZGY0OGEyZDc0NzgxY2RiNWQiLCJyb2xlIjoiZG9jdG9yIiwibmFtZSI6ImFzZGYiLCJkb2N0b3JJZCI6IjY5MzJlNjRjZjQ4YTJkNzQ3ODFjZGI1YiIsImlhdCI6MTc2NDk0NDY2NywiZXhwIjoxNzY0OTczNDY3fQ.5I3DmX6wX3-V9c4V9ixl0oumgXxgkM4xzwtPGhezekM",
  "patientToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OTMyZTY3ZGY0OGEyZDc0NzgxY2RiNjQiLCJyb2xlIjoicGF0aWVudCIsIm5hbWUiOiJhc2RmIiwicGF0aWVudElkIjoiNjkzMmU2N2NmNDhhMmQ3NDc4MWNkYjYyIiwiaWF0IjoxNzY0OTQ0NzEzLCJleHAiOjE3NjQ5NzM1MTN9.Y1rmLdyS0LbGyP6l2r8v4waqLrMG6FhfeV5sstt2ou8",
  "appointmentId": ""
}
```

For each request header, use:
```
Authorization: Bearer {{doctorToken}}
```
or
```
Authorization: Bearer {{patientToken}}
```

---

## Summary Checklist

Run through these in order:

- [ ] Test 1: Patient Books Appointment ✅ (Save appointmentId)
- [ ] Test 2: Patient Views Their Appointments ✅
- [ ] Test 3: Doctor Views Their Appointments ✅
- [ ] Test 4: Doctor Starts Consultation ✅
- [ ] Test 5: Doctor Completes Appointment ✅
- [ ] Test 6: Doctor Cancels Appointment (on new booking)
- [ ] Test 7: Admin Views All Appointments ✅
- [ ] Test 8: Error - Patient Can't Update Status ✅
- [ ] Test 9: Error - Doctor Can't Use /mine ✅
- [ ] Test 10: Error - Invalid Doctor ID ✅
- [ ] Test 11: Admin Books for Patient ✅

All tests passing = **Backend appointment system fully functional!** ✅

Then we can move to frontend implementation with confidence.
