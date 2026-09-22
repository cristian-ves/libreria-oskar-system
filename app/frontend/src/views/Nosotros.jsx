import React from 'react';
import { BookOpen, MapPin, Phone, Mail } from 'lucide-react';

export default function Nosotros() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        {/* Encabezado e Introducción */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-4 h-4 text-[#e19922]" />
            <span>Nuestra Librería</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight mb-4">
            Libros <span className="bg-[#e8c85e] text-[#252525] px-1.5 py-0.5 rounded-md">Oskar</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed max-w-3xl">
            Nuestra librería es un espacio para quienes aman leer sin prisa. Cada libro ha sido elegido con cuidado, pensando en lectores curiosos, apasionados y sensibles a las buenas historias. Creemos que leer importa, y que cada lectura deja algo.
          </p>
        </div>

        {/* Tarjeta de Información de Contacto */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider border-b border-gray-100 pb-3">
            Información de Contacto
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Dirección */}
            <div className="bg-[#f3f3f3] border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold">
                <MapPin className="w-4 h-4 shrink-0 text-[#e19922]" />
                <span>Dirección</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                Centro Comercial Paulinos Local L6, Quetzaltenango
              </p>
            </div>

            {/* Teléfono */}
            <a
              href="tel:+50256147611"
              className="bg-[#f3f3f3] border border-gray-200 hover:border-[#b07c19] hover:bg-white rounded-xl p-4 flex flex-col gap-2 transition-all group cursor-pointer shadow-2xs hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold">
                <Phone className="w-4 h-4 shrink-0 text-[#e19922]" />
                <span>Teléfono</span>
              </div>
              <span className="text-xs text-gray-700 group-hover:text-[#b07c19] transition-colors font-mono font-bold">
                5614 7611
              </span>
            </a>

            {/* Correo */}
            <a
              href="mailto:librososkar25@gmail.com"
              className="bg-[#f3f3f3] border border-gray-200 hover:border-[#b07c19] hover:bg-white rounded-xl p-4 flex flex-col gap-2 transition-all group cursor-pointer shadow-2xs hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold">
                <Mail className="w-4 h-4 shrink-0 text-[#e19922]" />
                <span>Correo</span>
              </div>
              <span className="text-xs text-gray-700 group-hover:text-[#b07c19] transition-colors break-all font-medium">
                librososkar25@gmail.com
              </span>
            </a>
          </div>
        </div>

        {/* Mapa de Ubicación */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#b07c19]">
            <MapPin className="w-4 h-4 text-[#e19922]" />
            <h2 className="text-sm font-bold text-[#252525] uppercase tracking-wider">Ubicación</h2>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 shadow-2xs">
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
