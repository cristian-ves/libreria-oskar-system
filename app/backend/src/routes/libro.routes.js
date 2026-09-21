const { Router } = require('express');
const libroController = require('../controllers/libro.controller');
const { validateEscanearLibro } = require('../middlewares/validator');

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

module.exports = router;
