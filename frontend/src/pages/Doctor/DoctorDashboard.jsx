import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import appointmentsApi from '../../api/appointmentsApi';
import consultationsApi from '../../api/consultationsApi';
import Navbar from '../../components/layout/Navbar';
import LhpCards from '../../components/lhp/LhpCards';
import LhpSuggestions from '../../components/lhp/LhpSuggestions';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('appointments');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (activeTab === 'lhp' && appointments.length > 0) {
      // Extract unique patients from appointments
      const uniquePatients = [];
      const patientIds = new Set();
      
      appointments.forEach(apt => {
        if (apt.patientId && !patientIds.has(String(apt.patientId))) {
          patientIds.add(String(apt.patientId));
          uniquePatients.push({
            patientId: apt.patientId,
            name: apt.patientName || 'Unknown Patient',
            email: apt.patientEmail || ''
          });
        }
      });
      
      setPatients(uniquePatients);
      if (uniquePatients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(uniquePatients[0].patientId);
      }
    }
  }, [activeTab, appointments]);

  const fetchAppointments = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await appointmentsApi.getDoctorAppointments();
      setAppointments(res.data.items || res.data || []);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleStartConsultation = async (appointmentId) => {
    setActionLoading(appointmentId);
    setErr('');
    setSuccessMsg('');
    try {
      // Start the appointment (update status to ongoing)
      await appointmentsApi.startConsultation(appointmentId);
      
      // Get appointment details to get patientId and doctorId
      const appointmentRes = await appointmentsApi.getById(appointmentId);
      const appointmentData = appointmentRes.data.appointment;
      
      // Create consultation
      const consultationRes = await consultationsApi.create({
        patientId: appointmentData.patientId,
        doctorId: appointmentData.doctorId
      });
      
      const consultationId = consultationRes.data.data._id;
      
      setSuccessMsg('Consultation started!');
      await fetchAppointments();
      
      // Navigate to consultation page with appointment ID and consultation ID
      navigate(`/doctor/consultation/${appointmentId}?consultationId=${consultationId}`);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || 'Failed to start consultation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateStatus = async (appointmentId, status) => {
    setActionLoading(`${appointmentId}-${status}`);
    setErr('');
    setSuccessMsg('');
    try {
      await appointmentsApi.updateStatus(appointmentId, status);
      setSuccessMsg(`Appointment ${status}!`);
      await fetchAppointments();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || `Failed to ${status} appointment`);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#fff3cd';
      case 'ongoing':
        return '#d1ecf1';
      case 'completed':
        return '#d4edda';
      case 'cancelled':
        return '#f8d7da';
      default:
        return '#f0f0f0';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#856404';
      case 'ongoing':
        return '#0c5460';
      case 'completed':
        return '#155724';
      case 'cancelled':
        return '#721c24';
      default:
        return '#000';
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', color: '#fff', backgroundColor: '#0b1220', borderRadius: 8 }}>
        <h2 style={{ color: '#fff' }}>Doctor Dashboard</h2>
        <p style={{ color: '#ddd' }}>Manage your appointments and patient LHP.</p>

        {/* Tabs */}
        <div style={{ marginBottom: '20px', borderBottom: '2px solid #2b3a4a', display: 'flex' }}>
          <button
            onClick={() => setActiveTab('appointments')}
            style={{
              padding: '10px 20px',
              flex: '1',
              background: activeTab === 'appointments' ? '#0066cc' : '#172033',
              color: activeTab === 'appointments' ? 'white' : '#ddd',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              marginRight: '2px',
              fontWeight: 'bold'
            }}
          >
            Appointments
          </button>
          <button
            onClick={() => setActiveTab('lhp')}
            style={{
              padding: '10px 20px',
              flex: '1',
              background: activeTab === 'lhp' ? '#0066cc' : '#172033',
              color: activeTab === 'lhp' ? 'white' : '#ddd',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px 4px 0 0',
              fontWeight: 'bold'
            }}
          >
            LHP
          </button>
        </div>

        {err && <div style={{ color: 'red', marginBottom: '15px', padding: '10px', background: '#ffe6e6', borderRadius: '4px' }}>{err}</div>}
        {successMsg && <div style={{ color: 'green', marginBottom: '15px', padding: '10px', background: '#e6ffe6', borderRadius: '4px' }}>{successMsg}</div>}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <>
            {loading ? (
              <div>Loading appointments…</div>
            ) : appointments.length === 0 ? (
              <div style={{ padding: '20px', background: '#172033', borderRadius: '4px', textAlign: 'center' }}>
                <p style={{ color: '#ddd' }}>No appointments scheduled.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                  <thead>
                    <tr style={{ background: '#172033' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Patient</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Email</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Date & Time</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Status</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Notes</th>
                      <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #2b3a4a', color: '#fff' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt._id} style={{ borderBottom: '1px solid #2b3a4a' }}>
                        <td style={{ padding: '12px' }}>{apt.patientName || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>{apt.patientEmail || 'N/A'}</td>
                        <td style={{ padding: '12px' }}>
                          {apt.datetime ? new Date(apt.datetime).toLocaleString() : 'N/A'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: getStatusColor(apt.status),
                              color: getStatusTextColor(apt.status),
                              fontWeight: 'bold'
                            }}
                          >
                            {apt.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px', maxWidth: '200px', wordWrap: 'break-word' }}>
                          {apt.notes || '-'}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {apt.status === 'scheduled' && (
                            <button
                              onClick={() => handleStartConsultation(apt._id)}
                              disabled={actionLoading === apt._id}
                              style={{
                                marginRight: '5px',
                                padding: '6px 12px',
                                background: actionLoading === apt._id ? '#ccc' : '#0066cc',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: actionLoading === apt._id ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold'
                              }}
                            >
                              {actionLoading === apt._id ? 'Starting...' : 'Start'}
                            </button>
                          )}

                          {apt.status === 'ongoing' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(apt._id, 'completed')}
                                disabled={actionLoading === `${apt._id}-completed`}
                                style={{
                                  marginRight: '5px',
                                  padding: '6px 12px',
                                  background: actionLoading === `${apt._id}-completed` ? '#ccc' : '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: actionLoading === `${apt._id}-completed` ? 'not-allowed' : 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {actionLoading === `${apt._id}-completed` ? 'Completing...' : 'Complete'}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(apt._id, 'cancelled')}
                                disabled={actionLoading === `${apt._id}-cancelled`}
                                style={{
                                  padding: '6px 12px',
                                  background: actionLoading === `${apt._id}-cancelled` ? '#ccc' : '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: actionLoading === `${apt._id}-cancelled` ? 'not-allowed' : 'pointer',
                                  fontSize: '12px',
                                  fontWeight: 'bold'
                                }}
                              >
                                {actionLoading === `${apt._id}-cancelled` ? 'Cancelling...' : 'Cancel'}
                              </button>
                            </>
                          )}

                          {(apt.status === 'completed' || apt.status === 'cancelled') && (
                            <span style={{ color: '#999', fontSize: '12px' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* LHP Tab */}
        {activeTab === 'lhp' && (
          <div>
            {loading ? (
              <div style={{ color: '#ddd' }}>Loading...</div>
            ) : patients.length === 0 ? (
              <div style={{ padding: '20px', background: '#172033', borderRadius: '4px', textAlign: 'center' }}>
                <p style={{ color: '#ddd' }}>No patients found. You need to have appointments to view LHP.</p>
              </div>
            ) : (
              <>
                {/* Patient Selector */}
                <div style={{ marginBottom: '20px', padding: '15px', background: '#172033', borderRadius: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '10px', color: '#fff', fontWeight: 'bold' }}>
                    Select Patient:
                  </label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '400px',
                      padding: '10px',
                      borderRadius: '4px',
                      border: '1px solid #2b3a4a',
                      background: '#1a2332',
                      color: '#fff',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    {patients.map((patient) => (
                      <option key={patient.patientId} value={patient.patientId}>
                        {patient.name} {patient.email ? `(${patient.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* LHP Cards */}
                {selectedPatientId && (
                  <>
                    <LhpCards patientId={selectedPatientId} />
                    <div style={{ marginTop: '20px' }}>
                      <LhpSuggestions patientId={selectedPatientId} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
