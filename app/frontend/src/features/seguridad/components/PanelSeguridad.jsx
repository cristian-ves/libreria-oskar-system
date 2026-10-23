import { ShieldCheck, ShieldOff, RefreshCw, Loader2 } from 'lucide-react';
import AlertaError from './AlertaError';
import CodigosRespaldo from './CodigosRespaldo';
import FormularioRegenerar from './FormularioRegenerar';

export default function PanelSeguridad({ email, seguridad }) {
  const {
    estado, loading, error, recargar, regenerando, errorRegenerar, estadoRegenerar,
    codigosNuevos, regenerar, reintentarRegenerar, cerrarCodigos,
  } = seguridad;

  if (loading && !estado) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-gray-600 py-4">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando...
      </p>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <AlertaError error={error} />
        <button
          type="button"
          onClick={recargar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#252525] bg-white border border-gray-200 rounded-xl hover:border-[#b07c19] hover:text-[#b07c19] cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      </div>
    );
  }

  if (codigosNuevos) {
    return <CodigosRespaldo codigos={codigosNuevos} email={email} onContinuar={cerrarCodigos} textoContinuar="Listo" />;
  }

  if (!estado.activo) {
    return (
      <div className="flex items-start gap-3">
        <ShieldOff className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[#252525]">Verificación en dos pasos: no está activada</p>
          <p className="text-xs text-gray-600 mt-1">
            {estado.obligatorio
              ? 'Se te pedirá configurarla al iniciar sesión.'
              : 'Tu cuenta entra solo con correo y contraseña.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3" role="status">
        <ShieldCheck className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[#252525]">Verificación en dos pasos: activa</p>
          <p className="text-xs text-gray-600 mt-1">
            Códigos de respaldo disponibles: <span className="font-bold">{estado.codigosRespaldoRestantes}</span> de 10
          </p>
        </div>
      </div>
      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-xs font-bold text-[#252525] uppercase tracking-wider mb-3">Códigos de respaldo</h3>
        <FormularioRegenerar
          regenerando={regenerando}
          error={errorRegenerar}
          estadoCodigo={estadoRegenerar}
          onRegenerar={regenerar}
          onReintentar={reintentarRegenerar}
        />
      </div>
    </div>
  );
}
