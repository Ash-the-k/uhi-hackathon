import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import usersApi from '../../api/usersApi';
import './Navbar.css';

export default function Navbar() {
  const { auth, logout } = useContext(AuthContext);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserName = async () => {
      if (auth?.userId && auth?.role && auth.role !== 'admin') {
        try {
          const userRes = await usersApi.getById(auth.userId);
          const userData = userRes.data || userRes;
          if (userData?.name) {
            setUserName(userData.name.toUpperCase());
          }
        } catch (err) {
          console.error('Error fetching user name:', err);
        }
      }
    };

    fetchUserName();
  }, [auth?.userId, auth?.role]);

  const displayText = auth?.role && userName 
    ? `${auth.role.toUpperCase()}, ${userName}`
    : auth?.role 
    ? auth.role.toUpperCase() 
    : '';

  return (
    <div className="nav-bar">
      <div className="nav-left">
        <div className="nav-logo">UHI</div>
      </div>
      <div className="nav-right">
        <div className="nav-user">{displayText}</div>
        <button className="nav-logout" onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
