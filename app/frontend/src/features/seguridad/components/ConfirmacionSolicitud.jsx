import EnlaceSecundario, { CLASE_SECUNDARIO } from './EnlaceSecundario';

// El mensaje es el del backend, idéntico exista o no el correo.
export default function ConfirmacionSolicitud({ mensaje, onOtroCorreo, refConfirmacion }) {
  return (
    <div className="space-y-4">
      <p
        role="status"
        ref={refConfirmacion}
        tabIndex={-1}
        className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800 outline-none"
      >
        {mensaje}
      </p>
      <div className="flex items-center justify-between">
        <EnlaceSecundario to="/login">Volver a iniciar sesión</EnlaceSecundario>
        <button type="button" onClick={onOtroCorreo} className={CLASE_SECUNDARIO}>Usar otro correo</button>
      </div>
    </div>
  );
}
