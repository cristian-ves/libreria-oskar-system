const { Router } = require('express');
const libroRoutes = require('./libro.routes');
const db = require('../config/db');
const categoriaRepository = require('../repositories/categoria.repository');

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
    const text = `
      SELECT b.id, b.nombre, b.descripcion, s.nombre AS sucursal_nombre
      FROM bodegas b
      JOIN sucursales s ON b.sucursal_id = s.id
      WHERE b.activo = true
      ORDER BY s.nombre, b.nombre;
    `;
    const result = await db.query(text);
    res.status(200).json({ status: 'success', data: result.rows });
  } catch (err) {
    next(err);
  }
});

// Listado de usuarios/empleados para asignación de operaciones
router.get('/usuarios', async (req, res, next) => {
  try {
    const text = `
      SELECT u.id, u.nombre_completo, u.email, r.nombre AS rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.activo = true
      ORDER BY u.nombre_completo;
    `;
    const result = await db.query(text);
    res.status(200).json({ status: 'success', data: result.rows });
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
router.use('/libros', libroRoutes);

module.exports = router;
