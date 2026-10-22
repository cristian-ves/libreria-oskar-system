export const ROLES = {
  ADMINISTRADOR: 'Administrador',
  EMPLEADO: 'Empleado',
  USUARIO: 'Usuario',
};

export const ROLES_OPERATIVOS = [ROLES.ADMINISTRADOR, ROLES.EMPLEADO];

export const esAdministrador = (user) => user?.rol === ROLES.ADMINISTRADOR;
