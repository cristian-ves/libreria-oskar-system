const maestros = require('./libro/maestros.service');
const movimientoIngreso = require('./libro/movimientoIngreso.service');
const escaneo = require('./libro/escaneo.service');
const registro = require('./libro/registro.service');
const ingreso = require('./libro/ingreso.service');
const precio = require('./libro/precio.service');

// Fachada: conserva la instancia única de LibroService con los mismos métodos de
// prototipo. Los módulos usan `this`, que es esta instancia.
class LibroService {}

Object.assign(LibroService.prototype, maestros, movimientoIngreso, escaneo, registro, ingreso, precio);

module.exports = new LibroService();
