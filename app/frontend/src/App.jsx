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
import Ventas from './views/Ventas';
import NuevaVenta from './views/NuevaVenta';
import VentaDetalle from './views/VentaDetalle';
import Login from './views/Login';
import Usuarios from './views/Usuarios';
import Categorias from './views/Categorias';
import GestionLibros from './views/GestionLibros';
import Reportes from './views/Reportes';
import { ROLES_POR_RUTA } from './utils/roles';

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
              <ProtectedRoute roles={ROLES_POR_RUTA.registrar}>
                <RegistrarLibro onShowToast={showToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventario"
            element={
              <ProtectedRoute roles={ROLES_POR_RUTA.inventario}>
                <Inventario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ventas"
            element={
              <ProtectedRoute roles={ROLES_POR_RUTA.ventas}>
                <Ventas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ventas/nueva"
            element={
              <ProtectedRoute roles={ROLES_POR_RUTA.ventas}>
                <NuevaVenta />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ventas/:id"
            element={
              <ProtectedRoute roles={ROLES_POR_RUTA.ventas}>
                <VentaDetalle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute roles={ROLES_POR_RUTA.usuarios}>
                <Usuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categorias"
            element={
              <ProtectedRoute roles={ROLES_POR_RUTA.categorias}>
                <Categorias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/libros/gestion"
            element={
              <ProtectedRoute roles={ROLES_POR_RUTA.gestionLibros}>
                <GestionLibros />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedRoute roles={ROLES_POR_RUTA.reportes}>
                <Reportes />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/catalogo" replace />} />
        </Routes>
      </main>
    </div>
  );
}
