import { useEffect, useRef, useState } from 'react';
import { Download, KeyRound } from 'lucide-react';
import BotonCopiar from './BotonCopiar';
import BotonPrincipal from './BotonPrincipal';
import { textoArchivoCodigos } from '../codigos';
import { descargarTexto } from '../navegador';

const NOMBRE_ARCHIVO = 'codigos-respaldo-libreria-oskar.txt';

// Se muestran una sola vez: el padre los descarta de su estado en onContinuar.
export default function CodigosRespaldo({ codigos, email, onContinuar, textoContinuar = 'Continuar' }) {
  const [guardados, setGuardados] = useState(false);
  const titulo = useRef(null);

  useEffect(() => {
    titulo.current?.focus();
  }, []);

  const descargar = () => {
    descargarTexto(NOMBRE_ARCHIVO, textoArchivoCodigos({ email, codigos, fecha: new Date() }));
  };

  return (
    <div className="space-y-4">
      <h2 ref={titulo} tabIndex={-1} className="text-base font-bold text-[#252525] flex items-center gap-2 outline-none">
        <KeyRound className="w-4 h-4 text-[#e19922]" />
        Guarda tus códigos de respaldo
      </h2>
      <p className="text-xs text-gray-600">
        Te sirven para entrar si no tienes tu teléfono. Cada código funciona una sola vez y no se volverán a mostrar.
      </p>

      <ul
        aria-label="Códigos de respaldo"
        className="grid grid-cols-2 gap-2 p-3 bg-[#f3f3f3] border border-gray-200 rounded-xl font-mono text-sm text-[#252525] select-all"
      >
        {codigos.map((codigo) => (
          <li key={codigo} className="text-center">{codigo}</li>
        ))}
      </ul>

      <div className="flex flex-wrap items-start gap-2">
        <BotonCopiar texto={codigos.join('\n')} etiqueta="Copiar códigos" />
        <button
          type="button"
          onClick={descargar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#252525] bg-white border border-gray-200 rounded-xl hover:border-[#b07c19] hover:text-[#b07c19] transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Descargar .txt</span>
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#252525] cursor-pointer">
        <input
          type="checkbox"
          checked={guardados}
          onChange={(e) => setGuardados(e.target.checked)}
          className="w-4 h-4 accent-[#b07c19]"
        />
        Ya los guardé en un lugar seguro
      </label>

      <BotonPrincipal type="button" disabled={!guardados} onClick={onContinuar}>
        {textoContinuar}
      </BotonPrincipal>
    </div>
  );
}
