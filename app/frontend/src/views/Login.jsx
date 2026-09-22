import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import logo from '../assets/logo.jpg';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/registrar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200">
        {/* Cabecera del formulario */}
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="Librería Oskar"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-sm border border-gray-200"
          />
          <h1 className="text-2xl font-extrabold text-[#252525] tracking-tight">
            Iniciar <span className="bg-[#e8c85e] text-[#252525] px-1.5 py-0.5 rounded-md">Sesión</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1.5">Acceso para personal administrativo y bodegueros</p>
        </div>

        {/* Mensaje de error en línea */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-sm font-medium">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#252525] mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="empleado@libreriaoskar.com"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#f3f3f3] border border-gray-200 rounded-xl text-sm text-[#252525] placeholder-gray-400 focus:outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#252525] mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#f3f3f3] border border-gray-200 rounded-xl text-sm text-[#252525] placeholder-gray-400 focus:outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white font-bold text-sm rounded-xl transition-all shadow-xs hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <span>Ingresar al Sistema</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
