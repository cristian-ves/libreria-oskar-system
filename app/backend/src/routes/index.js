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
router.post('/usuarios', authenticate, authorize('Administrador'), usuarioController.crear.bind(usuarioController));
router.put('/usuarios/:id', authenticate, authorize('Administrador'), usuarioController.actualizar.bind(usuarioController));
router.patch('/usuarios/:id/activo', authenticate, authorize('Administrador'), usuarioController.cambiarActivo.bind(usuarioController));

// Listado de categorías temáticas para catálogo y filtros
router.get('/categorias/admin', authenticate, authorize('Administrador'), categoriaController.listarAdministracion.bind(categoriaController));
router.get('/categorias', categoriaController.listar.bind(categoriaController));
router.post('/categorias', authenticate, authorize('Administrador'), categoriaController.crear.bind(categoriaController));
router.put('/categorias/:id', authenticate, authorize('Administrador'), categoriaController.renombrar.bind(categoriaController));
router.delete('/categorias/:id', authenticate, authorize('Administrador'), categoriaController.eliminar.bind(categoriaController));

// Rutas de módulos
router.use('/auth', authRoutes);
router.use('/libros', libroRoutes);
router.use('/inventario', require('./inventario.routes'));
router.use('/movimientos', require('./movimiento.routes'));
router.use('/ventas', require('./venta.routes'));

module.exports = router;
