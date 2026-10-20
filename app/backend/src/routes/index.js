const { Router } = require('express');
const authRoutes = require('./auth.routes');
const libroRoutes = require('./libro.routes');
const healthController = require('../controllers/health.controller');
const bodegaController = require('../controllers/bodega.controller');
const categoriaController = require('../controllers/categoria.controller');
const usuarioController = require('../controllers/usuario.controller');
const { authenticate, authorize } = require('../middlewares/auth');

const router = Router();

// Health check para monitorización en Cloud Run y orquestadores
router.get('/health', healthController.check.bind(healthController));

// Listado de bodegas para dropdowns y asignaciones
router.get('/bodegas', bodegaController.listar.bind(bodegaController));

// Listado de usuarios/empleados para asignación de operaciones (Solo Administrador)
router.get('/usuarios', authenticate, authorize('Administrador'), usuarioController.listar.bind(usuarioController));

// Listado de categorías temáticas para catálogo y filtros
router.get('/categorias', categoriaController.listar.bind(categoriaController));

// Rutas de módulos
router.use('/auth', authRoutes);
router.use('/libros', libroRoutes);
router.use('/inventario', require('./inventario.routes'));
router.use('/movimientos', require('./movimiento.routes'));

module.exports = router;
