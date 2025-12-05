import React, { useEffect, useState } from 'react';
import appointmentsApi from '../../api/appointmentsApi';
import './AdminAppointments.css';

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    setLoading(true); setErr('');
    try {
      const res = await appointmentsApi.getAll();
      setAppointments(res.data.items || res.data || []);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || 'Failed to load appointments');
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-appointments-page" style={{ backgroundColor: '#0b1220', padding: 20, borderRadius: 8, color: '#fff' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#fff' }}>Admin • Appointments</h2>
          <small className="sub" style={{ color: '#cbd5e1' }}>View and manage all appointments</small>
        </div>
      </header>

      <main style={{ marginTop: 16 }}>
        {loading ? <div style={{ color: '#fff' }}>Loading appointments…</div> : err ? <div style={{ color: '#ffb3b3' }}>{err}</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="aa-table" style={{ color: '#fff' }}>
              <thead>
                <tr style={{ background: '#172033' }}>
                  <th style={{ color: '#fff' }}>Doctor</th>
                  <th style={{ color: '#fff' }}>Patient</th>
                  <th style={{ color: '#fff' }}>Patient Email</th>
                  <th style={{ color: '#fff' }}>Specialization</th>
                  <th style={{ color: '#fff' }}>Date & Time</th>
                  <th style={{ color: '#fff' }}>Status</th>
                  <th style={{ color: '#fff' }}>Notes</th>
                  <th style={{ color: '#fff' }}>Created By</th>
                </tr>
              </thead>
              <tbody>
                {appointments.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: 20, color: '#fff' }}>No appointments found</td></tr>
                ) : appointments.map(a => (
                  <tr key={a._id}>
                    <td>{a.doctorName || (a.doctor && a.doctor.name) || '-'}</td>
                    <td>{a.patientName || '-'}</td>
                    <td>{a.patientEmail || '-'}</td>
                    <td>{a.specialization || '-'}</td>
                    <td>{a.datetime ? new Date(a.datetime).toLocaleString() : '-'}</td>
                    <td>{a.status}</td>
                    <td style={{ maxWidth: 240, wordBreak: 'break-word' }}>{a.notes || '-'}</td>
                    <td>{a.createdBy || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
