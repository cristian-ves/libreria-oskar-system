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
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#252525] mb-2">Acceso denegado</h2>
          <p className="text-sm text-gray-500 mb-6">
            Tu rol (<span className="text-[#b07c19] font-mono font-bold">{user.rol}</span>) no tiene permisos para acceder a este módulo.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white font-bold text-sm rounded-xl transition-all shadow-xs"
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
