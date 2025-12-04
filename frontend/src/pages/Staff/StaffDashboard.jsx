import React, { useEffect, useState } from 'react';
import api from '../../api/httpClient';
import Navbar from '../../components/layout/Navbar';

export default function StaffDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchTasks = async () => {
      setLoading(true); setErr('');
      try {
        const res = await api.get('/staff/tasks'); // adjust as needed
        if (!mounted) return;
        setTasks(res.data.items || res.data || []);
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || 'Failed to load tasks');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchTasks();
    return () => { mounted = false; };
  }, []);

  return (
    <div>
      <Navbar />
      <div style={{ padding: 20 }}>
        <h2>Staff Dashboard</h2>
        <p>Tasks & pending items assigned to you.</p>

        {loading ? <div>Loading tasks…</div> :
          err ? <div style={{ color: 'red' }}>{err}</div> : (
          <>
            {tasks.length === 0 ? <div>No tasks assigned.</div> : (
              <ul>
                {tasks.map(t => (
                  <li key={t._id || t.id}>
                    <strong>{t.title || t.description || 'Task'}</strong>
                    {' — '}
                    {t.dueDate ? new Date(t.dueDate).toLocaleString() : ''}
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
