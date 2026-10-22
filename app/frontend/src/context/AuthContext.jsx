import React, { createContext, useContext, useState, useEffect } from 'react';

import { fetchSesion, loginRequest } from '../services/api/auth.api';
import { getToken, setToken as saveToken, clearToken } from '../utils/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, si hay token lo valida con GET /api/auth/me y limpia la sesión si falla
  useEffect(() => {
    async function validarSesion() {
      const storedToken = getToken();

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetchSesion(storedToken);

        if (res.ok) {
          const json = await res.json();
          setUser(json.data);
          setToken(storedToken);
        } else {
          clearToken();
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('[AUTH CONTEXT]: Error al verificar sesión:', err);
        clearToken();
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    validarSesion();
  }, []);

  const login = async (email, password) => {
    const response = await loginRequest(email, password);

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || 'Error al iniciar sesión');
    }

    const { token: nuevoToken, usuario } = result.data;

    saveToken(nuevoToken);

    setToken(nuevoToken);
    setUser(usuario);
    return usuario;
  };

  const logout = () => {
    clearToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
