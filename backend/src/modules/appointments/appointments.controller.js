const Appointment = require('../../db/models/Appointment');
const User = require('../../db/models/User');
const Patient = require('../../db/models/Patient');
const Doctor = require('../../db/models/Doctor');
const mongoose = require('mongoose');

/* ---------------------------------------------
   Helper: Resolve patient info for logged-in user
---------------------------------------------- */
async function resolvePatientForUser(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new Error('User not found');

  // If user document stores patientId
  if (user.patientId) {
    const p = await Patient.findById(user.patientId).lean();
    return {
      patientId: p._id,
      patientName: p.name,
      patientEmail: user.email
    };
  }

  // Fallback: search Patient model via userId
  const p = await Patient.findOne({ userId: userId }).lean();
  if (p) {
    return {
      patientId: p._id,
      patientName: p.name,
      patientEmail: user.email
    };
  }

  throw new Error('No patient record found');
}

/* ---------------------------------------------
   Helper: Resolve doctor info snapshot
---------------------------------------------- */
async function resolveDoctorSnapshot(doctorId) {
  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    console.error('Invalid doctorId format:', doctorId, 'type:', typeof doctorId);
    throw new Error('Invalid doctorId format');
  }

  console.log('Querying Doctor by ID:', doctorId);
  let doctor = await Doctor.findById(doctorId).lean();
  console.log('Doctor query result:', doctor);
  
  if (!doctor) {
    // Fallback: maybe doctorId is actually a User ID (userId), try to find User and then their Doctor
    console.log('Doctor not found by doctorId, trying fallback: lookup User by userId');
    const user = await User.findById(doctorId).lean();
    console.log('User lookup result:', user);
    
    if (user && user.role === 'doctor' && user.doctorId) {
      console.log('Found User with role=doctor, doctorId=', user.doctorId);
      doctor = await Doctor.findById(user.doctorId).lean();
      console.log('Doctor lookup by user.doctorId result:', doctor);
      
      if (!doctor) {
        throw new Error('Doctor record not found for user');
      }
    } else {
      console.error('Doctor not found for ID:', doctorId, 'and User fallback also failed');
      throw new Error('Doctor not found');
    }
  }

  // Get doctor's email from User model
  const user = await User.findOne({ 
    doctorId: doctor._id,
    role: 'doctor' 
  }).lean();

  return {
    doctorId: doctor._id,
    doctorName: doctor.name,
    doctorEmail: user?.email || null,
    specialization: doctor.specialization
  };
}

/* ---------------------------------------------
   POST /api/appointments   (Patient + Admin)
---------------------------------------------- */
exports.createAppointment = async (req, res) => {
  try {
    const { doctorId, datetime, notes, patientId } = req.body;

    console.log('=== createAppointment DEBUG ===');
    console.log('req.body:', req.body);
    console.log('req.user:', req.user);
    console.log('doctorId from body:', doctorId, 'type:', typeof doctorId);

    if (!doctorId || !datetime) {
      return res.status(400).json({ success: false, message: 'doctorId and datetime are required' });
    }

    // Get doctor snapshot
    let doctorSnap;
    try {
      console.log('Attempting to resolve doctor with ID:', doctorId);
      doctorSnap = await resolveDoctorSnapshot(doctorId);
      console.log('Doctor snapshot resolved:', doctorSnap);
    } catch (err) {
      console.error('ERROR resolving doctor:', err.message, err.stack);
      return res.status(400).json({ success: false, message: err.message });
    }

    let patientSnap;

    /* ---------------------------
       ADMIN creating appointment
       Admin must send patientId
    ---------------------------- */
    if (req.user.role === 'admin') {
      if (!patientId) {
        return res.status(400).json({ success: false, message: 'patientId required for admin' });
      }

      const patient = await Patient.findById(patientId).lean();
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      const user = await User.findById(patient.userId).lean();
      patientSnap = {
        patientId: patient._id,
        patientName: patient.name,
        patientEmail: user?.email || ''
      };
    }

    /* ---------------------------
       PATIENT creating for self
    ---------------------------- */
    if (req.user.role === 'patient') {
      try {
        patientSnap = await resolvePatientForUser(req.user.id);
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
    }

    const date = new Date(datetime);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid datetime' });
    }

    const appointment = await Appointment.create({
      patientId: patientSnap.patientId,
      patientName: patientSnap.patientName,
      patientEmail: patientSnap.patientEmail,

      doctorId: doctorSnap.doctorId,
      doctorName: doctorSnap.doctorName,
      doctorEmail: doctorSnap.doctorEmail,
      specialization: doctorSnap.specialization,

      datetime: date,
      notes: notes || '',
      createdBy: req.user.id
    });

    return res.status(201).json({ success: true, appointment });
  } catch (err) {
    console.error('createAppointment error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------------------------------------------
   GET /api/appointments   (Admin only)
---------------------------------------------- */
exports.getAllAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, doctorId, patientId, from, to } = req.query;

    const p = Math.max(1, parseInt(page));
    const l = Math.max(1, Math.min(200, parseInt(limit)));

    const filter = {};

    if (doctorId && mongoose.Types.ObjectId.isValid(doctorId))
      filter.doctorId = doctorId;

    if (patientId && mongoose.Types.ObjectId.isValid(patientId))
      filter.patientId = patientId;

    if (from || to) {
      filter.datetime = {};
      if (from && !isNaN(new Date(from))) filter.datetime.$gte = new Date(from);
      if (to && !isNaN(new Date(to))) filter.datetime.$lte = new Date(to);
    }

    const skip = (p - 1) * l;

    const [count, items] = await Promise.all([
      Appointment.countDocuments(filter),
      Appointment.find(filter).sort({ datetime: 1 }).skip(skip).limit(l).lean()
    ]);

    return res.json({ count, items });
  } catch (err) {
    console.error('getAllAppointments error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------------------------------------------
   GET /api/appointments/mine   (Patient)
---------------------------------------------- */
exports.getMyAppointments = async (req, res) => {
  try {
    const patientSnap = await resolvePatientForUser(req.user.id);

    const items = await Appointment.find({ patientId: patientSnap.patientId })
      .sort({ datetime: 1 })
      .lean();

    return res.json({ count: items.length, items });
  } catch (err) {
    console.error('getMyAppointments error', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------------------------------------------
   GET /api/appointments/doctor   (Doctor)
---------------------------------------------- */
exports.getDoctorAppointments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found' });
    }

    const doctorId = user.doctorId;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor profile not found for this user' });
    }

    const items = await Appointment.find({ doctorId })
      .sort({ datetime: 1 })
      .lean();

    return res.json({ count: items.length, items });
  } catch (err) {
    console.error('getDoctorAppointments error:', err.message, err.stack);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------------------------------------------
   PATCH /api/appointments/:id/start   (Doctor)
---------------------------------------------- */
exports.startAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: 'Invalid appointment id' });

    const appointment = await Appointment.findById(id);
    if (!appointment)
      return res.status(404).json({ success: false, message: 'Appointment not found' });

    const user = await User.findById(req.user.id).lean();
    if (!user)
      return res.status(400).json({ success: false, message: 'User not found' });

    const doctorId = user.doctorId;
    if (!doctorId)
      return res.status(400).json({ success: false, message: 'Doctor profile not found for this user' });

    if (appointment.doctorId.toString() !== doctorId.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    appointment.status = 'ongoing';
    await appointment.save();

    return res.json({ success: true, appointment });
  } catch (err) {
    console.error('startAppointment error:', err.message, err.stack);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

/* ---------------------------------------------
   PATCH /api/appointments/:id/status   (Doctor)
---------------------------------------------- */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ['scheduled', 'ongoing', 'completed', 'cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status' });

    const appointment = await Appointment.findById(id);
    if (!appointment)
      return res.status(404).json({ success: false, message: 'Appointment not found' });

    const user = await User.findById(req.user.id).lean();
    if (!user)
      return res.status(400).json({ success: false, message: 'User not found' });

    const doctorId = user.doctorId;
    if (!doctorId)
      return res.status(400).json({ success: false, message: 'Doctor profile not found for this user' });

    if (appointment.doctorId.toString() !== doctorId.toString())
      return res.status(403).json({ success: false, message: 'Not authorized' });

    appointment.status = status;
    await appointment.save();

    return res.json({ success: true, appointment });
  } catch (err) {
    console.error('updateStatus error:', err.message, err.stack);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
