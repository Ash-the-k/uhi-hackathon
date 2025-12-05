const User = require('../../db/models/User');
const Doctor = require('../../db/models/Doctor');
const Patient = require('../../db/models/Patient');
const Appointment = require('../../db/models/Appointment');

/**
 * Diagnostic endpoint to debug user/doctor/patient relationships
 * GET /api/appointments/diagnostic/check
 */
exports.diagnostic = async (req, res) => {
  try {
    console.log('\n=== DIAGNOSTIC CHECK ===');
    console.log('req.user:', req.user);
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'No authenticated user' });
    }

    // Get the current user document
    const user = await User.findById(req.user.id).lean();
    console.log('User document:', user);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in DB' });
    }

    let diagnostics = {
      userId: req.user.id,
      userRole: req.user.role,
      userFromDB: {
        email: user.email,
        role: user.role,
        name: user.name,
        doctorId: user.doctorId,
        patientId: user.patientId,
        staffId: user.staffId
      },
      JWTpayload: {
        role: req.user.role,
        name: req.user.name,
        doctorId: req.user.doctorId,
        patientId: req.user.patientId,
        staffId: req.user.staffId
      }
    };

    // If doctor, check if doctor document exists
    if (user.doctorId) {
      const doctor = await Doctor.findById(user.doctorId).lean();
      console.log('Doctor document:', doctor);
      diagnostics.doctorFound = !!doctor;
      diagnostics.doctor = doctor;
    }

    // If patient, check if patient document exists
    if (user.patientId) {
      const patient = await Patient.findById(user.patientId).lean();
      console.log('Patient document:', patient);
      diagnostics.patientFound = !!patient;
      diagnostics.patient = patient;
    }

    // List all doctors to see what's in DB
    const allDoctors = await Doctor.find().lean();
    console.log('All doctors in DB:', allDoctors);
    diagnostics.allDoctors = allDoctors;

    // List all patients
    const allPatients = await Patient.find().lean();
    console.log('All patients in DB:', allPatients);
    diagnostics.allPatients = allPatients;

    // List all users
    const allUsers = await User.find({}, '-passwordHash').lean();
    console.log('All users in DB:', allUsers);
    diagnostics.allUsers = allUsers;

    // List all appointments
    const allAppointments = await Appointment.find().lean();
    console.log('All appointments in DB:', allAppointments);
    diagnostics.allAppointments = allAppointments;

    return res.json({ success: true, diagnostics });
  } catch (err) {
    console.error('Diagnostic error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
