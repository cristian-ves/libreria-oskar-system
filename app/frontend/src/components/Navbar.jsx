import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Barcode, Warehouse, ShieldCheck, LogOut, Info, BookOpen, Receipt, Menu, X, Users, Tags, BarChart3, Building2,
} from 'lucide-react';
import { ROLES, ROLES_OPERATIVOS, puedeAcceder } from '../utils/roles';
import logo from '../assets/logo.jpg';

const seccionesNavegacion = [
  {
    id: 'principal',
    enlaces: [
      { path: '/catalogo', label: 'Catálogo', icon: BookOpen, publico: true },
      { path: '/nosotros', label: 'Nosotros', icon: Info, publico: true },
      { path: '/registrar', label: 'Registrar', icon: Barcode, roles: ROLES_OPERATIVOS },
      { path: '/inventario', label: 'Inventario', icon: Warehouse, roles: ROLES_OPERATIVOS },
      { path: '/ventas', label: 'Ventas', icon: Receipt, roles: ROLES_OPERATIVOS },
    ],
  },
  {
    id: 'administracion', label: 'Administración', enlaces: [
      { path: '/usuarios', label: 'Usuarios', icon: Users, roles: [ROLES.ADMINISTRADOR] },
      { path: '/categorias', label: 'Categorías', icon: Tags, roles: [ROLES.ADMINISTRADOR] },
      { path: '/libros/gestion', label: 'Gestión de libros', icon: BookOpen, roles: [ROLES.ADMINISTRADOR] },
      { path: '/reportes', label: 'Reportes', icon: BarChart3, roles: [ROLES.ADMINISTRADOR] },
      { path: '/sucursales', label: 'Sucursales y bodegas', icon: Building2, roles: [ROLES.ADMINISTRADOR] },
    ],
  },
  {
    id: 'cuenta', label: 'Mi cuenta / Seguridad', enlaces: [
      { path: '/cuenta/seguridad', label: 'Seguridad de la cuenta', icon: ShieldCheck, soloSesion: true },
    ],
  },
];

function mostrarEnlace(enlace, user) {
  if (!user) return Boolean(enlace.publico);
  return enlace.publico || enlace.soloSesion || puedeAcceder(user, enlace.roles);
}

function Enlaces({ enlaces, mobile = false, onNavigate }) {
  return enlaces.map((link) => {
    const Icon = link.icon;
    return (
      <NavLink
        key={link.path}
        to={link.path}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex min-h-11 items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b07c19] ${
            isActive
              ? 'bg-[#e19922] text-[#252525] shadow-xs'
              : 'text-[#252525] hover:bg-[#b07c19] hover:text-white'
          } ${mobile ? 'w-full' : ''}`
        }
      >
        <Icon aria-hidden="true" className="w-4 h-4 shrink-0" />
        <span>{link.label}</span>
      </NavLink>
    );
  });
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  const botonMenuRef = useRef(null);
  const seccionesVisibles = seccionesNavegacion
    .map((seccion) => ({
      ...seccion,
      enlaces: seccion.enlaces.filter((enlace) => mostrarEnlace(enlace, user)),
    }))
    .filter((seccion) => seccion.enlaces.length > 0);

  const cerrarMenu = () => setMenuAbierto(false);

  useEffect(() => { setMenuAbierto(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuAbierto) return undefined;
    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') {
        cerrarMenu();
        botonMenuRef.current?.focus();
      }
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [menuAbierto]);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logo} alt="Librería Oskar" className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-gray-200" />
            <div className="min-w-0">
              <span className="font-extrabold text-[#252525] text-lg tracking-tight truncate block">
                Librería <span className="bg-[#e8c85e] text-[#252525] px-1.5 py-0.5 rounded-md shadow-xs">Oskar</span>
              </span>
              <p className="text-xs text-gray-500 hidden sm:block truncate">Sistema de Inventario y Catálogo</p>
            </div>
          </div>

          <nav aria-label="Navegación principal" className="hidden 2xl:flex items-center gap-1">
            {seccionesVisibles.map((seccion) => (
              <div key={seccion.id} className="flex items-center gap-1">
                {seccion.label && <span className="sr-only">{seccion.label}</span>}
                <Enlaces enlaces={seccion.enlaces} />
              </div>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <>
                <NavLink to="/cuenta/seguridad" aria-label={`${user.nombre_completo}, mi cuenta y seguridad`} className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full bg-[#e8c85e] border border-[#b07c19] text-xs font-bold text-[#252525] hover:ring-2 hover:ring-[#e19922] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b07c19]" title={`${user.nombre_completo} (${user.rol})`}>
                  {user.nombre_completo ? user.nombre_completo.charAt(0).toUpperCase() : 'U'}
                </NavLink>
                <NavLink to="/cuenta/seguridad" aria-label={`${user.nombre_completo}, mi cuenta y seguridad`} className="hidden sm:flex items-center gap-2 text-xs bg-[#f3f3f3] px-3 py-1.5 rounded-xl border border-gray-200 shadow-xs hover:border-[#b07c19] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b07c19]">
                  <ShieldCheck aria-hidden="true" className="w-4 h-4 text-[#b07c19]" />
                  <span className="text-[#252525] font-semibold truncate max-w-[130px] sm:max-w-[180px]">{user.nombre_completo}</span>
                  <span className="text-gray-500 font-mono text-[11px]">({user.rol})</span>
                </NavLink>
                <button type="button" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión" className="flex min-h-11 items-center gap-1.5 px-2.5 sm:px-3 text-xs text-gray-600 hover:text-white hover:bg-red-600 rounded-xl transition-colors border border-gray-200 hover:border-red-600">
                  <LogOut aria-hidden="true" className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </>
            )}
            <button
              type="button"
              ref={botonMenuRef}
              className="2xl:hidden inline-flex items-center justify-center min-w-11 min-h-11 rounded-xl border border-gray-200 text-[#252525] hover:bg-[#f3f3f3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b07c19]"
              aria-label={menuAbierto ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              aria-expanded={menuAbierto}
              aria-controls="navegacion-movil"
              onClick={() => setMenuAbierto((abierto) => !abierto)}
            >
              {menuAbierto ? <X aria-hidden="true" className="w-5 h-5" /> : <Menu aria-hidden="true" className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <nav id="navegacion-movil" aria-label="Navegación móvil" className={`${menuAbierto ? 'block' : 'hidden'} 2xl:hidden border-t border-gray-200 px-4 py-3 bg-white`}>
          <div className="max-w-7xl mx-auto flex max-h-[calc(100dvh-5rem)] flex-col gap-1 overflow-y-auto overscroll-contain">
            {seccionesVisibles.map((seccion) => (
              <div key={seccion.id} className="flex flex-col gap-1">
                {seccion.label && <h2 className="px-3 pt-2 text-xs font-bold uppercase tracking-wide text-gray-500">{seccion.label}</h2>}
                <Enlaces enlaces={seccion.enlaces} mobile onNavigate={cerrarMenu} />
              </div>
            ))}
          </div>
      </nav>
    </header>
  );
}
