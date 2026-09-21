import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Barcode, Warehouse, ShieldCheck, LogOut, Info } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  const navLinks = user
    ? [
        { path: '/registrar', label: 'Registrar', icon: Barcode, badge: 'Escáner' },
        { path: '/catalogo', label: 'Catálogo', icon: BookOpen },
        { path: '/inventario', label: 'Inventario', icon: Warehouse },
        { path: '/nosotros', label: 'Nosotros', icon: Info },
      ]
    : [
        { path: '/catalogo', label: 'Catálogo', icon: BookOpen },
        { path: '/nosotros', label: 'Nosotros', icon: Info },
      ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 gap-2">
          {/* Logo y título */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30 shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-white text-lg tracking-tight truncate block">Librería Oskar</span>
              <p className="text-xs text-slate-400 hidden sm:block truncate">Sistema de Inventario y Catálogo</p>
            </div>
          </div>

          {/* Navegación central en pantallas medianas y grandes */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-bold rounded-full">
                      {link.badge}
                    </span>
                  )}
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
                  className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-400"
                  title={`${user.nombre_completo} (${user.rol})`}
                >
                  {user.nombre_completo ? user.nombre_completo.charAt(0).toUpperCase() : 'U'}
                </div>

                {/* Bloque completo en pantallas sm o mayores */}
                <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-slate-300 font-medium truncate max-w-[130px] sm:max-w-[180px]">
                    {user.nombre_completo}
                  </span>
                  <span className="text-slate-500 font-mono text-[11px]">({user.rol})</span>
                </div>

                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
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
      <nav className="md:hidden border-t border-slate-800/80 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {navLinks.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{link.label}</span>
              {link.badge && (
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500 text-slate-950 font-bold rounded-full">
                  {link.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
