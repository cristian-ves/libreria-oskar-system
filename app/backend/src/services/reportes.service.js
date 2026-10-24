const inventarioValorizado = require('./reportes/inventarioValorizado.service');
const kardex = require('./reportes/kardex.service');
const corteCaja = require('./reportes/corteCaja.service');
const resumenPeriodo = require('./reportes/resumenPeriodo.service');
const librosMasVendidos = require('./reportes/librosMasVendidos.service');
const reposicion = require('./reportes/reposicion.service');
const ventas = require('./reportes/ventas.service');

// Fachada de reportes: los próximos módulos se conectarán aquí sin duplicar rutas ni controladores.
class ReportesService {}
Object.assign(ReportesService.prototype, {
  generarInventarioValorizado: inventarioValorizado.generar,
  generarKardex: kardex.generar,
  generarCorteCaja: corteCaja.generar,
  generarResumenPeriodo: resumenPeriodo.generar,
  generarLibrosMasVendidos: librosMasVendidos.generar,
  generarReposicion: reposicion.generar,
  generarVentas: ventas.generar,
});

module.exports = new ReportesService();
