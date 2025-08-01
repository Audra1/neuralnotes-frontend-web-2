import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  // Auto-login with dummy credentials for Electron app
  useEffect(() => {
    const autoLogin = async () => {
      try {
        // Check if we already have a token
        const existingToken = localStorage.getItem('auth_token');
        if (existingToken) {
          // Set dummy user for now
          setUser({
            id: 1,
            email: 'electron@app.com',
            username: 'electronuser'
          });
          setToken(existingToken);
          setLoading(false);
          return;
        }

        // Try to auto-login or create a default user
        console.log('Auto-logging in for Electron app...');
        
        // Set dummy user and token for Electron
        const dummyToken = 'electron-app-token-' + Date.now();
        const dummyUser = {
          id: 1,
          email: 'electron@app.com',
          username: 'electronuser'
        };

        localStorage.setItem('auth_token', dummyToken);
        setToken(dummyToken);
        setUser(dummyUser);
        
        console.log('✅ Auto-login successful for Electron app');
        
      } catch (error) {
        console.error('Auto-login failed:', error);
        // On error, still proceed with dummy user for Electron
        const dummyToken = 'electron-app-token-fallback';
        const dummyUser = {
          id: 1,
          email: 'electron@app.com',
          username: 'electronuser'
        };

        localStorage.setItem('auth_token', dummyToken);
        setToken(dummyToken);
        setUser(dummyUser);
      } finally {
        setLoading(false);
      }
    };

    autoLogin();
  }, []);

  // Configure axios to include auth token in all requests
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:8001/api/auth/login', {
        email,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const register = async (email, username, password) => {
    try {
      const response = await axios.post('http://localhost:8001/api/auth/register', {
        email,
        username,
        password
      });

      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem('auth_token', newToken);
      setToken(newToken);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};