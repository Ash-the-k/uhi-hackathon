import api from './httpClient';

export const getDoctors = async (specialization = null) => {
  const params = specialization ? { specialization } : {};
  const response = await api.get('/doctors', { params });
  return response.data;
};

export const getDoctor = async (id) => {
  const response = await api.get(`/doctors/${id}`);
  return response.data;
};

export const getSpecializations = async () => {
  try {
    const response = await api.get('/doctors/specializations');
    console.log('Specializations API response:', response);
    // Return the data directly - it should be an array
    return response.data;
  } catch (error) {
    console.error('Error fetching specializations:', error);
    throw error;
  }
};

