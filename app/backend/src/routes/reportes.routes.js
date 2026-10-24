const { Router } = require('express');
const { authenticate, authorize } = require('../middlewares/auth');
const reportesController = require('../controllers/reportes.controller');
const {
  validateReporteInventario, validateReporteKardex, validateCorteCaja,
  validateResumenPeriodo, validateLibrosMasVendidos, validateReposicion, validateVentasReporte,
  validateReporteExportacion,
} = require('../middlewares/validator');

const router = Router();
router.use(authenticate, authorize('Administrador'));

router.get('/inventario-valorizado', validateReporteInventario, reportesController.inventarioValorizado.bind(reportesController));
router.get('/kardex', validateReporteKardex, reportesController.kardex.bind(reportesController));
router.get('/corte-caja', validateCorteCaja, reportesController.corteCaja.bind(reportesController));
router.get('/resumen-periodo', validateResumenPeriodo, reportesController.resumenPeriodo.bind(reportesController));
router.get('/libros-mas-vendidos', validateLibrosMasVendidos, reportesController.librosMasVendidos.bind(reportesController));
router.get('/reposicion', validateReposicion, reportesController.reposicion.bind(reportesController));
router.get('/ventas', validateVentasReporte, reportesController.ventas.bind(reportesController));
router.get('/:tipo/exportar', validateReporteExportacion, reportesController.exportar.bind(reportesController));

module.exports = router;
