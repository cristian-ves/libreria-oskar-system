const { Router } = require('express');
const dosFactoresController = require('../controllers/dosFactores.controller');
const { authenticate, authorize } = require('../middlewares/auth');
const { exigirAlcance } = require('../middlewares/auth2fa');
const { ALCANCE_CONFIGURAR, ALCANCE_VERIFICAR } = require('../services/dosFactores/sesion');

// Montado en /api/auth/2fa desde auth.routes.js
const router = Router();

// Alta: secreto pendiente (QR, clave manual y enlace otpauth://) y activación con el primer código
router.post('/configurar', exigirAlcance(ALCANCE_CONFIGURAR), (req, res, next) => dosFactoresController.configurar(req, res, next));
router.post('/activar', exigirAlcance(ALCANCE_CONFIGURAR), (req, res, next) => dosFactoresController.activar(req, res, next));

// Segundo paso del login con código TOTP o de respaldo
router.post('/verificar', exigirAlcance(ALCANCE_VERIFICAR), (req, res, next) => dosFactoresController.verificar(req, res, next));

// Con sesión completa
router.get('/estado', authenticate, (req, res, next) => dosFactoresController.estado(req, res, next));
router.post('/respaldo/regenerar', authenticate, (req, res, next) => dosFactoresController.regenerarRespaldo(req, res, next));
router.post(
  '/usuarios/:id/restablecer',
  authenticate,
  authorize('Administrador'),
  (req, res, next) => dosFactoresController.restablecer(req, res, next)
);

module.exports = router;
