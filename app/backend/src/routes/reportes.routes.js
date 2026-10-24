const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const reportesController = require('../controllers/reportes.controller');
const { validateReporteInventario, validateReporteKardex } = require('../middlewares/validator');

const router = Router();
router.use(authenticate, authorize('Administrador'));

router.get('/inventario-valorizado', validateReporteInventario, reportesController.inventarioValorizado.bind(reportesController));
router.get('/kardex', validateReporteKardex, reportesController.kardex.bind(reportesController));

module.exports = router;
