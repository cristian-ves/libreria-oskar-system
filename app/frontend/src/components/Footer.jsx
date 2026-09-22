import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full py-6 text-center text-xs text-gray-500 border-t border-gray-200 space-y-2 bg-transparent">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-gray-600 font-medium">
        <a href="tel:+50256147611" className="hover:text-[#b07c19] transition-colors">
          Tel: 5614 7611
        </a>
        <span className="text-gray-300 hidden sm:inline">·</span>
        <a href="mailto:librososkar25@gmail.com" className="hover:text-[#b07c19] transition-colors">
          librososkar25@gmail.com
        </a>
        <span className="text-gray-300 hidden sm:inline">·</span>
        <Link to="/nosotros" className="hover:text-[#b07c19] transition-colors">
          Más información
        </Link>
      </div>
      <p className="text-gray-400">Libros Oskar © 2026 · Todos los derechos reservados</p>
    </footer>
  );
}
