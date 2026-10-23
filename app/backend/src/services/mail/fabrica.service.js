const { validarMensaje } = require('./validacion.mail');
const { crearSanitizador, enmascarar } = require('./seguridad.mail');

const RETRASOS_POR_DEFECTO_MS = [5000, 30000, 120000];
const MAX_PENDIENTES = 100;

// Errores que no se arreglan reintentando: autenticación o rechazo SMTP 5xx.
function esPermanente(error) {
  const codigo = Number(error && error.responseCode);
  return Boolean(error) && (error.permanente === true || error.code === 'EAUTH' || (codigo >= 500 && codigo <= 599));
}

// Fábrica del servicio de correo. `enviar` nunca lanza ni rechaza; los reintentos
// viven solo en memoria (se pierden si el proceso se apaga).
function crearServicioCorreo({
  proveedor,
  retrasosMs = RETRASOS_POR_DEFECTO_MS,
  logger = console,
  secretos = [],
  maxPendientes = MAX_PENDIENTES,
}) {
  const sanitizar = crearSanitizador(secretos);
  const pendientes = new Set();
  const temporizadores = new Set();
  let esperando = false;

  function log(nivel, mensaje) {
    try {
      logger[nivel](`[MAIL] ${sanitizar(mensaje)}`);
    } catch (_) {
      // un logger roto no debe romper el envío
    }
  }

  function pausar(ms) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        temporizadores.delete(timer);
        resolve();
      }, ms);
      timer.unref();
      if (esperando) timer.ref();
      temporizadores.add(timer);
    });
  }

  const intentar = (mensaje) => Promise.resolve().then(() => proveedor.enviar(mensaje));
  const destino = (mensaje) => mensaje.para.map(enmascarar).join(', ');

  async function reintentar(mensaje) {
    try {
      for (let i = 0; i < retrasosMs.length; i += 1) {
        await pausar(retrasosMs[i]);
        try {
          await intentar(mensaje);
          log('log', `Entregado a ${destino(mensaje)} en el intento ${i + 2}.`);
          return;
        } catch (error) {
          log('warn', `Intento ${i + 2} fallido: ${sanitizar(error)}`);
          if (esPermanente(error)) break;
        }
      }
      log('error', `Descartado el correo "${mensaje.asunto}" para ${destino(mensaje)}: intentos agotados.`);
    } catch (error) {
      log('error', `Fallo inesperado al reintentar: ${sanitizar(error)}`);
    }
  }

  function programar(mensaje) {
    const tarea = reintentar(mensaje).finally(() => pendientes.delete(tarea));
    pendientes.add(tarea);
  }

  async function enviar(entrada) {
    try {
      const validacion = validarMensaje(entrada);
      if (!validacion.ok) {
        log('warn', `Correo inválido: ${validacion.detalle}`);
        return { ok: false, intentos: 0, reintentando: false, motivo: 'invalido' };
      }
      const { mensaje } = validacion;
      try {
        await intentar(mensaje);
        return { ok: true, intentos: 1, reintentando: false };
      } catch (error) {
        const motivo = sanitizar(error);
        log('warn', `Intento 1 fallido para ${destino(mensaje)}: ${motivo}`);
        if (esPermanente(error) || retrasosMs.length === 0) {
          log('error', `Descartado el correo "${mensaje.asunto}": error permanente.`);
          return { ok: false, intentos: 1, reintentando: false, motivo };
        }
        if (pendientes.size >= maxPendientes) {
          log('error', `Descartado el correo "${mensaje.asunto}": ${maxPendientes} reintentos pendientes.`);
          return { ok: false, intentos: 1, reintentando: false, motivo };
        }
        programar(mensaje);
        return { ok: false, intentos: 1, reintentando: true, motivo };
      }
    } catch (error) {
      return { ok: false, intentos: 0, reintentando: false, motivo: sanitizar(error) };
    }
  }

  async function verificar() {
    try {
      await proveedor.verificar();
      return { ok: true };
    } catch (error) {
      return { ok: false, motivo: sanitizar(error) };
    }
  }

  // Los temporizadores son unref(); aquí se vuelven a referenciar para poder esperarlos.
  async function esperarPendientes() {
    esperando = true;
    temporizadores.forEach((timer) => timer.ref());
    try {
      while (pendientes.size > 0) await Promise.allSettled([...pendientes]);
    } finally {
      esperando = false;
    }
  }

  const servicio = { enviar, verificar, esperarPendientes };
  if (proveedor.bandeja) {
    servicio.bandeja = proveedor.bandeja;
    servicio.vaciarBandeja = () => proveedor.vaciarBandeja();
  }
  return servicio;
}

module.exports = { crearServicioCorreo, RETRASOS_POR_DEFECTO_MS };
