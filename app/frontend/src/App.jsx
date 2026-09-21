import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import RegistrarLibro from './views/RegistrarLibro';
import Catalogo from './views/Catalogo';
import LibroDetalle from './views/LibroDetalle';
import Inventario from './views/Inventario';
import Login from './views/Login';

export default function App() {
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  const showToast = (toastData) => {
    setToast(toastData);
  };

  const closeToast = () => {
    setToast(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
      {/* Notificación flotante Toast */}
      <Toast toast={toast} onClose={closeToast} />

      {/* Barra de Navegación */}
      <Navbar />

      {/* Contenido Dinámico con React Router */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<Navigate to="/catalogo" replace />} />
          <Route
            path="/catalogo"
            element={<Catalogo onNavigateToScanner={() => navigate('/registrar')} />}
          />
          <Route path="/catalogo/:ref" element={<LibroDetalle />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/registrar"
            element={
              <ProtectedRoute roles={['Administrador', 'Empleado']}>
                <RegistrarLibro onShowToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventario"
            element={
              <ProtectedRoute roles={['Administrador', 'Empleado']}>
                <Inventario />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/catalogo" replace />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <span>Librería Oskar &copy; 2026 · Sistema de Inventario y Catálogo</span>
        </div>
      </footer>
    </div>
  );
}
