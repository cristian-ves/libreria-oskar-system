const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
const app = require('../src/app');
const appEnv = require('../src/config/env');
const { sequelize, Libro, Venta, VentaDetalle } = require('../src/models');
const { crearEntorno } = require('./helpers/ventasFixtures');

const FECHA = '2036-11-02';
const REPORTES = [
  ['corte-caja', `fecha=${FECHA}`],
  ['resumen-periodo', `desde=${FECHA}&hasta=${FECHA}`],
  ['libros-mas-vendidos', `desde=${FECHA}&hasta=${FECHA}`],
  ['reposicion', ''],
  ['inventario-valorizado', ''],
  ['kardex', ''],
  ['ventas', `desde=${FECHA}&hasta=${FECHA}`],
];
let env;
let server;
let baseUrl;
let tokens;
let libro;

async function request(path, token) {
  const response = await fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const buffer = Buffer.from(await response.arrayBuffer());
  const headers = Object.fromEntries(response.headers.entries());
  return { status: response.status, headers, buffer, json: () => JSON.parse(buffer.toString('utf8')) };
}

before(async () => {
  env = await crearEntorno('reportes-exportacion');
  libro = await env.crearLibro({ titulo: '=2+2 Ñandú – título extenso de prueba', stock: 10 });
  await libro.libro.update({ activo: false });
  tokens = Object.fromEntries(Object.entries(env.usuarios).map(([role, user]) => [
    role, jwt.sign({ sub: user.id }, appEnv.jwt.secret, { expiresIn: '10m' }),
  ]));

  const fecha = new Date(`${FECHA}T17:00:00.000Z`);
  const ventas = await Venta.bulkCreate(Array.from({ length: 62 }, (_, index) => {
    const anulada = index % 4 === 0;
    return {
      bodega_id: env.bodega.id,
      usuario_id: env.usuarios.Empleado.id,
      cliente_nombre: `Cliente ${index}`,
      metodo_pago: index % 2 === 0 ? 'Efectivo' : 'Transferencia',
      subtotal: '10.00', descuento: '1.00', total: '9.00',
      estado: anulada ? 'Anulada' : 'Completada',
      anulada_en: anulada ? fecha : null,
      anulada_por: anulada ? env.usuarios.Administrador.id : null,
      motivo_anulacion: anulada ? 'Fixture de anulada' : null,
      creado_en: fecha,
    };
  }), { returning: true });
  const detalles = ventas.filter((venta) => venta.estado === 'Completada').slice(0, 3).map((venta, index) => ({
    venta_id: venta.id, libro_id: libro.libro.id, cantidad: index + 1,
    precio_unitario: '10.00', subtotal: `${(index + 1) * 10}.00`,
  }));
  await VentaDetalle.bulkCreate(detalles);
  server = app.listen(0, () => {});
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (env) await env.limpiar();
  } finally {
    await sequelize.close();
  }
});

test('Exportaciones exigen administrador, validan reporte, formato y límite', async () => {
  for (const [tipo, query] of REPORTES) {
    const path = `/reportes/${tipo}/exportar?${query}&formato=xlsx`;
    assert.equal((await request(path)).status, 401, tipo);
    assert.equal((await request(path, tokens.Empleado)).status, 403, tipo);
    assert.equal((await request(path, tokens.Usuario)).status, 403, tipo);
  }
  assert.equal((await request('/reportes/no-existe/exportar?formato=xlsx', tokens.Administrador)).status, 404);
  assert.equal((await request('/reportes/ventas/exportar?formato=csv', tokens.Administrador)).status, 400);
  assert.equal((await request('/reportes/ventas/exportar?formato=xlsx&maxRegistros=10001', tokens.Administrador)).status, 400);
  assert.equal((await request(`/reportes/ventas/exportar?desde=${FECHA}&hasta=${FECHA}&formato=xlsx&maxRegistros=1`, tokens.Administrador)).status, 413);
});

test('Los siete tipos generan XLSX válido con nombre, filtros, formatos numéricos y valores desconocidos explícitos', async () => {
  for (const [tipo, query] of REPORTES) {
    const response = await request(`/reportes/${tipo}/exportar?${query}&formato=xlsx`, tokens.Administrador);
    assert.equal(response.status, 200, tipo);
    assert.equal(response.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', tipo);
    assert.match(response.headers['content-disposition'], new RegExp(`^attachment; filename="reporte-${tipo}-\\d{4}-\\d{2}-\\d{2}\\.xlsx"$`));
    assert.equal(response.buffer.subarray(0, 2).toString('ascii'), 'PK', tipo);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(response.buffer);
    assert.ok(workbook.worksheets.length > 0, tipo);
    assert.equal(workbook.worksheets[0].views[0].state, 'frozen', tipo);
  }

  const ranking = await request(`/reportes/libros-mas-vendidos/exportar?desde=${FECHA}&hasta=${FECHA}&formato=xlsx`, tokens.Administrador);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(ranking.buffer);
  const sheet = workbook.getWorksheet('Ranking completo');
  assert.equal(sheet.getCell('B7').value, "'=2+2 Ñandú – título extenso de prueba");
  assert.equal(typeof sheet.getCell('E7').value, 'number');
  assert.match(sheet.getCell('E7').numFmt, /Q/);

  const inventory = await request(`/reportes/inventario-valorizado/exportar?libroId=${libro.libro.id}&formato=xlsx`, tokens.Administrador);
  const inventoryBook = new ExcelJS.Workbook();
  await inventoryBook.xlsx.load(inventory.buffer);
  assert.equal(inventoryBook.getWorksheet('Existencias por bodega').getCell('G7').value, 'No disponible');
});

test('PDF válido multipágina, tablas ajustadas y exportaciones mantienen activos/anulados y filtros', async () => {
  for (const [tipo, query] of REPORTES) {
    const response = await request(`/reportes/${tipo}/exportar?${query}&formato=pdf`, tokens.Administrador);
    assert.equal(response.status, 200, tipo);
    assert.equal(response.headers['content-type'], 'application/pdf', tipo);
    assert.match(response.headers['content-disposition'], new RegExp(`^attachment; filename="reporte-${tipo}-\\d{4}-\\d{2}-\\d{2}\\.pdf"$`));
    assert.equal(response.buffer.subarray(0, 5).toString('ascii'), '%PDF-', tipo);
    assert.ok(response.buffer.length > 500, tipo);
  }
  const pdf = await request(`/reportes/ventas/exportar?desde=${FECHA}&hasta=${FECHA}&formato=pdf`, tokens.Administrador);
  const paginas = (pdf.buffer.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length;
  assert.ok(paginas > 1, `se esperaba un PDF multipágina, se encontraron ${paginas}`);

  const json = await request(`/reportes/ventas?desde=${FECHA}&hasta=${FECHA}&limit=2`, tokens.Administrador);
  assert.equal(json.status, 200);
  const cuerpo = json.json();
  assert.equal(cuerpo.status, 'success');
  assert.equal(cuerpo.data.ventas.length, 2);
  assert.equal(cuerpo.data.total, 62);
  assert.ok(cuerpo.data.ventas.some((venta) => venta.estado === 'Anulada'));
});

test('Reportes vacíos exportan hojas y documentos legibles con No disponible donde no existe costo', async () => {
  const uuidInexistente = '00000000-0000-4000-8000-000000000099';
  for (const formato of ['xlsx', 'pdf']) {
    const response = await request(`/reportes/inventario-valorizado/exportar?libroId=${uuidInexistente}&formato=${formato}`, tokens.Administrador);
    assert.equal(response.status, 200);
    if (formato === 'pdf') assert.equal(response.buffer.subarray(0, 5).toString('ascii'), '%PDF-');
    else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(response.buffer);
      assert.equal(workbook.getWorksheet('Existencias por bodega').getCell('A7').value, 'Sin registros');
    }
  }
});
