import { Link } from 'react-router-dom';
import useRestablecerContrasena from '../features/seguridad/hooks/useRestablecerContrasena';
import TarjetaAcceso, { Etiqueta } from '../features/seguridad/components/TarjetaAcceso';
import FormularioRestablecer from '../features/seguridad/components/FormularioRestablecer';

const CLASE_BOTON =
  'w-full py-2.5 px-4 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white font-bold text-sm rounded-xl transition-all shadow-xs flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b07c19] focus-visible:ring-offset-2';

export default function RestablecerContrasena() {
  const flujo = useRestablecerContrasena();

  if (flujo.estado === 'exito') {
    return (
      <TarjetaAcceso titulo={<>Contraseña <Etiqueta>actualizada</Etiqueta></>} refTitulo={flujo.refTitulo}>
        <div className="space-y-4">
          <p role="status" className="text-sm text-[#252525]">
            Ya puedes iniciar sesión con tu nueva contraseña. Por seguridad se cerraron las sesiones abiertas de tu
            cuenta. Si tu cuenta usa verificación en dos pasos, se te seguirá pidiendo el código.
          </p>
          {/* <a href> (navegación completa) y no <Link>: recarga la app para que AuthContext revalide la
              sesión con /api/auth/me; si el navegador tenía sesión de esta cuenta, Login no redirige por un user obsoleto. */}
          <a href="/login" className={CLASE_BOTON}>Ir a iniciar sesión</a>
        </div>
      </TarjetaAcceso>
    );
  }

  if (flujo.estado === 'enlaceInvalido') {
    return (
      <TarjetaAcceso titulo={<>Enlace <Etiqueta>no válido</Etiqueta></>} refTitulo={flujo.refTitulo}>
        <div className="space-y-4">
          <p role="status" className="text-sm text-[#252525]">El enlace no es válido o ya venció.</p>
          <Link to="/olvide-contrasena" className={CLASE_BOTON}>Solicitar un enlace nuevo</Link>
        </div>
      </TarjetaAcceso>
    );
  }

  return (
    <TarjetaAcceso titulo={<>Nueva <Etiqueta>Contraseña</Etiqueta></>} subtitulo="Elige la contraseña con la que vas a ingresar">
      <FormularioRestablecer flujo={flujo} />
    </TarjetaAcceso>
  );
}
