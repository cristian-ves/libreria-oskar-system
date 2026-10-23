import { useState } from 'react';
import Input from '../../../components/ui/Input';
import AlertaError from './AlertaError';
import BotonPrincipal from './BotonPrincipal';
import CampoCodigoTotp from './CampoCodigoTotp';
import { formatearCodigoRespaldo, respaldoCompleto, totpCompleto } from '../codigos';
import useFocoCodigo from '../hooks/useFocoCodigo';

const CLASE_ENLACE = 'text-xs font-semibold text-[#b07c19] hover:underline cursor-pointer';

// estadoCodigo 'invalido' | 'bloqueado' deshabilita campo y botón; 'bloqueado' también el cambio app/respaldo
export default function PasoVerificar({
  enviando, error, requiereReinicio, estadoCodigo, onVerificar, onVolver, onCambioModo, onReintentar,
}) {
  const [modo, setModo] = useState('totp'); // 'totp' | 'respaldo'
  const [codigo, setCodigo] = useState('');
  const [respaldo, setRespaldo] = useState('');
  const esTotp = modo === 'totp';
  const listo = esTotp ? totpCompleto(codigo) : respaldoCompleto(respaldo);
  const detenido = Boolean(estadoCodigo);
  const foco = useFocoCodigo(estadoCodigo, esTotp ? 'verificar-totp' : 'verificar-respaldo');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!listo || enviando || requiereReinicio || detenido) return;
    onVerificar(esTotp ? { codigo } : { codigoRespaldo: respaldo });
  };

  // Tras un código inválido, cambiar de modo también limpia y rehabilita (el campo nuevo toma el foco)
  const cambiarModo = () => {
    if (detenido) {
      setCodigo('');
      setRespaldo('');
    }
    setModo(esTotp ? 'respaldo' : 'totp');
    onCambioModo();
  };

  const reintentar = () =>
    foco.reintentar(() => {
      if (esTotp) setCodigo('');
      else setRespaldo('');
      onReintentar();
    });

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-xs text-gray-600">
        {esTotp
          ? 'Escribe el código de 6 dígitos que muestra tu app de autenticación.'
          : 'Escribe uno de tus códigos de respaldo. Cada uno sirve una sola vez.'}
      </p>
      <AlertaError
        error={error}
        onReintentar={estadoCodigo === 'invalido' ? reintentar : undefined}
        refFoco={detenido ? foco.refFoco : undefined}
      />

      {esTotp ? (
        <CampoCodigoTotp key="totp" id="verificar-totp" value={codigo} onChange={setCodigo} disabled={enviando || detenido} autoFocus />
      ) : (
        <div key="respaldo">
          <label htmlFor="verificar-respaldo" className="block text-xs font-bold text-[#252525] mb-1.5">
            Código de respaldo
          </label>
          <Input
            id="verificar-respaldo"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={11}
            placeholder="XXXXX-XXXXX"
            value={respaldo}
            onChange={(e) => setRespaldo(formatearCodigoRespaldo(e.target.value))}
            disabled={enviando || detenido}
            autoFocus
            className="text-center font-mono text-lg tracking-widest"
          />
        </div>
      )}

      {requiereReinicio ? (
        <BotonPrincipal type="button" onClick={onVolver}>Volver a iniciar sesión</BotonPrincipal>
      ) : (
        <BotonPrincipal type="submit" disabled={!listo || detenido} cargando={enviando} textoCargando="Verificando...">
          Verificar
        </BotonPrincipal>
      )}

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={cambiarModo}
          disabled={estadoCodigo === 'bloqueado'}
          className={`${CLASE_ENLACE} disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline`}
        >
          {esTotp ? 'Usar un código de respaldo' : 'Usar el código de mi app'}
        </button>
        {!requiereReinicio && (
          <button type="button" onClick={onVolver} className="text-xs text-gray-500 hover:underline cursor-pointer">
            Volver
          </button>
        )}
      </div>
    </form>
  );
}
