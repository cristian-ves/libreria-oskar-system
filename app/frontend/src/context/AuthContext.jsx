import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('oskar_token');
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Al montar, si hay token lo valida con GET /api/auth/me y limpia la sesión si falla
  useEffect(() => {
    async function validarSesion() {
      let storedToken = null;
      try {
        storedToken = localStorage.getItem('oskar_token');
      } catch (err) {
        console.error('[AUTH CONTEXT]: Error leyendo token:', err);
      }

      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          setUser(json.data);
          setToken(storedToken);
        } else {
          try {
            localStorage.removeItem('oskar_token');
          } catch {}
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.error('[AUTH CONTEXT]: Error al verificar sesión:', err);
        try {
          localStorage.removeItem('oskar_token');
        } catch {}
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    validarSesion();
  }, []);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || 'Error al iniciar sesión');
    }

    const { token: nuevoToken, usuario } = result.data;

    try {
      localStorage.setItem('oskar_token', nuevoToken);
    } catch (err) {
      console.error('[AUTH CONTEXT]: Error guardando token en localStorage:', err);
    }

    setToken(nuevoToken);
    setUser(usuario);
    return usuario;
  };

  const logout = () => {
    try {
      localStorage.removeItem('oskar_token');
    } catch (err) {
      console.error('[AUTH CONTEXT]: Error al borrar token de localStorage:', err);
    }
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
