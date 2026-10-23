import { useState } from 'react';
import { Loader2, Smartphone } from 'lucide-react';
import AlertaError from './AlertaError';
import BotonCopiar from './BotonCopiar';
import BotonPrincipal from './BotonPrincipal';
import CampoCodigoTotp from './CampoCodigoTotp';
import { agruparClave, totpCompleto } from '../codigos';
import useFocoCodigo from '../hooks/useFocoCodigo';

const ID_CAMPO = 'configurar-totp';

// Recibe `alta` ya cargada por useLoginDosPasos (una sola llamada a /configurar por login).
// Reintentar tras un código inválido solo limpia el campo: no vuelve a pedir /configurar.
export default function PasoConfigurar({ alta, enviando, error, requiereReinicio, estadoCodigo, onActivar, onVolver, onReintentar }) {
  const [codigo, setCodigo] = useState('');
  const foco = useFocoCodigo(estadoCodigo, ID_CAMPO);
  const detenido = Boolean(estadoCodigo);

  if (!alta) {
    return error ? (
      <div className="space-y-4">
        <AlertaError error={error} />
        <BotonPrincipal type="button" onClick={onVolver}>Volver a iniciar sesión</BotonPrincipal>
      </div>
    ) : (
      <p role="status" className="flex items-center justify-center gap-2 text-sm text-gray-600 py-6">
        <Loader2 className="w-4 h-4 animate-spin" />
        Preparando la configuración...
      </p>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (totpCompleto(codigo) && !enviando && !requiereReinicio && !detenido) onActivar(codigo);
  };

  const reintentar = () =>
    foco.reintentar(() => {
      setCodigo('');
      onReintentar();
    });

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-600">
        Tu cuenta necesita un código extra al entrar. Agrega Librería Oskar en tu app de autenticación
        (Google Authenticator, Microsoft Authenticator u otra).
      </p>

      <img
        src={alta.qrDataUrl}
        alt="Código QR para agregar Librería Oskar a tu app de autenticación"
        className="w-48 h-48 mx-auto border border-gray-200 rounded-xl bg-white"
      />

      <a
        href={alta.otpauthUrl}
        className="md:hidden w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-bold text-[#252525] bg-[#e8c85e] rounded-xl border border-[#b07c19]"
      >
        <Smartphone className="w-4 h-4" />
        Abrir en mi app de autenticación
      </a>

      <div className="p-3 bg-[#f3f3f3] border border-gray-200 rounded-xl space-y-2">
        <p className="text-xs text-gray-600">O escribe esta clave en la app:</p>
        <p className="font-mono text-sm font-bold text-[#252525] break-all select-all">{agruparClave(alta.secretoManual)}</p>
        <BotonCopiar texto={String(alta.secretoManual).replace(/\s/g, '')} etiqueta="Copiar clave" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AlertaError
          error={error}
          onReintentar={estadoCodigo === 'invalido' ? reintentar : undefined}
          refFoco={detenido ? foco.refFoco : undefined}
        />
        <CampoCodigoTotp
          id={ID_CAMPO}
          label="Código que muestra la app"
          value={codigo}
          onChange={setCodigo}
          disabled={enviando || detenido}
          autoFocus
        />
        <p className="text-[11px] text-gray-500">
          Si el código no funciona, revisa que la hora de tu teléfono esté en automático.
        </p>
        {requiereReinicio ? (
          <BotonPrincipal type="button" onClick={onVolver}>Volver a iniciar sesión</BotonPrincipal>
        ) : (
          <BotonPrincipal type="submit" disabled={!totpCompleto(codigo) || detenido} cargando={enviando} textoCargando="Activando...">
            Activar
          </BotonPrincipal>
        )}
      </form>

      {!requiereReinicio && (
        <button type="button" onClick={onVolver} className="block mx-auto text-xs text-gray-500 hover:underline cursor-pointer">
          Volver
        </button>
      )}
    </div>
  );
}
