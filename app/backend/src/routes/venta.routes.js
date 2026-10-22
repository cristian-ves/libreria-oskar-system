const { Router } = require('express');
const ventaController = require('../controllers/venta.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  validateCrearVenta,
  validateListarVentas,
  validateVentaId,
  validateAnularVenta,
} = require('../middlewares/validator');

const router = Router();

/**
 * @route   POST /api/ventas
 * @desc    Registra una venta y descuenta el stock en una sola transacción
 * @access  Administrador, Empleado
 */
router.post(
  '/',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateCrearVenta,
  ventaController.crear.bind(ventaController)
);

/**
 * @route   GET /api/ventas
 * @desc    Lista ventas por estado y rango de fechas (hora de Guatemala)
 * @access  Administrador, Empleado
 */
router.get(
  '/',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateListarVentas,
  ventaController.listar.bind(ventaController)
);

/**
 * @route   POST /api/ventas/:id/anular
 * @desc    Anula una venta y restituye el stock
 * @access  Administrador
 */
router.post(
  '/:id/anular',
  authenticate,
  authorize('Administrador'),
  validateAnularVenta,
  ventaController.anular.bind(ventaController)
);

/**
 * @route   GET /api/ventas/:id
 * @desc    Detalle de una venta
 * @access  Administrador, Empleado
 */
router.get(
  '/:id',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateVentaId,
  ventaController.obtener.bind(ventaController)
);

module.exports = router;
