import React, { useEffect, useState } from 'react';
import api from '../../api/httpClient';
import SimpleModal from '../../components/common/SimpleModal';
import './UsersManagementPage.css';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState('');

  // pagination + search
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [search, setSearch] = useState('');

  // modal state for create user
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'doctor',
    name: '',
    specialization: '',
    // patient fields
    patientCode: '',
    age: '',
    gender: '',
    phone: '',
    // staff fields
    roleDescription: ''
  });

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [page, limit]);

  const fetchUsers = async () => {
    setLoading(true);
    setFetchErr('');
    try {
      // try server-side pagination/search if backend supports query params
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);
      if (search) params.set('search', search);

      const res = await api.get(`/users?${params.toString()}`);
      // backend may return { count, items } or array
      const data = res.data;
      // normalize to an array of all items (backend may paginate or return array)
      let allItems = [];
      if (Array.isArray(data)) allItems = data;
      else if (data && Array.isArray(data.items)) allItems = data.items;
      else allItems = [];

      // client-side search (backend may not support search query)
      const q = (search || '').trim().toLowerCase();
      if (q) {
        allItems = allItems.filter(u => (u.email || '').toLowerCase().includes(q));
      }

      // pagination (client-side fallback)
      setCount(allItems.length);
      const start = (page - 1) * limit;
      const paged = allItems.slice(start, start + limit);
      setUsers(paged);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) {
        // token invalid — force logout (clear storage + redirect)
        localStorage.removeItem('auth');
        window.location.href = '/login';
        return;
      }
      setFetchErr(err?.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const onSearch = async (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openCreate = () => {
    setCreateErr('');
    setForm({
      email: '',
      password: '',
      role: 'doctor',
      name: '',
      specialization: '',
      patientCode: '',
      age: '',
      gender: '',
      phone: '',
      roleDescription: ''
    });
    setShowModal(true);
  };

  const onCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateErr('');
    if (!form.email || !form.password || !form.role) {
      setCreateErr('Please fill email, password and role');
      return;
    }
    setCreating(true);
    try {
      // build payload; include doctor sub-object if role === doctor
      const payload = {
        email: form.email,
        password: form.password,
        name: form.name || form.email.split('@')[0],
        role: form.role
      };
      if (form.role === 'doctor') {
        payload.doctor = { name: payload.name, specialization: form.specialization || 'General' };
      }
        // include patient object when creating patient
        if (form.role === 'patient') {
          payload.patient = {
            patientCode: form.patientCode || undefined,
            name: payload.name,
            age: form.age ? Number(form.age) : undefined,
            gender: form.gender || undefined,
            phone: form.phone || undefined
          };
        }
        // include staff object when creating staff
        if (form.role === 'staff') {
          payload.staff = {
            name: payload.name,
            roleDescription: form.roleDescription || undefined
          };
        }
      await api.post('/users', payload);
      setShowModal(false);
      fetchUsers(); // refresh
      alert('User created successfully');
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) {
        localStorage.removeItem('auth'); window.location.href = '/login'; return;
      }
      setCreateErr(err?.response?.data?.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const doLogout = () => {
    localStorage.removeItem('auth');
    window.location.href = '/login';
  };

  // simple pagination helpers
  const totalPages = Math.max(1, Math.ceil(count / limit));

  return (
    <div className="ump-page">
      <header className="ump-header">
        <div className="ump-left">
          <h2>Admin • Users</h2>
          <small className="ump-sub">Manage users and accounts</small>
        </div>

        <div className="ump-actions">
          <form onSubmit={onSearch} className="ump-search-form">
            <input
              placeholder="Search by email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
          <button className="ump-btn" onClick={openCreate}>Create user</button>
          <button className="ump-logout" onClick={doLogout}>Logout</button>
        </div>
      </header>

      <main className="ump-main">
        {loading ? (
          <div className="ump-loading">Loading users…</div>
        ) : fetchErr ? (
          <div className="ump-error">{fetchErr}</div>
        ) : (
          <>
            <div className="ump-table-wrap">
              <table className="ump-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Name</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>No users found</td></tr>
                  ) : users.map(u => {
                    const isMatch = search && (u.email || '').toLowerCase().includes(search.trim().toLowerCase());
                    return (
                      <tr key={u._id || u.email} className={isMatch ? 'ump-row-highlight' : ''}>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.name || '-'}</td>
                        <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ump-pager">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>Prev</button>
              <span>Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</button>
            </div>
          </>
        )}
      </main>

      {showModal && (
        <SimpleModal onClose={() => setShowModal(false)} title="Create user">
          <form onSubmit={onCreateSubmit} className="ump-create-form">
            <label>Email</label>
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />

            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />

            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="doctor">doctor</option>
              <option value="patient">patient</option>
              <option value="staff">staff</option>
            </select>

            {form.role === 'doctor' && (
              <>
                <label>Doctor name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <label>Specialization</label>
                <input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} />
              </>
            )}

            {form.role === 'patient' && (
              <>
                <label>Patient name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <label>Patient code (optional)</label>
                <input value={form.patientCode} onChange={e => setForm(f => ({ ...f, patientCode: e.target.value }))} />
                <label>Age</label>
                <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} />
                <label>Gender</label>
                <input value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} />
                <label>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </>
            )}

            {form.role === 'staff' && (
              <>
                <label>Staff name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <label>Role description</label>
                <input value={form.roleDescription} onChange={e => setForm(f => ({ ...f, roleDescription: e.target.value }))} />
              </>
            )}

            {createErr && <div className="ump-create-err">{createErr}</div>}

            <div className="ump-modal-actions">
              <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        </SimpleModal>
      )}
    </div>
  );
}
