import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { auth, logout } = useContext(AuthContext);

  return (
    <div className="nav-bar">
      <div className="nav-left">
        <div className="nav-logo">UHI</div>
      </div>
      <div className="nav-right">
        <div className="nav-user">{auth?.role ? auth.role.toUpperCase() : ''}</div>
        <button className="nav-logout" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
