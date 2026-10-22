const crear = require('./venta/crear.service');
const anular = require('./venta/anular.service');
const consulta = require('./venta/consulta.service');

// Fachada: conserva la instancia única de VentaService con los mismos métodos de
// prototipo. Los módulos son funciones puras sobre repositorios y no dependen de `this`.
class VentaService {}

Object.assign(VentaService.prototype, crear, anular, consulta);

module.exports = new VentaService();
