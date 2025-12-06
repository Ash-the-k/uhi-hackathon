const Patient = require('../../db/models/Patient');

exports.list = async () => {
  return await Patient.find().lean().exec();
};

exports.getById = async (id) => {
  return await Patient.findById(id).lean().exec();
};

exports.create = async (data) => {
  const patient = await Patient.create(data);
  return patient.toObject();
};
