import React, { useEffect, useState } from 'react';
import api from '../../api/httpClient';
import appointmentsApi from '../../api/appointmentsApi';
import { getDoctors, getSpecializations } from '../../api/doctorsApi';
import Navbar from '../../components/layout/Navbar';

export default function PatientDashboard() {
  const [timeline, setTimeline] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  // Initialize with fallback specializations so dropdown works immediately
  const [specializations, setSpecializations] = useState(['Cardiology', 'Neurology', 'Pediatrics']);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState('appointments');

  // Booking form state
  const [bookingForm, setBookingForm] = useState({
    specialization: '',
    doctorId: '',
    datetime: '',
    notes: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      setLoading(true);
      setErr('');
      try {
        // Fetch appointments
        const appointRes = await appointmentsApi.getMyAppointments();
        if (mounted) setAppointments(appointRes.data.items || appointRes.data || []);

        // Fetch timeline
        const timeRes = await api.get('/timeline');
        if (mounted) setTimeline(timeRes.data.items || timeRes.data || []);

        // Fetch specializations with immediate fallback
        const fallbackSpecs = ['Cardiology', 'Neurology', 'Pediatrics'];
        
        try {
          const specs = await getSpecializations();
          console.log('Fetched specializations from API:', specs);
          
          // Handle response - should be an array
          let specsArray = Array.isArray(specs) ? specs : (specs?.data || []);
          
          // Filter out null/undefined/empty values
          specsArray = specsArray.filter(s => s && typeof s === 'string' && s.trim().length > 0);
          
          console.log('Processed specializations:', specsArray);
          
          // Use API data if available, otherwise use fallback
          const finalSpecs = specsArray.length > 0 ? specsArray : fallbackSpecs;
          console.log('Setting specializations to:', finalSpecs);
          if (mounted) setSpecializations(finalSpecs);
        } catch (specErr) {
          console.error('Error fetching specializations, using fallback:', specErr);
          // Always use fallback on error
          if (mounted) setSpecializations(fallbackSpecs);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setErr(e?.response?.data?.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  // Fetch doctors when specialization is selected
  useEffect(() => {
    const fetchDoctorsBySpecialization = async () => {
      if (!bookingForm.specialization) {
        setDoctors([]);
        return;
      }

      setLoadingDoctors(true);
      setErr('');
      try {
        const docRes = await getDoctors(bookingForm.specialization);
        setDoctors(docRes || []);
        // Reset doctor selection when specialization changes
        setBookingForm(prev => ({ ...prev, doctorId: '' }));
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || 'Failed to load doctors');
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctorsBySpecialization();
  }, [bookingForm.specialization]);

  const handleBookingChange = (e) => {
    const { name, value } = e.target;
    setBookingForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!bookingForm.doctorId || !bookingForm.datetime) {
      setErr('Please select a doctor and datetime');
      return;
    }

    setBookingLoading(true);
    setErr('');
    setSuccessMsg('');

    try {
      const response = await appointmentsApi.create({
        doctorId: bookingForm.doctorId,
        datetime: bookingForm.datetime,
        notes: bookingForm.notes
      });

      if (response.data.success) {
        setSuccessMsg('Appointment booked successfully!');
        setBookingForm({ specialization: '', doctorId: '', datetime: '', notes: '' });
        
        // Refresh appointments list
        const updatedAppointments = await appointmentsApi.getMyAppointments();
        setAppointments(updatedAppointments.data.items || updatedAppointments.data || []);
      }
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', color: '#fff', backgroundColor: '#0b1220', borderRadius: 8 }}>
        <h2>Patient Dashboard</h2>

        {/* Tabs */}
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #ccc' }}>
          <button
            onClick={() => setActiveTab('appointments')}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              background: activeTab === 'appointments' ? '#0066cc' : '#f0f0f0',
              color: activeTab === 'appointments' ? 'white' : 'black',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0'
            }}
          >
            My Appointments
          </button>
          <button
            onClick={() => setActiveTab('book')}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              background: activeTab === 'book' ? '#0066cc' : '#f0f0f0',
              color: activeTab === 'book' ? 'white' : 'black',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Book Appointment
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'timeline' ? '#0066cc' : '#f0f0f0',
              color: activeTab === 'timeline' ? 'white' : 'black',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0'
            }}
          >
            Timeline
          </button>
        </div>

        {/* Messages */}
        {err && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', background: '#ffe6e6', borderRadius: '4px' }}>{err}</div>}
        {successMsg && <div style={{ color: 'green', marginBottom: '15px', padding: '10px', background: '#e6ffe6', borderRadius: '4px' }}>{successMsg}</div>}

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {/* Appointments Tab */}
            {activeTab === 'appointments' && (
              <div>
                <h3>Your Appointments</h3>
                {appointments.length === 0 ? (
                  <p>No appointments scheduled. <button onClick={() => setActiveTab('book')} style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline', background: 'none', border: 'none' }}>Book one now!</button></p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                    <thead>
                      <tr style={{ background: '#172033' }}>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Doctor</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Specialization</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Date & Time</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Status</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((apt) => (
                        <tr key={apt._id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '10px' }}>{apt.doctorName || 'N/A'}</td>
                          <td style={{ padding: '10px' }}>{apt.specialization || 'N/A'}</td>
                          <td style={{ padding: '10px' }}>
                            {apt.datetime ? new Date(apt.datetime).toLocaleString() : 'N/A'}
                          </td>
                          <td style={{ padding: '10px' }}>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: apt.status === 'scheduled' ? '#fff3cd' : apt.status === 'ongoing' ? '#d1ecf1' : apt.status === 'completed' ? '#d4edda' : '#f8d7da',
                              color: apt.status === 'scheduled' ? '#856404' : apt.status === 'ongoing' ? '#0c5460' : apt.status === 'completed' ? '#155724' : '#721c24'
                            }}>
                              {apt.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px' }}>{apt.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Book Appointment Tab */}
            {activeTab === 'book' && (
              <div>
                <h3>Book an Appointment</h3>
                <form onSubmit={handleBookAppointment} style={{ maxWidth: '500px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Select Specialization *
                    </label>
                    <select
                      name="specialization"
                      value={bookingForm.specialization}
                      onChange={handleBookingChange}
                      required
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px',
                        backgroundColor: loading ? '#f5f5f5' : 'white',
                        cursor: loading ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="">
                        {loading ? 'Loading specializations...' : '-- Select a specialization --'}
                      </option>
                      {specializations.map((spec) => (
                        <option key={spec} value={spec}>
                          {spec}
                        </option>
                      ))}
                    </select>
                    {specializations.length === 0 && !loading && (
                      <p style={{ color: '#ff6b6b', fontSize: '12px', marginTop: '5px' }}>
                        No specializations available. Please refresh the page or contact support.
                      </p>
                    )}
                    {/* Debug info - remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <p style={{ color: '#999', fontSize: '10px', marginTop: '5px' }}>
                        Debug: {specializations.length} specializations loaded
                      </p>
                    )}
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Select Doctor *
                    </label>
                    <select
                      name="doctorId"
                      value={bookingForm.doctorId}
                      onChange={handleBookingChange}
                      required
                      disabled={!bookingForm.specialization || loadingDoctors}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px',
                        backgroundColor: (!bookingForm.specialization || loadingDoctors) ? '#f5f5f5' : 'white',
                        cursor: (!bookingForm.specialization || loadingDoctors) ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="">
                        {loadingDoctors 
                          ? 'Loading doctors...' 
                          : !bookingForm.specialization 
                          ? '-- Please select a specialization first --' 
                          : '-- Select a doctor --'}
                      </option>
                      {doctors.map((doc) => (
                        <option key={doc._id} value={doc._id}>
                          {doc.name} {doc.email ? `(${doc.email})` : ''}
                        </option>
                      ))}
                    </select>
                    {doctors.length === 0 && bookingForm.specialization && !loadingDoctors && (
                      <p style={{ color: '#999', fontSize: '12px', marginTop: '5px' }}>
                        No doctors found for this specialization.
                      </p>
                    )}
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Preferred Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="datetime"
                      value={bookingForm.datetime}
                      onChange={handleBookingChange}
                      required
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                      Notes (optional)
                    </label>
                    <textarea
                      name="notes"
                      value={bookingForm.notes}
                      onChange={handleBookingChange}
                      placeholder="Any notes about your consultation..."
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        fontSize: '14px',
                        minHeight: '100px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: bookingLoading ? '#ccc' : '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: bookingLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {bookingLoading ? 'Booking...' : 'Book Appointment'}
                  </button>
                </form>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div>
                <h3>Recent Activity</h3>
                {timeline.length === 0 ? (
                  <p>No timeline events yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {timeline.map((ev) => (
                      <li
                        key={ev._id || ev.id}
                        style={{
                          padding: '12px',
                          marginBottom: '10px',
                          background: '#f9f9f9',
                          borderLeft: '4px solid #0066cc',
                          borderRadius: '4px'
                        }}
                      >
                        <strong>{ev.title || ev.type || 'Event'}</strong>
                        <br />
                        <small style={{ color: '#666' }}>
                          {ev.date
                            ? new Date(ev.date).toLocaleString()
                            : ev.createdAt
                            ? new Date(ev.createdAt).toLocaleString()
                            : ''}
                        </small>
                        {ev.summary && <p style={{ margin: '5px 0 0 0', fontSize: '14px' }}>{ev.summary}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

