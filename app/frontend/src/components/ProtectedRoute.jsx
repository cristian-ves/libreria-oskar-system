import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { ShieldAlert, BookOpen } from 'lucide-react';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <LoadingSpinner message="Verificando sesión..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.rol)) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-xl shadow-red-950/20">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acceso denegado</h2>
          <p className="text-sm text-slate-400 mb-6">
            Tu rol (<span className="text-emerald-400 font-mono font-medium">{user.rol}</span>) no tiene permisos para acceder a este módulo.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-semibold text-sm rounded-xl transition-all shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
            <span>Ir al Catálogo de Libros</span>
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
