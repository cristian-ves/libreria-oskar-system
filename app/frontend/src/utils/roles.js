export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  EMPLEADO: 'Empleado',
  USUARIO: 'Usuario',
};

export const ROLES_OPERATIVOS = [ROLES.ADMINISTRADOR, ROLES.EMPLEADO];

export const esAdministrador = (user) => user?.rol === ROLES.ADMINISTRADOR;

// Rutas con controles de rol en el cliente. Las vistas pendientes se agregan
// cuando existan; no se incluyen rutas ficticias en la navegación.
export const ROLES_POR_RUTA = {
  registrar: ROLES_OPERATIVOS,
  inventario: ROLES_OPERATIVOS,
  ventas: ROLES_OPERATIVOS,
  usuarios: [ROLES.ADMINISTRADOR],
  categorias: [ROLES.ADMINISTRADOR],
  gestionLibros: [ROLES.ADMINISTRADOR],
  reportes: [ROLES.ADMINISTRADOR],
  sucursales: [ROLES.ADMINISTRADOR],
};

export const puedeAcceder = (user, rolesPermitidos) =>
  Boolean(user && rolesPermitidos?.includes(user.rol));
