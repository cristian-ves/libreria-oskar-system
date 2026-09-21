import React from 'react';
import { BookOpen, MapPin, Phone, Mail } from 'lucide-react';

export default function Nosotros() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Encabezado e Introducción */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Nuestra Librería</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
            Libros Oskar
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl">
            Nuestra librería es un espacio para quienes aman leer sin prisa. Cada libro ha sido elegido con cuidado, pensando en lectores curiosos, apasionados y sensibles a las buenas historias. Creemos que leer importa, y que cada lectura deja algo.
          </p>
        </div>

        {/* Tarjeta de Información de Contacto */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-3">
            Información de Contacto
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Dirección */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>Dirección</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Centro Comercial Paulinos Local L6, Quetzaltenango
              </p>
            </div>

            {/* Teléfono */}
            <a
              href="tel:+50256147611"
              className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 flex flex-col gap-2 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Phone className="w-4 h-4 shrink-0" />
                <span>Teléfono</span>
              </div>
              <span className="text-xs text-slate-300 group-hover:text-emerald-400 transition-colors font-mono">
                5614 7611
              </span>
            </a>

            {/* Correo */}
            <a
              href="mailto:librososkar25@gmail.com"
              className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 flex flex-col gap-2 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <Mail className="w-4 h-4 shrink-0" />
                <span>Correo</span>
              </div>
              <span className="text-xs text-slate-300 group-hover:text-emerald-400 transition-colors break-all">
                librososkar25@gmail.com
              </span>
            </a>
          </div>
        </div>

        {/* Mapa de Ubicación */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Ubicación</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <iframe
              src="https://www.google.com/maps?q=Centro+Comercial+Paulinos+Local+L6+Quetzaltenango+Guatemala&output=embed"
              className="w-full h-[350px] border-0"
              loading="lazy"
              title="Ubicación de Libros Oskar en Centro Comercial Paulinos, Quetzaltenango"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
