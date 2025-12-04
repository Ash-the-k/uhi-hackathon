import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem('auth');
      return raw ? JSON.parse(raw) : { token: null, role: null, userId: null };
    } catch {
      return { token: null, role: null, userId: null };
    }
  });

  // persist auth to localStorage
  useEffect(() => {
    try {
      if (auth?.token) localStorage.setItem('auth', JSON.stringify(auth));
      else localStorage.removeItem('auth');
    } catch {}
  }, [auth]);

  // expose login
  const login = useCallback(({ token, role, userId }) => {
    setAuth({ token: token || null, role: role || null, userId: userId || null });
  }, []);

  // logout: clear state + localStorage + broadcast
  const logout = useCallback(() => {
    setAuth({ token: null, role: null, userId: null });
    try {
      localStorage.removeItem('auth');
      // broadcast logout to other tabs
      localStorage.setItem('auth-logout', Date.now().toString());
    } catch {}
    // redirect to login
    if (typeof window !== 'undefined') window.location.href = '/login';
  }, []);

  // Listen to storage events to sync logout across tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (!e) return;
      if (e.key === 'auth-logout') {
        // another tab logged out
        setAuth({ token: null, role: null, userId: null });
        if (typeof window !== 'undefined') {
          // if current page is not /login, redirect
          if (window.location.pathname !== '/login') window.location.href = '/login';
        }
      }
      if (e.key === 'auth') {
        // auth changed in other tab (login)
        try {
          const newVal = e.newValue ? JSON.parse(e.newValue) : { token: null, role: null, userId: null };
          setAuth(newVal);
        } catch {}
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
