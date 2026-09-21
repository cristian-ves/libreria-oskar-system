const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Endpoint de inicio de sesión
router.post('/login', (req, res, next) => authController.login(req, res, next));

// Endpoint para consultar el perfil del usuario autenticado
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

module.exports = router;
