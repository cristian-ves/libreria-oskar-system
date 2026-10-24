const usuarioService = require('../services/usuario.service');

class UsuarioController {
  /**
   * Endpoint: GET /api/usuarios
   * Listado de usuarios/empleados para asignación de operaciones (Solo Administrador).
   * Responde con { status: 'success', data } exactamente igual que el handler inline original.
   */
  async listar(req, res, next) {
    try {
      const data = await usuarioService.listar({ incluirInactivos: req.query.incluirInactivos === 'true' });
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }

  async crear(req, res, next) {
    try { const data = await usuarioService.crear(req.body); res.status(201).json({ status: 'success', data }); }
    catch (err) { next(err); }
  }

  async actualizar(req, res, next) {
    try { const data = await usuarioService.actualizar(req.params.id, req.body, req.user.id); res.status(200).json({ status: 'success', data }); }
    catch (err) { next(err); }
  }

  async cambiarActivo(req, res, next) {
    try { const data = await usuarioService.cambiarActivo(req.params.id, req.body?.activo, req.user.id); res.status(200).json({ status: 'success', data }); }
    catch (err) { next(err); }
  }
}

module.exports = new UsuarioController();
