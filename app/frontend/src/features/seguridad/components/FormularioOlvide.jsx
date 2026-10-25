import { Mail } from 'lucide-react';
import AlertaError from './AlertaError';
import BotonPrincipal from './BotonPrincipal';
import CampoAcceso from './CampoAcceso';
import EnlaceSecundario from './EnlaceSecundario';

export default function FormularioOlvide({ email, setEmail, enviando, error, onEnviar, refCampo }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!enviando) onEnviar();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AlertaError error={error} />
      <CampoAcceso
        id="olvide-email"
        ref={refCampo}
        label="Correo Electrónico"
        icono={Mail}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="empleado@libreriaoskar.com"
      />
      <BotonPrincipal type="submit" cargando={enviando} textoCargando="Enviando..." className="mt-2">
        <span>Enviar enlace</span>
      </BotonPrincipal>
      <p className="text-center"><EnlaceSecundario to="/login">Volver a iniciar sesión</EnlaceSecundario></p>
    </form>
  );
}
