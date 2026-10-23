// Prueba manual del módulo de correo: npm run correo:probar -- destinatario@dominio.com
const env = require('../config/env');
const correo = require('../services/mail.service');

async function main() {
  const destinatario = process.argv[2];
  if (!destinatario) {
    console.error('Uso: npm run correo:probar -- destinatario@dominio.com');
    process.exitCode = 1;
    return;
  }

  const { proveedor, from, host, port } = env.mail;
  console.log(`[MAIL] Proveedor: ${proveedor}`);
  console.log(`[MAIL] Remitente: ${from || '(sin definir)'}`);
  if (proveedor === 'smtp') console.log(`[MAIL] Servidor: ${host}:${port}`);
  else console.log('[MAIL] Proveedor consola: no se enviará ningún correo real.');

  const verificacion = await correo.verificar();
  console.log(`[MAIL] Verificación: ${verificacion.ok ? 'ok' : `falló (${verificacion.motivo})`}`);

  const fecha = new Date().toLocaleString('es-CO');
  const resultado = await correo.enviar({
    para: destinatario,
    asunto: 'Prueba de correo — Librería Oskar',
    texto: `Correo de prueba enviado el ${fecha}.`,
  });

  if (resultado.ok) {
    console.log('[MAIL] Resultado: ok');
  } else {
    console.error(`[MAIL] Resultado: fallo (${resultado.motivo})`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[MAIL] Error inesperado: ${error.message}`);
  process.exitCode = 1;
});
