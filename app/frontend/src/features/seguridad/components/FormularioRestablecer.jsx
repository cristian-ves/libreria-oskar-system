import { Lock } from 'lucide-react';
import AlertaError from './AlertaError';
import BotonPrincipal from './BotonPrincipal';
import CampoAcceso from './CampoAcceso';

export default function FormularioRestablecer({ flujo }) {
  const { estado, error, password, setPassword, confirmacion, setConfirmacion, mostrar, setMostrar, enviar, refCampo } = flujo;
  const enviando = estado === 'enviando';
  const type = mostrar ? 'text' : 'password';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!enviando) enviar();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertaError error={error} />
      <CampoAcceso
        id="restablecer-password"
        ref={refCampo}
        label="Nueva contraseña"
        icono={Lock}
        type={type}
        autoComplete="new-password"
        aria-describedby="restablecer-pista"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••••"
      />
      <CampoAcceso
        id="restablecer-confirmacion"
        label="Confirmar contraseña"
        icono={Lock}
        type={type}
        autoComplete="new-password"
        value={confirmacion}
        onChange={(e) => setConfirmacion(e.target.value)}
        placeholder="••••••••••"
      />
      <p id="restablecer-pista" className="text-xs text-gray-500">
        Mínimo 10 caracteres, con al menos una letra y un número.
      </p>
      <label className="flex items-center gap-2 text-xs text-[#252525] cursor-pointer">
        <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} className="accent-[#b07c19]" />
        Mostrar contraseñas
      </label>
      <BotonPrincipal type="submit" cargando={enviando} textoCargando="Cambiando..." className="mt-2">
        <span>Cambiar contraseña</span>
      </BotonPrincipal>
    </form>
  );
}
