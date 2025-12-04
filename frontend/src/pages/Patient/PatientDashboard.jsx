import React, { useEffect, useState } from 'react';
import api from '../../api/httpClient';
import Navbar from '../../components/layout/Navbar';

export default function PatientDashboard() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchTimeline = async () => {
      setLoading(true); setErr('');
      try {
        const res = await api.get('/timeline'); // adjust path if different
        if (!mounted) return;
        setTimeline(res.data.items || res.data || []);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || 'Failed to load timeline');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTimeline();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ padding: 20 }}>
        <h2>Patient Dashboard</h2>
        <p>Your recent timeline and events.</p>

        {loading ? <div>Loading timeline…</div> :
          err ? <div style={{ color: 'red' }}>{err}</div> : (
          <>
            {timeline.length === 0 ? <div>No timeline events yet.</div> : (
              <ul>
                {timeline.map(ev => (
                  <li key={ev._id || ev.id}>
                    <strong>{ev.title || ev.type || 'Event'}</strong>
                    {' — '}
                    {ev.date ? new Date(ev.date).toLocaleString() : (ev.createdAt ? new Date(ev.createdAt).toLocaleString() : '')}
                    {ev.summary ? ` — ${ev.summary}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
