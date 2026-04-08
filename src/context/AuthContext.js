import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthAPI } from '../utils/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'inv_jwt_token';
const USER_KEY  = 'inv_user_data';

export function AuthProvider({ children }) {
  const [token, setToken]       = useState(null);
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);

  // ── Load persisted session ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn('Failed to load session:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Save session ──────────────────────────────────────────────────────────
  const saveSession = useCallback(async (jwt, userData) => {
    await SecureStore.setItemAsync(TOKEN_KEY, jwt);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  }, []);

  // ── Sign up ───────────────────────────────────────────────────────────────
  const signup = useCallback(async (name, email, password, storeName) => {
    const res = await AuthAPI.signup({ name, email, password, storeName });
    await saveSession(res.token, res.user);
    return res;
  }, [saveSession]);

  // ── Sign in ───────────────────────────────────────────────────────────────
  const signin = useCallback(async (email, password) => {
    const res = await AuthAPI.signin({ email, password });
    await saveSession(res.token, res.user);
    return res;
  }, [saveSession]);

  // ── Sign out ──────────────────────────────────────────────────────────────
  const signout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, loading, signup, signin, signout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
