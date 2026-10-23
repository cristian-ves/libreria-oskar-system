import { useState } from 'react';
import AlertaError from './AlertaError';
import BotonPrincipal from './BotonPrincipal';
import CampoCodigoTotp from './CampoCodigoTotp';
import { totpCompleto } from '../codigos';
import useFocoCodigo from '../hooks/useFocoCodigo';

const ID_CAMPO = 'regenerar-totp';

// estadoCodigo 'invalido' | 'bloqueado' deshabilita campo y botón; solo 'invalido' ofrece reintento
export default function FormularioRegenerar({ regenerando, error, estadoCodigo, onRegenerar, onReintentar }) {
  const [codigo, setCodigo] = useState('');
  const foco = useFocoCodigo(estadoCodigo, ID_CAMPO);
  const detenido = Boolean(estadoCodigo);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!totpCompleto(codigo) || regenerando || detenido) return;
    const ok = await onRegenerar(codigo);
    if (ok) setCodigo('');
  };

  const reintentar = () =>
    foco.reintentar(() => {
      setCodigo('');
      onReintentar();
    });

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <p className="text-xs text-gray-600">
        Genera 10 códigos nuevos. Los anteriores dejarán de funcionar. Confirma con el código de tu app de autenticación.
      </p>
      <AlertaError
        error={error}
        onReintentar={estadoCodigo === 'invalido' ? reintentar : undefined}
        refFoco={detenido ? foco.refFoco : undefined}
      />
      <CampoCodigoTotp id={ID_CAMPO} value={codigo} onChange={setCodigo} disabled={regenerando || detenido} />
      <BotonPrincipal
        type="submit"
        disabled={!totpCompleto(codigo) || detenido}
        cargando={regenerando}
        textoCargando="Generando..."
      >
        Generar códigos nuevos
      </BotonPrincipal>
    </form>
  );
}
