import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full py-6 text-center text-xs text-slate-500 border-t border-slate-800/80 space-y-2">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-slate-400">
        <a href="tel:+50256147611" className="hover:text-emerald-400 transition-colors">
          Tel: 5614 7611
        </a>
        <span className="text-slate-700 hidden sm:inline">·</span>
        <a href="mailto:librososkar25@gmail.com" className="hover:text-emerald-400 transition-colors">
          librososkar25@gmail.com
        </a>
        <span className="text-slate-700 hidden sm:inline">·</span>
        <Link to="/nosotros" className="hover:text-emerald-400 transition-colors">
          Más información
        </Link>
      </div>
      <p className="text-slate-500">Libros Oskar © 2026 · Todos los derechos reservados</p>
    </footer>
  );
}
