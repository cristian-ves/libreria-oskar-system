import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Barcode, Warehouse, ShieldCheck, LogOut, Info, BookOpen } from 'lucide-react';
import logo from '../assets/logo.jpg';

export default function Navbar() {
  const { user, logout } = useAuth();

  const navLinks = user
    ? [
        { path: '/registrar', label: 'Registrar', icon: Barcode },
        { path: '/catalogo', label: 'Catálogo', icon: BookOpen },
        { path: '/inventario', label: 'Inventario', icon: Warehouse },
        { path: '/nosotros', label: 'Nosotros', icon: Info },
      ]
    : [
        { path: '/catalogo', label: 'Catálogo', icon: BookOpen },
        { path: '/nosotros', label: 'Nosotros', icon: Info },
      ];

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 gap-2">
          {/* Logo y título con resalte dorado e8c85e */}
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logo}
              alt="Librería Oskar"
              className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-gray-200"
            />
            <div className="min-w-0">
              <span className="font-extrabold text-[#252525] text-lg tracking-tight truncate block">
                Librería <span className="bg-[#e8c85e] text-[#252525] px-1.5 py-0.5 rounded-md shadow-xs">Oskar</span>
              </span>
              <p className="text-xs text-gray-500 hidden sm:block truncate">Sistema de Inventario y Catálogo</p>
            </div>
          </div>

          {/* Navegación central con hover b07c19 y activo e19922 */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#e19922] text-[#252525] shadow-xs'
                        : 'text-[#252525] hover:bg-[#b07c19] hover:text-white hover:-translate-y-0.5'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Usuario / Sesión activa */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user && (
              <div className="flex items-center gap-2">
                {/* Avatar con inicial en móvil */}
                <div
                  className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-[#e8c85e] border border-[#b07c19] text-xs font-bold text-[#252525]"
                  title={`${user.nombre_completo} (${user.rol})`}
                >
                  {user.nombre_completo ? user.nombre_completo.charAt(0).toUpperCase() : 'U'}
                </div>

                {/* Bloque completo en pantallas sm o mayores */}
                <div className="hidden sm:flex items-center gap-2 text-xs bg-[#f3f3f3] px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-[#b07c19]" />
                  <span className="text-[#252525] font-semibold truncate max-w-[130px] sm:max-w-[180px]">
                    {user.nombre_completo}
                  </span>
                  <span className="text-gray-500 font-mono text-[11px]">({user.rol})</span>
                </div>

                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-gray-600 hover:text-white hover:bg-red-600 rounded-xl transition-all hover:-translate-y-0.5 border border-gray-200 hover:border-red-600"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navegación móvil con scroll horizontal */}
      <nav className="md:hidden border-t border-gray-200 px-4 py-2 flex items-center gap-2 overflow-x-auto bg-white">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#e19922] text-[#252525]'
                    : 'text-[#252525] hover:bg-[#b07c19] hover:text-white'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
