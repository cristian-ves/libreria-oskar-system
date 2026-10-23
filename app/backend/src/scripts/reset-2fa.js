// Restablece el 2FA de un usuario (p. ej. el administrador bloqueado): npm run reset-2fa -- correo@dominio.com
// Envoltura de dosFactoresService.restablecerPorEmail; nunca imprime secretos ni códigos.
const { sequelize } = require('../models');
const dosFactoresService = require('../services/dosFactores.service');

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Uso: npm run reset-2fa -- correo@dominio.com');
    return 1;
  }

  try {
    await dosFactoresService.restablecerPorEmail(email);
    console.log(`[2FA] Verificación en dos pasos restablecida para ${email}. Deberá configurarla de nuevo al iniciar sesión.`);
    return 0;
  } catch (error) {
    if (error.statusCode === 404) {
      console.error(`[2FA] No existe un usuario con el correo ${email}.`);
    } else {
      console.error(`[2FA] No fue posible restablecer la verificación en dos pasos (${error.name}).`);
    }
    return 1;
  }
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
