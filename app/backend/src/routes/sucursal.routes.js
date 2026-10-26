const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const controller = require('../controllers/sucursal.controller');
const bodegas = require('../controllers/bodegaAdmin.controller');

const router = Router();
router.use(authenticate, authorize('Administrador'));
router.get('/', controller.listar.bind(controller));
router.post('/', controller.crear.bind(controller));
router.get('/:id/bodegas', controller.bodegas.bind(controller));
router.post('/:sucursalId/bodegas', bodegas.crear.bind(bodegas));
router.get('/:id', controller.detalle.bind(controller));
router.put('/:id', controller.actualizar.bind(controller));
router.patch('/:id/activo', controller.cambiarActivo.bind(controller));

module.exports = router;
