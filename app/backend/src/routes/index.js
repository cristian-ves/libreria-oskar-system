const { Router } = require('express');
const authRoutes = require('./auth.routes');
const libroRoutes = require('./libro.routes');
const db = require('../config/db');
const categoriaRepository = require('../repositories/categoria.repository');
const { Bodega, Sucursal, Usuario, Rol } = require('../models');
const { authenticate, authorize } = require('../middlewares/auth');

const router = Router();

// Health check para monitorización en Cloud Run y orquestadores
router.get('/health', async (req, res) => {
  try {
    const dbInfo = await db.testConnection();
    res.status(200).json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        name: dbInfo.db_name,
        serverTime: dbInfo.current_time,
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: err.message,
      }
    });
  }
});

// Listado de bodegas para dropdowns y asignaciones
router.get('/bodegas', async (req, res, next) => {
  try {
    const bodegas = await Bodega.findAll({
      attributes: ['id', 'nombre', 'descripcion'],
      where: { activo: true },
      include: [{
        model: Sucursal,
        as: 'sucursal',
        attributes: ['nombre'],
        required: true,
      }],
      order: [
        [{ model: Sucursal, as: 'sucursal' }, 'nombre', 'ASC'],
        ['nombre', 'ASC'],
      ],
    });
    const data = bodegas.map((bodega) => {
      const plain = bodega.get({ plain: true });
      return {
        id: plain.id,
        nombre: plain.nombre,
        descripcion: plain.descripcion,
        sucursal_nombre: plain.sucursal?.nombre ?? null,
      };
    });
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

// Listado de usuarios/empleados para asignación de operaciones (Solo Administrador)
router.get('/usuarios', authenticate, authorize('Administrador'), async (req, res, next) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre_completo', 'email'],
      where: { activo: true },
      include: [{
        model: Rol,
        as: 'rol',
        attributes: ['nombre'],
        required: true,
      }],
      order: [['nombre_completo', 'ASC']],
    });
    const data = usuarios.map((usuario) => {
      const plain = usuario.get({ plain: true });
      return {
        id: plain.id,
        nombre_completo: plain.nombre_completo,
        email: plain.email,
        rol_nombre: plain.rol?.nombre ?? null,
      };
    });
    res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
});

// Listado de categorías temáticas para catálogo y filtros
router.get('/categorias', async (req, res, next) => {
  try {
    const categorias = await categoriaRepository.findAll();
    res.status(200).json({
      status: 'success',
      data: categorias,
    });
  } catch (err) {
    next(err);
  }
});

// Rutas de módulos
router.use('/auth', authRoutes);
router.use('/libros', libroRoutes);
router.use('/inventario', require('./inventario.routes'));
router.use('/movimientos', require('./movimiento.routes'));

module.exports = router;
