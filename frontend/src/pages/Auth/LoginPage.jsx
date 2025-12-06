import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { loginApi } from '../../api/authApi';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const validate = () => {
    const errs = {};
    if (!email) errs.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    return errs;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) return;

    setBusy(true);
    try {
      const data = await loginApi({ email, password });
      const token = data.token;
      const role = data.user?.role || data.role;
      const userId = data.user?._id || data.userId;

      if (!token) throw new Error(data?.message || 'No token received');

      // login into context (AuthContext persists to localStorage)
      login({ token, role, userId });

      // redirect by role
      if (role === 'admin') navigate('/admin/users');
      else if (role === 'doctor') navigate('/doctor/dashboard');
      else if (role === 'patient') navigate('/patient/dashboard');
      else if (role === 'staff') navigate('/staff/dashboard');
      else navigate('/');
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Login failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const errs = validate();

  return (
    <div className="lp-split-page">
      <div className="lp-left">
        <div className="lp-left-inner">
          <div className="lp-logo">UHI</div>
          <h1>Unified Health Interface</h1>
          <p className="lp-lead">
            Secure clinical platform for hospitals. Sign in with your credentials to continue.
          </p>

          <div className="lp-features">
            <div className="feat">
              <strong>Patients</strong>
              <span>Book Appointments & Manage prescriptions</span>
            </div>
            <div className="feat">
              <strong>Doctors</strong>
              <span>Consultation, Prescription & SOAP Notes</span>
            </div>
            <div className="feat">
              <strong>Admin</strong>
              <span>Create accounts & Manage users</span>
            </div>
          </div>

          <footer className="lp-left-foot">© {new Date().getFullYear()} UHI — Internal use</footer>
        </div>
      </div>

      <div className="lp-right">
        <div className="lp-card">
          <h2 className="lp-card-title">Sign in to your account</h2>

          <form className="lp-form" onSubmit={onSubmit} noValidate>
            <label className="lp-label">Email</label>
            <input
              className={`lp-input ${touched.email && errs.email ? 'lp-invalid' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, email: true }))}
              placeholder="admin@test.com"
              type="email"
              autoComplete="username"
            />
            {touched.email && errs.email && <div className="lp-error">{errs.email}</div>}

            <label className="lp-label">Password</label>
            <input
              className={`lp-input ${touched.password && errs.password ? 'lp-invalid' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, password: true }))}
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
            />
            {touched.password && errs.password && <div className="lp-error">{errs.password}</div>}

            <div className="lp-row">
              <label className="lp-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember me
              </label>
            </div>

            <div className="lp-actions">
              <button className="lp-primary" type="submit" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="lp-alt">
            <small>Need help? Contact your system admin.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
