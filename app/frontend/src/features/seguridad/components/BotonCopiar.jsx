import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copiarTexto } from '../navegador';

export default function BotonCopiar({ texto, etiqueta = 'Copiar' }) {
  const [estado, setEstado] = useState(''); // '' | 'ok' | 'fallo'

  const copiar = async () => {
    let ok = false;
    try {
      ok = await copiarTexto(texto);
    } catch {
      ok = false;
    }
    setEstado(ok ? 'ok' : 'fallo');
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={copiar}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#252525] bg-white border border-gray-200 rounded-xl hover:border-[#b07c19] hover:text-[#b07c19] transition-colors cursor-pointer"
      >
        {estado === 'ok' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span>{estado === 'ok' ? 'Copiado' : etiqueta}</span>
      </button>
      <span role="status" className="text-[11px] text-gray-500">
        {estado === 'fallo' ? 'No se pudo copiar. Selecciónalo y cópialo manualmente.' : ''}
      </span>
    </div>
  );
}
