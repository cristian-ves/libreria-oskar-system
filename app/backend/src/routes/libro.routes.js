const { Router } = require('express');
const libroController = require('../controllers/libro.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const {
  validateEscanearLibro,
  validateConsultarLibro,
  validateRegistrarLibro,
  validateIngresoLibro,
} = require('../middlewares/validator');

const router = Router();

/**
 * @route   GET /api/libros
 * @desc    Lista libros del catálogo con búsqueda reactiva por título, autor o ISBN
 */
router.get('/', libroController.listar.bind(libroController));

/**
 * @route   POST /api/libros/escanear
 * @desc    Escanea un libro por ISBN, lo registra atómicamente si no existe,
 *          e ingresa 1 unidad al inventario de la bodega con transacción ACID.
 * @access  Público / Empleado / Administrador
 */
router.post('/escanear', validateEscanearLibro, libroController.escanear.bind(libroController));

/**
 * @route   POST /api/libros/consultar
 * @desc    Consulta si un libro existe localmente por ISBN.
 *          Si existe devuelve libro + inventarios por bodega.
 *          Si no existe consulta Google Books y devuelve sugerencia (sin insertar nada).
 * @access  Administrador, Empleado
 */
router.post(
  '/consultar',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateConsultarLibro,
  libroController.consultar.bind(libroController)
);

/**
 * @route   POST /api/libros/registrar
 * @desc    Registra un libro manualmente (con o sin ISBN) en una transacción ACID.
 *          Crea autor/editorial si vienen, inserta inventario y movimiento Ingreso.
 *          Precio según rol: Administrador guarda el recibido; Empleado guarda 0 y precio_pendiente=true.
 * @access  Administrador, Empleado
 */
router.post(
  '/registrar',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateRegistrarLibro,
  libroController.registrar.bind(libroController)
);

/**
 * @route   POST /api/libros/:id/ingreso
 * @desc    Registra un ingreso de mercancía para un libro ya existente en una bodega.
 * @access  Administrador, Empleado
 */
router.post(
  '/:id/ingreso',
  authenticate,
  authorize('Administrador', 'Empleado'),
  validateIngresoLibro,
  libroController.ingreso.bind(libroController)
);

module.exports = router;
