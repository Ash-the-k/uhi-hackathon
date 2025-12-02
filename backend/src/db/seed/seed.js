// backend/src/db/seed/seed.js

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load config (mongoUri etc.)
const config = require('../../config');

// Load models
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const ConsultationEvent = require('../models/ConsultationEvent');
const PrescriptionEvent = require('../models/PrescriptionEvent');
// LHP + Notification models exist but we will NOT seed them for now
// const LhpChronicCondition = require('../models/LhpChronicCondition');
// const LhpAllergy = require('../models/LhpAllergy');
// const LhpCurrentMedication = require('../models/LhpCurrentMedication');
// const LhpPastProcedure = require('../models/LhpPastProcedure');
// const Notification = require('../models/Notification');
// const LhpSuggestion = require('../models/LhpSuggestion');

const MONGO_URI = config.mongoUri;

/**
 * Safely load a seed JSON file.
 * Returns [] if file doesn't exist or is empty/invalid.
 */
function loadSeed(name) {
  try {
    const filePath = path.join(__dirname, `${name}.seed.json`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Seed file not found: ${name}.seed.json (skipping)`);
      return [];
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) {
      console.warn(`⚠️  Seed file empty: ${name}.seed.json (skipping)`);
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`⚠️  Seed file ${name}.seed.json does not contain an array (skipping)`);
      return [];
    }

    console.log(`📄 Loaded ${parsed.length} records from ${name}.seed.json`);
    return parsed;
  } catch (err) {
    console.error(`❌ Error loading seed file ${name}.seed.json:`, err.message);
    return [];
  }
}

async function run() {
  try {
    console.log('🔌 Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1️⃣ Clear existing data from the collections we are seeding
    console.log('🧹 Clearing existing data...');

    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      Staff.deleteMany({}),
      ConsultationEvent.deleteMany({}),
      PrescriptionEvent.deleteMany({})
      // LHP + notifications left untouched for now
      // LhpChronicCondition.deleteMany({}),
      // LhpAllergy.deleteMany({}),
      // LhpCurrentMedication.deleteMany({}),
      // LhpPastProcedure.deleteMany({}),
      // Notification.deleteMany({}),
      // LhpSuggestion.deleteMany({})
    ]);

    console.log('🧼 Collections cleared.');

    // 2️⃣ Load seed data (only the ones you have created for now)
    const patients = loadSeed('patients');
    const doctors = loadSeed('doctors');
    const staff = loadSeed('staff');
    const users = loadSeed('users');
    const consultations = loadSeed('consultations');
    const prescriptions = loadSeed('prescriptions');

    // 3️⃣ Insert in dependency order
    //    Patients/Doctors/Staff → Users → Consultations → Prescriptions

    if (patients.length) {
      await Patient.insertMany(patients);
      console.log(`✅ Inserted ${patients.length} patients`);
    }

    if (doctors.length) {
      await Doctor.insertMany(doctors);
      console.log(`✅ Inserted ${doctors.length} doctors`);
    }

    if (staff.length) {
      await Staff.insertMany(staff);
      console.log(`✅ Inserted ${staff.length} staff`);
    }

    if (users.length) {
      await User.insertMany(users);
      console.log(`✅ Inserted ${users.length} users`);
    }

    if (consultations.length) {
      await ConsultationEvent.insertMany(consultations);
      console.log(`✅ Inserted ${consultations.length} consultations`);
    }

    if (prescriptions.length) {
      await PrescriptionEvent.insertMany(prescriptions);
      console.log(`✅ Inserted ${prescriptions.length} prescriptions`);
    }

    // LHP + notifications seeding will be added later when you create the JSON files
    // const chronic = loadSeed('lhpChronicConditions');
    // if (chronic.length) {
    //   await LhpChronicCondition.insertMany(chronic);
    //   console.log(`✅ Inserted ${chronic.length} chronic conditions`);
    // }

    // const allergies = loadSeed('lhpAllergies');
    // if (allergies.length) {
    //   await LhpAllergy.insertMany(allergies);
    //   console.log(`✅ Inserted ${allergies.length} allergies`);
    // }

    // const currentMeds = loadSeed('lhpCurrentMedications');
    // if (currentMeds.length) {
    //   await LhpCurrentMedication.insertMany(currentMeds);
    //   console.log(`✅ Inserted ${currentMeds.length} current meds`);
    // }

    // const pastProcedures = loadSeed('lhpPastProcedures');
    // if (pastProcedures.length) {
    //   await LhpPastProcedure.insertMany(pastProcedures);
    //   console.log(`✅ Inserted ${pastProcedures.length} past procedures`);
    // }

    // const notifications = loadSeed('notifications');
    // if (notifications.length) {
    //   await Notification.insertMany(notifications);
    //   console.log(`✅ Inserted ${notifications.length} notifications`);
    // }

    // const lhpSuggestions = loadSeed('lhpSuggestions');
    // if (lhpSuggestions.length) {
    //   await LhpSuggestion.insertMany(lhpSuggestions);
    //   console.log(`✅ Inserted ${lhpSuggestions.length} LHP suggestions`);
    // }

    console.log('🌱 Seed data inserted successfully');

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

run();
