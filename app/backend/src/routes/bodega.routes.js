const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const publicController = require('../controllers/bodega.controller');
const adminController = require('../controllers/bodegaAdmin.controller');

const router = Router();
// Contrato preexistente para listas de inventario, registro, reportes y ventas.
router.get('/', publicController.listar.bind(publicController));
router.use(authenticate, authorize('Administrador'));
router.get('/sucursal/:sucursalId', adminController.listarPorSucursal.bind(adminController));
router.get('/:id', adminController.detalle.bind(adminController));
router.put('/:id', adminController.actualizar.bind(adminController));
router.patch('/:id/activo', adminController.cambiarActivo.bind(adminController));

module.exports = router;
