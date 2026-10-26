const { Op } = require('sequelize');
const { sequelize, Inventario, Libro, Bodega, Usuario, Rol, AlertaInventarioReporte, AlertaInventarioEntrega } = require('../models');

class AlertasInventarioRepository {
  async listarAlertas() {
    const filas = await Inventario.findAll({
      attributes: ['id', 'libro_id', 'bodega_id', 'stock_actual', 'stock_minimo'],
      where: sequelize.where(sequelize.col('Inventario.stock_actual'), Op.lte, sequelize.col('Inventario.stock_minimo')),
      include: [
        { model: Libro, as: 'libro', attributes: ['id', 'titulo', 'isbn'], where: { activo: true }, required: true },
        { model: Bodega, as: 'bodega', attributes: ['id', 'nombre'], required: true },
      ],
      order: [
        [sequelize.literal('("Inventario"."stock_minimo" - "Inventario"."stock_actual")'), 'DESC'],
        [{ model: Libro, as: 'libro' }, 'titulo', 'ASC'],
        [{ model: Bodega, as: 'bodega' }, 'nombre', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return filas.map((fila) => {
      const row = fila.get({ plain: true });
      return {
        inventario_id: row.id, libro_id: row.libro_id, bodega_id: row.bodega_id,
        titulo: row.libro.titulo, isbn: row.libro.isbn, bodega: row.bodega.nombre,
        stock_actual: Number(row.stock_actual), stock_minimo: Number(row.stock_minimo),
        deficit: Number(row.stock_minimo) - Number(row.stock_actual),
      };
    });
  }

  async listarAdministradores() {
    const admins = await Usuario.findAll({
      attributes: ['id', 'nombre_completo', 'email'], where: { activo: true },
      include: [{ model: Rol, as: 'rol', attributes: [], where: { nombre: 'Administrador' }, required: true }],
      order: [['id', 'ASC']],
    });
    return admins.map((a) => a.get({ plain: true }));
  }

  async prepararReporte({ fechaLocal, alertas, administradores }) {
    return sequelize.transaction(async (transaction) => {
      const [reporte] = await AlertaInventarioReporte.findOrCreate({
        where: { fecha_local: fechaLocal },
        defaults: { estado: 'procesando', snapshot: alertas, cantidad_alertas: alertas.length, lease_hasta: new Date(Date.now() + 5 * 60 * 1000) },
        transaction,
      });
      const locked = await AlertaInventarioReporte.findByPk(reporte.id, { transaction, lock: transaction.LOCK.UPDATE });
      for (const admin of administradores) {
        await AlertaInventarioEntrega.findOrCreate({
          where: { reporte_id: locked.id, administrador_id: admin.id },
          defaults: {
            reporte_id: locked.id, administrador_id: admin.id,
            correo_electronico: String(admin.email || '').trim(),
            nombre_administrador: admin.nombre_completo || 'Administrador',
            estado: 'pendiente',
          },
          transaction,
        });
      }
      return locked.get({ plain: true });
    });
  }

  async listarEntregas(reporteId) {
    return AlertaInventarioEntrega.findAll({ where: { reporte_id: reporteId }, order: [['administrador_id', 'ASC']] });
  }

  async reclamarEntrega(id, leaseToken, leaseMs) {
    return sequelize.transaction(async (transaction) => {
      const entrega = await AlertaInventarioEntrega.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!entrega) return { claimed: false, reason: 'missing' };
      const now = new Date();
      if (entrega.estado === 'enviado' || entrega.estado === 'incierto' || entrega.estado === 'fallido' && !entrega.reintento_seguro) {
        return { claimed: false, reason: entrega.estado };
      }
      if (entrega.estado === 'procesando') {
        if (entrega.lease_hasta && new Date(entrega.lease_hasta) > now) return { claimed: false, reason: 'leased' };
        // El proceso pudo haber llegado a SMTP antes de morir: nunca reintentar a ciegas.
        await entrega.update({ estado: 'incierto', error: 'Lease vencido; resultado SMTP desconocido.', lease_token: null, lease_hasta: null, reintento_seguro: false }, { transaction });
        return { claimed: false, reason: 'incierto' };
      }
      await entrega.update({
        estado: 'procesando', intentos: entrega.intentos + 1, lease_token: leaseToken,
        lease_hasta: new Date(now.getTime() + leaseMs), error: null, reintento_seguro: false,
      }, { transaction });
      return { claimed: true, entrega: entrega.get({ plain: true }) };
    });
  }

  async registrarResultado(id, leaseToken, result) {
    const [count] = await AlertaInventarioEntrega.update({
      estado: result.ok ? 'enviado' : result.incierto ? 'incierto' : 'fallido',
      enviado_en: result.ok ? new Date() : null,
      error: result.ok ? null : result.motivo,
      reintento_seguro: Boolean(result.reintentable), lease_token: null, lease_hasta: null,
    }, { where: { id, estado: 'procesando', lease_token: leaseToken } });
    return count === 1;
  }

  async marcarCorreoInvalido(id) {
    await AlertaInventarioEntrega.update({ estado: 'fallido', error: 'Dirección de correo inválida.', reintento_seguro: false }, { where: { id, estado: 'pendiente' } });
  }

  async finalizarReporte(reporteId, estado, error = null) {
    const ahora = new Date();
    await AlertaInventarioEntrega.update({
      estado: 'incierto', error: 'Lease vencido; resultado SMTP desconocido.',
      reintento_seguro: false, lease_token: null, lease_hasta: null,
    }, { where: { reporte_id: reporteId, estado: 'procesando', lease_hasta: { [Op.lte]: ahora } } });
    const count = await AlertaInventarioEntrega.count({ where: { reporte_id: reporteId } });
    const estados = await AlertaInventarioEntrega.findAll({ where: { reporte_id: reporteId }, attributes: ['estado', 'error', 'lease_hasta'], raw: true });
    let final = estado;
    let enCurso = false;
    if (count > 0) {
      const names = estados.map((e) => e.estado);
      if (names.includes('incierto')) final = 'incierto';
      else if (estados.some((e) => e.estado === 'procesando' && e.lease_hasta && new Date(e.lease_hasta) > ahora)) {
        final = 'procesando';
        enCurso = true;
      }
      else if (names.includes('fallido') || names.includes('pendiente') || names.includes('procesando')) final = 'fallido';
      else final = 'completado';
    }
    const errorFinal = error || estados.map((e) => e.error).filter(Boolean).join(' | ').slice(0, 2000) || null;
    await AlertaInventarioReporte.update({
      estado: final, error: errorFinal, finalizado_en: enCurso ? null : new Date(),
      ...(enCurso ? {} : { lease_token: null, lease_hasta: null }),
    }, { where: { id: reporteId } });
    return final;
  }
}

module.exports = new AlertasInventarioRepository();
