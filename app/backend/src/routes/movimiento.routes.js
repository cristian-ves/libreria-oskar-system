const { Router } = require('express');
const inventarioController = require('../controllers/inventario.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { validateListarMovimientos } = require('../middlewares/validator');

const router = Router();

/**
 * @route   GET /api/movimientos
 * @desc    Consulta el kardex de movimientos de inventario con filtros y paginación
 * @access  Administrador, Empleado
 */
router.get(
  '/',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateListarMovimientos,
  inventarioController.listarMovimientos.bind(inventarioController)
);

module.exports = router;
