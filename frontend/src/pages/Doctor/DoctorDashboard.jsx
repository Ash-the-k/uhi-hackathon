import React, { useEffect, useState } from 'react';
import api from '../../api/httpClient';
import Navbar from '../../components/layout/Navbar';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchAppointments = async () => {
      setLoading(true); setErr('');
      try {
        // example endpoint — adjust if your backend path differs
        const res = await api.get('/consultations/doctor'); // or /appointments
        if (!mounted) return;
        setAppointments(res.data.items || res.data || []);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || 'Failed to load appointments');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAppointments();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ padding: 20 }}>
        <h2>Doctor Dashboard</h2>
        <p>Quick overview of upcoming consultations.</p>

        {loading ? <div>Loading appointments…</div> :
          err ? <div style={{ color: 'red' }}>{err}</div> : (
          <div>
            {appointments.length === 0 ? (
              <div>No appointments found.</div>
            ) : (
              <ul>
                {appointments.map(a => (
                  <li key={a._id || a.id}>
                    <strong>{a.patientName || a.patient?.name || a.patientEmail || 'Patient'}</strong>
                    {' — '}
                    {a.date ? new Date(a.date).toLocaleString() : (a.slot || 'No date')}
                    {a.note ? ` — ${a.note}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
