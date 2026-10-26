const { randomUUID } = require('crypto');
const { esDireccionValida } = require('./mail/validacion.mail');
const repositorioPorDefecto = require('../repositories/alertasInventario.repository');
const correoPorDefecto = require('./mail.service');
const { crearResumenCorreo } = require('./alertasInventario.correo');

const MAX_INTENTOS = 3;
const LEASE_MS = 2 * 60 * 1000;

function fechaGuatemala(fecha = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(fecha);
  const valores = Object.fromEntries(partes.map(({ type, value }) => [type, value]));
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function crearServicioAlertasInventario({ repository = repositorioPorDefecto, mail = correoPorDefecto, now = () => new Date() } = {}) {
  async function ejecutar({ dryRun = false } = {}) {
    const fechaLocal = fechaGuatemala(now());
    const alertasEncontradas = await repository.listarAlertas();
    const administradores = await repository.listarAdministradores();
    const administradoresValidos = administradores.filter((a) => esDireccionValida(a.email));

    if (dryRun) {
      return {
        dry_run: true, fecha_local: fechaLocal, alertas: alertasEncontradas.length,
        administradores_validos: administradoresValidos.length,
        administradores_invalidos: administradores.length - administradoresValidos.length,
        snapshot: alertasEncontradas,
      };
    }

    const reporte = await repository.prepararReporte({ fechaLocal, alertas: alertasEncontradas, administradores });
    const alertas = Array.isArray(reporte.snapshot) ? reporte.snapshot : alertasEncontradas;
    const estadoPrevio = reporte.estado;
    if (['completado', 'sin_alertas', 'sin_administradores', 'incierto'].includes(estadoPrevio)) {
      const entregas = await repository.listarEntregas(reporte.id);
      return resumenFinal({ fechaLocal, reporteId: reporte.id, estado: estadoPrevio, alertas, entregas, omitido: true });
    }

    if (alertas.length === 0) {
      const estado = await repository.finalizarReporte(reporte.id, 'sin_alertas');
      return resumenFinal({ fechaLocal, reporteId: reporte.id, estado, alertas, entregas: [] });
    }

    if (administradores.length === 0) {
      const estado = await repository.finalizarReporte(reporte.id, 'sin_administradores', 'No hay administradores activos.');
      return resumenFinal({ fechaLocal, reporteId: reporte.id, estado, alertas, entregas: [] });
    }

    const mensaje = crearResumenCorreo({ alertas, fecha: fechaLocal });
    const entregas = await repository.listarEntregas(reporte.id);
    for (const entrega of entregas) {
      if (!esDireccionValida(entrega.correo_electronico)) {
        await repository.marcarCorreoInvalido(entrega.id);
        continue;
      }
      if (Number(entrega.intentos || 0) >= MAX_INTENTOS && entrega.estado === 'fallido' && entrega.reintento_seguro) continue;
      const leaseToken = randomUUID();
      const claim = await repository.reclamarEntrega(entrega.id, leaseToken, LEASE_MS);
      if (!claim.claimed) continue;
      let resultado;
      try {
        resultado = await mail.enviarUnaVez({
          para: [claim.entrega.correo_electronico], asunto: mensaje.asunto,
          texto: mensaje.texto, html: mensaje.html,
        });
      } catch (error) {
        // Un rechazo inesperado puede ocurrir después de la aceptación SMTP.
        resultado = { ok: false, incierto: true, reintentable: false, motivo: 'Resultado SMTP desconocido.' };
      }
      await repository.registrarResultado(entrega.id, leaseToken, {
        ...resultado,
        motivo: resultado.motivo ? String(resultado.motivo).slice(0, 2000) : null,
      });
    }
    const estado = await repository.finalizarReporte(reporte.id, 'completado');
    const finales = await repository.listarEntregas(reporte.id);
    return resumenFinal({ fechaLocal, reporteId: reporte.id, estado, alertas, entregas: finales });
  }

  return { ejecutar };
}

function resumenFinal({ fechaLocal, reporteId, estado, alertas, entregas, omitido = false }) {
  const cuenta = (nombre) => entregas.filter((e) => (e.estado || e.get?.('estado')) === nombre).length;
  return {
    dry_run: false, fecha_local: fechaLocal, reporte_id: reporteId, estado,
    alertas: alertas.length, enviados: cuenta('enviado'), fallidos: cuenta('fallido'),
    inciertos: cuenta('incierto'), omitido,
  };
}

module.exports = { crearServicioAlertasInventario, fechaGuatemala, MAX_INTENTOS, LEASE_MS };
