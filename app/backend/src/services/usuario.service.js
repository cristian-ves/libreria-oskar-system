const usuarioRepository = require('../repositories/usuario.repository');

class UsuarioService {
  /**
   * Devuelve todos los usuarios activos con su rol, sin credenciales sensibles.
   * Delega en el método específico del repositorio.
   * @returns {Promise<Array<{ id: string, nombre_completo: string, email: string, rol_nombre: string|null }>>}
   */
  async listarActivosConRol() {
    return usuarioRepository.findActivosConRol();
  }
}

module.exports = new UsuarioService();
