const Doctor = require('../../db/models/Doctor');
const User = require('../../db/models/User');
const mongoose = require('mongoose');

/**
 * List all doctors with their email addresses
 * @param {string} specialization - Optional specialization filter
 */
exports.list = async (specialization = null) => {
  try {
    const query = {};
    if (specialization) {
      query.specialization = specialization;
    }

    const doctors = await Doctor.find(query).lean();
    
    // Get email addresses from User model for each doctor
    const doctorsWithEmail = await Promise.all(
      doctors.map(async (doctor) => {
        const user = await User.findOne({ 
          doctorId: doctor._id,
          role: 'doctor' 
        }).lean();
        
        return {
          ...doctor,
          email: user?.email || null
        };
      })
    );

    return doctorsWithEmail;
  } catch (err) {
    console.error('Error listing doctors:', err);
    throw err;
  }
};

/**
 * Get doctor by ID with email
 */
exports.getById = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const doctor = await Doctor.findById(id).lean();
    if (!doctor) {
      return null;
    }

    // Get email from User model
    const user = await User.findOne({ 
      doctorId: doctor._id,
      role: 'doctor' 
    }).lean();

    return {
      ...doctor,
      email: user?.email || null
    };
  } catch (err) {
    console.error('Error getting doctor by ID:', err);
    throw err;
  }
};

/**
 * Create a new doctor
 */
exports.create = async (data) => {
  try {
    const doctor = await Doctor.create(data);
    return doctor.toObject();
  } catch (err) {
    console.error('Error creating doctor:', err);
    throw err;
  }
};

/**
 * Get list of unique specializations
 */
exports.getSpecializations = async () => {
  try {
    const specializations = await Doctor.distinct('specialization');
    console.log('Raw specializations from DB:', specializations);
    const filtered = specializations.filter(s => s && s.trim && s.trim().length > 0);
    console.log('Filtered specializations:', filtered);
    return filtered;
  } catch (err) {
    console.error('Error getting specializations:', err);
    // Return fallback list on error
    return ['Cardiology', 'Neurology', 'Pediatrics'];
  }
};
