const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearServicioAlertasInventario, fechaGuatemala } = require('../src/services/alertasInventario.service');
const { crearResumenCorreo } = require('../src/services/alertasInventario.correo');
const { crearServicioCorreo } = require('../src/services/mail/fabrica.service');
const { crearProveedorSmtp } = require('../src/services/mail/smtp.provider');
const { main } = require('../src/scripts/enviar-alertas-inventario');

function repositorioFalso({ alertas = [{ titulo: 'Libro <script>', isbn: null, bodega: 'Central', stock_actual: 0, stock_minimo: 0, deficit: 0 }], administradores = [{ id: 'admin-1', nombre_completo: 'Admin', email: 'admin@example.test' }] } = {}) {
  const entrega = administradores.map((a) => ({ id: a.id, administrador_id: a.id, correo_electronico: a.email, nombre_administrador: a.nombre_completo, estado: 'pendiente', intentos: 0, reintento_seguro: false }));
  const reporte = { id: 'reporte-1', estado: 'procesando', snapshot: alertas };
  const calls = { writes: 0, claim: 0 };
  return {
    calls,
    async listarAlertas() { return alertas; },
    async listarAdministradores() { return administradores; },
    async prepararReporte() { calls.writes += 1; return reporte; },
    async listarEntregas() { return entrega; },
    async reclamarEntrega(id, token) {
      calls.claim += 1;
      const row = entrega.find((e) => e.id === id);
      if (row.estado !== 'pendiente' && !(row.estado === 'fallido' && row.reintento_seguro)) return { claimed: false, reason: row.estado };
      row.estado = 'procesando'; row.intentos += 1; row.lease_token = token;
      return { claimed: true, entrega: { ...row } };
    },
    async registrarResultado(id, token, result) {
      const row = entrega.find((e) => e.id === id);
      if (row.lease_token !== token) return false;
      row.estado = result.ok ? 'enviado' : result.incierto ? 'incierto' : 'fallido';
      row.reintento_seguro = Boolean(result.reintentable);
      return true;
    },
    async marcarCorreoInvalido(id) { entrega.find((e) => e.id === id).estado = 'fallido'; },
    async finalizarReporte(id, fallback) {
      const estados = entrega.map((e) => e.estado);
      reporte.estado = fallback === 'sin_alertas' || fallback === 'sin_administradores'
        ? fallback : estados.includes('incierto') ? 'incierto' : estados.includes('fallido') ? 'fallido' : 'completado';
      return reporte.estado;
    },
  };
}

test('fecha de ejecución usa el día local de America/Guatemala', () => {
  assert.equal(fechaGuatemala(new Date('2026-10-26T05:30:00.000Z')), '2026-10-25');
});

test('dry-run consulta stock y administradores pero no persiste ni envía', async () => {
  const repository = repositorioFalso();
  let sends = 0;
  const service = crearServicioAlertasInventario({ repository, mail: { enviarUnaVez: async () => { sends += 1; return { ok: true }; } } });
  const result = await service.ejecutar({ dryRun: true });
  assert.equal(result.dry_run, true);
  assert.equal(result.alertas, 1);
  assert.equal(result.administradores_validos, 1);
  assert.equal(repository.calls.writes, 0);
  assert.equal(sends, 0);
});

test('HTML escapa valores dinámicos y texto plano incluye datos del libro', () => {
  const { html, texto } = crearResumenCorreo({ fecha: '2026-10-26', alertas: [{ titulo: '<img src=x onerror=alert(1)>', isbn: '1&2', bodega: '<Norte>', stock_actual: 0, stock_minimo: 4, deficit: 4 }] });
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&lt;Norte&gt;'));
  assert.ok(!html.includes('<img src=x'));
  assert.match(texto, /Existencias: 0/);
  assert.match(texto, /Déficit: 4/);
});

test('envío consolidado va separado por administrador y una repetición no reenvía', async () => {
  const repository = repositorioFalso({ administradores: [
    { id: 'a1', nombre_completo: 'Ana', email: 'ana@example.test' },
    { id: 'a2', nombre_completo: 'Luis', email: 'luis@example.test' },
  ] });
  let calls = 0;
  const service = crearServicioAlertasInventario({ repository, mail: { enviarUnaVez: async ({ para }) => { calls += 1; assert.equal(para.length, 1); return { ok: true }; } } });
  await service.ejecutar();
  const second = await service.ejecutar();
  assert.equal(calls, 2);
  assert.equal(second.omitido, true);
});

test('sin alertas no envía correo y un resultado incierto nunca se reintenta', async () => {
  const none = repositorioFalso({ alertas: [] });
  const noAlert = await crearServicioAlertasInventario({ repository: none, mail: { enviarUnaVez: async () => assert.fail('No debe enviar') } }).ejecutar();
  assert.equal(noAlert.estado, 'sin_alertas');

  const repository = repositorioFalso();
  let sends = 0;
  const mail = { enviarUnaVez: async () => { sends += 1; return { ok: false, incierto: true, reintentable: false, motivo: 'desconocido' }; } };
  const service = crearServicioAlertasInventario({ repository, mail });
  const result = await service.ejecutar();
  assert.equal(result.inciertos, 1);
  assert.equal(sends, 1);
  await service.ejecutar();
  assert.equal(sends, 1);
});

test('fallo SMTP clasificado seguro puede reintentarse en la misma fecha', async () => {
  const repository = repositorioFalso();
  let attempts = 0;
  const service = crearServicioAlertasInventario({ repository, mail: { enviarUnaVez: async () => {
    attempts += 1;
    return attempts === 1
      ? { ok: false, incierto: false, reintentable: true, motivo: 'SMTP temporal' }
      : { ok: true };
  } } });
  assert.equal((await service.ejecutar()).fallidos, 1);
  assert.equal((await service.ejecutar()).enviados, 1);
  assert.equal(attempts, 2);
});

test('administrador inválido se excluye y la ausencia de administradores queda registrada', async () => {
  const bad = repositorioFalso({ administradores: [{ id: 'bad', nombre_completo: 'Inválido', email: 'no-es-correo' }] });
  let sends = 0;
  const service = crearServicioAlertasInventario({ repository: bad, mail: { enviarUnaVez: async () => { sends += 1; return { ok: true }; } } });
  const result = await service.ejecutar();
  assert.equal(sends, 0);
  assert.equal(result.fallidos, 1);

  const none = repositorioFalso({ administradores: [] });
  const noAdminResult = await crearServicioAlertasInventario({ repository: none, mail: { enviarUnaVez: async () => assert.fail('No debe enviar') } }).ejecutar();
  assert.equal(noAdminResult.estado, 'sin_administradores');
});

test('repositorio de mail permite un intento sin activar sus reintentos en memoria', async () => {
  let attempts = 0;
  const mail = crearServicioCorreo({ proveedor: { enviar: async () => { attempts += 1; const e = new Error('timeout'); e.code = 'ETIMEDOUT'; e.command = 'DATA'; throw e; } }, retrasosMs: [1] });
  const result = await mail.enviarUnaVez({ para: ['a@example.test'], asunto: 'Alerta', texto: 'Stock' });
  assert.equal(attempts, 1);
  assert.equal(result.incierto, true);
  assert.equal(result.reintentable, false);
});

test('enviarUnaVez detecta el rechazo efectivo que Nodemailer devuelve sin lanzar', async () => {
  const mail = crearServicioCorreo({ proveedor: { enviar: async () => ({ accepted: [], rejected: ['a@example.test'], response: '450 4.2.0 Try again' }) } });
  const result = await mail.enviarUnaVez({ para: ['a@example.test'], asunto: 'Alerta', texto: 'Stock' });
  assert.equal(result.ok, false);
  assert.equal(result.reintentable, true);
  assert.equal(result.incierto, false);
});

test('la fachada observa el resultado SMTP del proveedor sin usar red', async () => {
  const provider = crearProveedorSmtp({ host: 'smtp.example.test', port: 587, user: 'u@example.test', password: 'pass', from: 'u@example.test', faltantes: [] }, {
    crearTransporte: () => ({ sendMail: async () => ({ accepted: [], rejected: ['a@example.test'], response: '450 4.2.0 Try again' }) }),
  });
  const result = await crearServicioCorreo({ proveedor: provider }).enviarUnaVez({ para: ['a@example.test'], asunto: 'Alerta', texto: 'Stock' });
  assert.equal(result.ok, false);
  assert.equal(result.reintentable, true);
  assert.equal(result.incierto, false);
});

test('script cierra la conexión incluso si falla la espera de PostgreSQL', async () => {
  let closed = 0;
  await assert.rejects(main({
    database: { close: async () => { closed += 1; } },
    waitForDatabase: async () => { throw new Error('DB no disponible'); },
    serviceFactory: () => assert.fail('No debe iniciar el servicio'), args: [], logger: { log() {} },
  }), /DB no disponible/);
  assert.equal(closed, 1);
});
