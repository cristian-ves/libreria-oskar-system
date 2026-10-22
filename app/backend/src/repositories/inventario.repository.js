const basico = require('./inventario/inventarioBasico.repository');
const listado = require('./inventario/inventarioListado.repository');
const resumen = require('./inventario/inventarioResumen.repository');

// Fachada: conserva la instancia única de InventarioRepository con los mismos
// métodos de prototipo. Los módulos usan `this`, que es esta instancia.
class InventarioRepository {}

Object.assign(InventarioRepository.prototype, basico, listado, resumen);

module.exports = new InventarioRepository();
