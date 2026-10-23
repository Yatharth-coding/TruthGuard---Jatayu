import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const data = await getMe();
      // Handle data wrapped in data.user or data directly
      setUser(data.user || data.data || data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    const loggedInUser = data.user || data.data || data;
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (name, email, password) => {
    const data = await apiRegister(name, email, password);
    const registeredUser = data.user || data.data || data;
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser: checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
