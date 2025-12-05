const svc = require('./doctors.service');
exports.list = async (req, res) => {
  try {
    const { specialization } = req.query;
    const doctors = await svc.list(specialization);
    res.json(doctors);
  } catch (err) {
    console.error('Error in list doctors:', err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};
exports.get = async (req, res) => {
  try {
    const d = await svc.getById(req.params.id);
    if (!d) return res.status(404).json({ error: 'Doctor not found' });
    res.json(d);
  } catch (err) {
    console.error('Error in get doctor:', err);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
};
exports.create = async (req, res) => {
  try {
    const doctor = await svc.create(req.body);
    res.status(201).json(doctor);
  } catch (err) {
    console.error('Error in create doctor:', err);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
};
exports.getSpecializations = async (req, res) => {
  try {
    const specializations = await svc.getSpecializations();
    console.log('Specializations fetched:', specializations);
    // If no specializations found, return fallback list
    if (!specializations || specializations.length === 0) {
      console.log('No specializations in DB, returning fallback list');
      return res.json(['Cardiology', 'Neurology', 'Pediatrics']);
    }
    res.json(specializations);
  } catch (err) {
    console.error('Error in get specializations:', err);
    // Return fallback list even on error
    res.json(['Cardiology', 'Neurology', 'Pediatrics']);
  }
};
