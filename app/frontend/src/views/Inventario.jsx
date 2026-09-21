import React, { useState, useEffect } from 'react';
import { Warehouse, AlertTriangle, CheckCircle, MapPin, Building, ShieldCheck } from 'lucide-react';

export default function Inventario() {
  const [bodegas, setBodegas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarBodegas() {
      try {
        setLoading(true);
        const res = await fetch('/api/bodegas');
        if (res.ok) {
          const json = await res.json();
          setBodegas(json.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    cargarBodegas();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono uppercase tracking-wider mb-1">
          <Warehouse className="w-4 h-4" />
          <span>Infraestructura Multi-Sucursal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Bodegas y Control de Existencias
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Ubicaciones físicas habilitadas para recepción, resguardo y despacho de libros.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-44 bg-slate-900 rounded-2xl animate-pulse" />
          <div className="h-44 bg-slate-900 rounded-2xl animate-pulse" />
        </div>
      ) : bodegas.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          No hay bodegas registradas.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bodegas.map((b) => (
            <div
              key={b.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <Warehouse className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Activa
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-1">{b.nombre}</h3>
              <p className="text-xs text-slate-400 mb-4">{b.descripcion || 'Sin descripción'}</p>

              <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-300">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>Sucursal: <strong className="text-white">{b.sucursal_nombre}</strong></span>
              </div>

              <div className="mt-2 text-[11px] font-mono text-slate-400 truncate">
                ID: {b.id}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
