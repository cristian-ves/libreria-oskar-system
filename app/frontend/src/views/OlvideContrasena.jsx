import useSolicitarRecuperacion from '../features/seguridad/hooks/useSolicitarRecuperacion';
import TarjetaAcceso, { Etiqueta } from '../features/seguridad/components/TarjetaAcceso';
import FormularioOlvide from '../features/seguridad/components/FormularioOlvide';
import ConfirmacionSolicitud from '../features/seguridad/components/ConfirmacionSolicitud';

export default function OlvideContrasena() {
  const flujo = useSolicitarRecuperacion();
  const enviado = flujo.estado === 'enviado';

  return (
    <TarjetaAcceso
      titulo={<>Recuperar <Etiqueta>Contraseña</Etiqueta></>}
      subtitulo={enviado ? 'Revisa tu correo' : 'Te enviaremos un enlace para elegir una nueva'}
    >
      {enviado ? (
        <ConfirmacionSolicitud
          mensaje={flujo.mensaje}
          onOtroCorreo={flujo.usarOtroCorreo}
          refConfirmacion={flujo.refConfirmacion}
        />
      ) : (
        <FormularioOlvide
          email={flujo.email}
          setEmail={flujo.setEmail}
          enviando={flujo.estado === 'enviando'}
          error={flujo.error}
          onEnviar={flujo.enviar}
          refCampo={flujo.refCampo}
        />
      )}
    </TarjetaAcceso>
  );
}
