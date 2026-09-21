const { Router } = require('express');
const inventarioController = require('../controllers/inventario.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  validateListarInventario,
  validateSalidaInventario,
  validateAjusteInventario,
} = require('../middlewares/validator');

const router = Router();

/**
 * @route   GET /api/inventario/resumen
 * @desc    Obtiene las métricas generales de existencias, alertas y libros sin precio
 * @access  Administrador, Empleado
 */
router.get(
  '/resumen',
  authenticate,
  authorize('Administrador', 'Empleado'),
  inventarioController.resumen.bind(inventarioController)
);

/**
 * @route   GET /api/inventario
 * @desc    Lista el inventario filtrado por estado, búsqueda y bodega
 * @access  Administrador, Empleado
 */
router.get(
  '/',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateListarInventario,
  inventarioController.listar.bind(inventarioController)
);

/**
 * @route   POST /api/inventario/:id/salida
 * @desc    Registra una salida de mercancía
 * @access  Administrador, Empleado
 */
router.post(
  '/:id/salida',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateSalidaInventario,
  inventarioController.salida.bind(inventarioController)
);

/**
 * @route   POST /api/inventario/:id/ajuste
 * @desc    Registra un ajuste de stock fijando el nuevo valor
 * @access  Administrador, Empleado
 */
router.post(
  '/:id/ajuste',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateAjusteInventario,
  inventarioController.ajuste.bind(inventarioController)
);

module.exports = router;
