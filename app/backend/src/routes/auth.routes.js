const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');
const loginRateLimit = require('../middlewares/rateLimit');
const recuperacionController = require('../controllers/recuperacion.controller');
const { limiteRecuperar, limiteRestablecer } = require('../middlewares/rateLimitRecuperacion');

const router = Router();

// Endpoint de inicio de sesión
router.post('/login', loginRateLimit, (req, res, next) => authController.login(req, res, next));

// Endpoint para consultar el perfil del usuario autenticado
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

// Recuperación de contraseña por correo (públicos, sin caché y con límite propio por IP)
const sinCache = (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
router.post('/recuperar', sinCache, limiteRecuperar, (req, res, next) => recuperacionController.recuperar(req, res, next));
router.post('/restablecer', sinCache, limiteRestablecer, (req, res, next) => recuperacionController.restablecer(req, res, next));

// Autenticación en dos pasos (TOTP)
router.use('/2fa', require('./dosFactores.routes'));

module.exports = router;
