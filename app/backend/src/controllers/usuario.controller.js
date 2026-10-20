const usuarioService = require('../services/usuario.service');

class UsuarioController {
  /**
   * Endpoint: GET /api/usuarios
   * Listado de usuarios/empleados para asignación de operaciones (Solo Administrador).
   * Responde con { status: 'success', data } exactamente igual que el handler inline original.
   */
  async listar(req, res, next) {
    try {
      const data = await usuarioService.listarActivosConRol();
      res.status(200).json({ status: 'success', data });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UsuarioController();
