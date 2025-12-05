const mongoose = require('mongoose');
const { Schema } = mongoose;

const AppointmentSchema = new Schema(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },

    // Snapshots (important for history)
    patientName: { type: String, required: true },
    patientEmail: { type: String, required: true },

    doctorName: { type: String, required: true },
    doctorEmail: { type: String },
    specialization: { type: String, required: true },

    datetime: { type: Date, required: true },
    notes: { type: String, default: '' },

    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
      default: 'scheduled'
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Appointment', AppointmentSchema);
