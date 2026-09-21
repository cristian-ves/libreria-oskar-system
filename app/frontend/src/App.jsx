import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import RegistrarLibro from './views/RegistrarLibro';
import Catalogo from './views/Catalogo';
import Inventario from './views/Inventario';

export default function App() {
  const [activeTab, setActiveTab] = useState('registrar');
  const [toast, setToast] = useState(null);

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
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Contenido Dinámico de la SPA */}
      <main className="flex-1">
        {activeTab === 'registrar' && (
          <RegistrarLibro onShowToast={showToast} />
        )}
        {activeTab === 'catalogo' && (
          <Catalogo onNavigateToScanner={() => setActiveTab('registrar')} />
        )}
        {activeTab === 'inventario' && (
          <Inventario />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Librería Oskar &copy; 2026 · Sistema de Inventario y Catálogo</span>
          <span className="font-mono text-emerald-400/80">React SPA + Tailwind CSS + html5-qrcode</span>
        </div>
      </footer>
    </div>
  );
}
