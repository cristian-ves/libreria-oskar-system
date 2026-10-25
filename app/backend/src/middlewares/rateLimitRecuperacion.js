const { createRateLimit } = require('./rateLimit');
const { recuperacion } = require('../config/env');

// Instancias propias por endpoint (por IP, en memoria): no comparten contador con el login.
const limiteRecuperar = createRateLimit({ max: recuperacion.recuperarMax, windowMs: recuperacion.ventanaLimiteMs });
const limiteRestablecer = createRateLimit({ max: recuperacion.restablecerMax, windowMs: recuperacion.ventanaLimiteMs });

module.exports = { limiteRecuperar, limiteRestablecer };
