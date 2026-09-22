import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import RegistrarLibro from './views/RegistrarLibro';
import Catalogo from './views/Catalogo';
import LibroDetalle from './views/LibroDetalle';
import Nosotros from './views/Nosotros';
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
    <div className="min-h-screen bg-oskar-light text-oskar-dark flex flex-col font-sans selection:bg-oskar-gold selection:text-oskar-dark">
      {/* Notificación flotante Toast */}
      <Toast toast={toast} onClose={closeToast} />

      {/* Barra de Navegación Sticky con fondo 100% opaco y sombra */}
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
          <Route path="/nosotros" element={<Nosotros />} />
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
    </div>
  );
}
