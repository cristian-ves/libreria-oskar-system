const test = require('node:test');
const assert = require('node:assert/strict');
const seed = require('../src/database/seed');
const libroService = require('../src/services/libro.service');
const libroRepository = require('../src/repositories/libro.repository');
const { Libro, Categoria, Autor, Editorial, Inventario, MovimientoInventario, Venta, sequelize } = require('../src/models');
const { crearEntorno } = require('./helpers/ventasFixtures');
const { levantarApi } = require('./helpers/ventasHttp');

test('Administración de libros: edición, baja lógica, catálogo, inventario y operaciones', async (t) => {
  await seed();
  const env = await crearEntorno('libros-admin');
  const api = await levantarApi(env);
  const tag = env.tag;
  let fixture;
  let duplicado;
  let ventaId;
  const autorCreado = `Autor edición ${tag}`;
  const editorialCreada = `Editorial edición ${tag}`;

  const bodyEdicion = (isbn) => ({
    titulo: `  Libro editado ${tag}  `,
    autor: `  ${autorCreado}  `,
    editorial: `  ${editorialCreada}  `,
    categoriaId: env.categoriaId,
    resena: '  Reseña bibliográfica actualizada.  ',
    imagenUrl: '  https://ejemplo.test/portada.jpg  ',
    ...(isbn !== undefined ? { isbn } : {}),
  });

  try {
    const categoria = await Categoria.findOne();
    assert.ok(categoria, 'La semilla debe contener una categoría');
    env.categoriaId = categoria.id;
    fixture = await env.crearLibro({ titulo: `Libro original ${tag}`, precio: 37.5, stock: 6 });
    duplicado = await env.crearLibro({ titulo: `Libro duplicado ${tag}`, precio: 12, stock: 0 });

    await t.test('GET admin, PUT y PATCH están protegidos para Administrador', async () => {
      for (const [method, path, body] of [
        ['GET', '/libros/admin'],
        ['PUT', `/libros/${fixture.libro.id}`, bodyEdicion(fixture.libro.isbn)],
        ['PATCH', `/libros/${fixture.libro.id}/activo`, { activo: false }],
      ]) {
        assert.equal((await api.api(method, path, { body })).status, 401, `${method} ${path} sin token`);
        assert.equal((await api.api(method, path, { token: api.tokens.empleado, body })).status, 403, `${method} ${path} como Empleado`);
        assert.equal((await api.api(method, path, { token: api.tokens.usuario, body })).status, 403, `${method} ${path} como Usuario`);
      }
    });

    await t.test('PUT edita datos bibliográficos sin modificar precio, stock ni movimientos', async () => {
      const movimientosAntes = await MovimientoInventario.count({ where: { inventario_id: fixture.inventario.id } });
      const stockAntes = Number(await env.stockDe(fixture.inventario));
      const response = await api.api('PUT', `/libros/${fixture.libro.id}`, {
        token: api.tokens.admin, body: bodyEdicion(`  ${fixture.libro.isbn}  `),
      });
      assert.equal(response.status, 200);
      assert.equal(response.json.status, 'success');
      assert.equal(response.json.data.titulo, `Libro editado ${tag}`);
      assert.equal(response.json.data.autor_nombre, autorCreado);
      assert.equal(response.json.data.editorial_nombre, editorialCreada);
      assert.equal(response.json.data.categoria_id, categoria.id);
      assert.equal(response.json.data.resena, 'Reseña bibliográfica actualizada.');
      assert.equal(response.json.data.imagen_url, 'https://ejemplo.test/portada.jpg');
      assert.equal(response.json.data.isbn, fixture.libro.isbn);
      assert.equal(Number(response.json.data.precio), 37.5);
      const persistido = await Libro.findByPk(fixture.libro.id);
      assert.equal(Number(persistido.precio), 37.5);
      assert.equal(Number((await Inventario.findByPk(fixture.inventario.id)).stock_actual), stockAntes);
      assert.equal(await MovimientoInventario.count({ where: { inventario_id: fixture.inventario.id } }), movimientosAntes);

      await api.api('PUT', `/libros/${fixture.libro.id}`, { token: api.tokens.admin, body: bodyEdicion(fixture.libro.isbn) });
      assert.equal(await Autor.count({ where: { nombre: autorCreado } }), 1);
      assert.equal(await Editorial.count({ where: { nombre: editorialCreada } }), 1);
      const sinCampoIsbn = await api.api('PUT', `/libros/${fixture.libro.id}`, {
        token: api.tokens.admin,
        body: { ...bodyEdicion(), autor: autorCreado.toUpperCase(), editorial: editorialCreada.toUpperCase() },
      });
      assert.equal(sinCampoIsbn.status, 200);
      assert.equal(sinCampoIsbn.json.data.isbn, fixture.libro.isbn, 'omitir ISBN lo conserva');
      assert.equal(await Autor.count({ where: { nombre: autorCreado } }), 1, 'no crea un duplicado por mayúsculas');
      assert.equal(await Editorial.count({ where: { nombre: editorialCreada } }), 1, 'no crea un duplicado por mayúsculas');
    });

    await t.test('PUT valida UUID, existencia, obligatorios, ISBN, marcador y duplicados', async () => {
      assert.equal((await api.api('PUT', '/libros/no-uuid', { token: api.tokens.admin, body: bodyEdicion() })).status, 400);
      assert.equal((await api.api('PUT', '/libros/00000000-0000-4000-8000-000000000000', { token: api.tokens.admin, body: bodyEdicion() })).status, 404);
      assert.equal((await api.api('PUT', `/libros/${fixture.libro.id}`, { token: api.tokens.admin, body: { ...bodyEdicion(), titulo: ' ' } })).status, 400);
      assert.equal((await api.api('PUT', `/libros/${fixture.libro.id}`, { token: api.tokens.admin, body: { ...bodyEdicion(), autor: 'Autor de Biblioteca Internacional' } })).status, 400);
      assert.equal((await api.api('PUT', `/libros/${fixture.libro.id}`, { token: api.tokens.admin, body: bodyEdicion('9780306406158') })).status, 400);
      assert.equal((await api.api('PUT', `/libros/${fixture.libro.id}`, { token: api.tokens.admin, body: bodyEdicion(duplicado.libro.isbn) })).status, 409);
      assert.equal((await api.api('PUT', `/libros/${fixture.libro.id}`, { token: api.tokens.admin, body: { ...bodyEdicion(), categoriaId: '00000000-0000-4000-8000-000000000000' } })).status, 404);
      assert.equal(Number((await Libro.findByPk(fixture.libro.id)).precio), 37.5);
    });

    await t.test('PUT revierte autores y editoriales si falla la actualización del libro', async () => {
      const autorRollback = `Autor rollback ${tag}`;
      const editorialRollback = `Editorial rollback ${tag}`;
      const original = libroRepository.updateBibliografia;
      libroRepository.updateBibliografia = async () => { throw new Error('fallo inducido de persistencia'); };
      try {
        await assert.rejects(libroService.actualizarLibro({
          libroId: fixture.libro.id,
          titulo: `Libro editado ${tag}`,
          autor: autorRollback,
          editorial: editorialRollback,
          categoriaId: categoria.id,
          resena: 'Reseña para rollback',
          imagenUrl: null,
          isbnPresente: false,
        }));
      } finally {
        libroRepository.updateBibliografia = original;
      }
      assert.equal(await Autor.count({ where: { nombre: autorRollback } }), 0);
      assert.equal(await Editorial.count({ where: { nombre: editorialRollback } }), 0);
    });

    await t.test('PATCH activo desactiva/reactiva idempotentemente y valida estado/UUID', async () => {
      assert.equal((await api.api('PATCH', '/libros/no-uuid/activo', { token: api.tokens.admin, body: { activo: false } })).status, 400);
      assert.equal((await api.api('PATCH', `/libros/${fixture.libro.id}/activo`, { token: api.tokens.admin, body: { activo: 'false' } })).status, 400);
      assert.equal((await api.api('PATCH', '/libros/00000000-0000-4000-8000-000000000000/activo', { token: api.tokens.admin, body: { activo: false } })).status, 404);
      const venta = await api.postVenta(api.cuerpo([{ libroId: fixture.libro.id, cantidad: 1 }]), api.tokens.admin);
      assert.equal(venta.status, 201);
      ventaId = venta.json.data.id;
      const historialAntes = await env.conteos();
      for (let i = 0; i < 2; i++) {
        const response = await api.api('PATCH', `/libros/${fixture.libro.id}/activo`, { token: api.tokens.admin, body: { activo: false } });
        assert.equal(response.status, 200);
        assert.equal(response.json.data.activo, false);
      }
      assert.deepEqual(await env.conteos(), historialAntes, 'desactivar no altera ventas, movimientos ni stock');
      assert.ok(await Venta.findByPk(ventaId), 'la venta histórica permanece');
      const reactivado = await api.api('PATCH', `/libros/${fixture.libro.id}/activo`, { token: api.tokens.admin, body: { activo: true } });
      assert.equal(reactivado.status, 200);
      assert.equal(reactivado.json.data.activo, true);
    });

    await t.test('GET admin pagina/filtros activos e inactivos; el catálogo público los excluye', async () => {
      await api.api('PATCH', `/libros/${fixture.libro.id}/activo`, { token: api.tokens.admin, body: { activo: false } });
      const adminPath = `/libros/admin?q=${encodeURIComponent(tag)}&limit=1&offset=0`;
      const admin = await api.api('GET', adminPath, { token: api.tokens.admin });
      assert.equal(admin.status, 200);
      assert.equal(admin.json.total, 2);
      assert.equal(admin.json.limit, 1);
      assert.equal(admin.json.data.length, 1);
      const segundaPagina = await api.api('GET', `/libros/admin?q=${encodeURIComponent(tag)}&limit=1&offset=1`, { token: api.tokens.admin });
      assert.equal(segundaPagina.json.total, 2);
      assert.equal(segundaPagina.json.data.length, 1);
      assert.notEqual(segundaPagina.json.data[0].id, admin.json.data[0].id);
      const libroAdminInactivo = admin.json.data[0].id === fixture.libro.id ? admin.json.data[0] : segundaPagina.json.data[0];
      assert.equal(libroAdminInactivo.activo, false);
      const inactive = await api.api('GET', `/libros/admin?q=${encodeURIComponent(`Libro editado ${tag}`)}&estado=inactivo`, { token: api.tokens.admin });
      const active = await api.api('GET', `/libros/admin?q=${encodeURIComponent(`Libro editado ${tag}`)}&estado=activo`, { token: api.tokens.admin });
      assert.equal(inactive.json.total, 1);
      assert.equal(active.json.total, 0);
      assert.equal((await api.api('GET', `/libros/admin?estado=desconocido`, { token: api.tokens.admin })).status, 400);
      const publico = await api.api('GET', `/libros?q=${encodeURIComponent(`Libro editado ${tag}`)}&limit=1`);
      assert.equal(publico.status, 200);
      assert.equal(publico.json.total, 0);
      assert.deepEqual(publico.json.data, []);
      assert.equal((await api.api('GET', `/libros/${fixture.libro.id}`)).status, 404);
    });

    await t.test('libros inactivos permanecen en inventario y kardex sin alterar resumen ni historial', async () => {
      await api.api('PATCH', `/libros/${fixture.libro.id}/activo`, { token: api.tokens.admin, body: { activo: true } });
      const resumenAntes = await api.api('GET', '/inventario/resumen', { token: api.tokens.admin });
      await api.api('PATCH', `/libros/${fixture.libro.id}/activo`, { token: api.tokens.admin, body: { activo: false } });
      const inventario = await api.api('GET', `/inventario?q=${encodeURIComponent(`Libro editado ${tag}`)}`, { token: api.tokens.admin });
      assert.equal(inventario.status, 200);
      assert.equal(inventario.json.total, 1);
      assert.equal(inventario.json.data[0].libro_activo, false);
      assert.equal(Number(inventario.json.data[0].stock_actual), 5);
      assert.equal((await api.api('GET', `/ventas/${ventaId}`, { token: api.tokens.admin })).status, 200);
      const resumenDespues = await api.api('GET', '/inventario/resumen', { token: api.tokens.admin });
      for (const key of ['total_unidades', 'titulos_con_stock', 'bajo_stock', 'agotados', 'obsoletos']) {
        assert.equal(resumenDespues.json.data[key], resumenAntes.json.data[key], `se conserva ${key}`);
      }
      const kardex = await api.api('GET', `/movimientos?libroId=${fixture.libro.id}&bodegaId=${env.bodega.id}`, { token: api.tokens.admin });
      assert.equal(kardex.status, 200);
      assert.equal(kardex.json.data.total, 2);
      assert.equal(kardex.json.data.movimientos.length, 2);
    });

    await t.test('escaneo, consulta operativa, registro, ingreso y venta rechazan el libro inactivo sin escrituras', async () => {
      const before = await env.conteos();
      const payloadRegistro = {
        isbn: fixture.libro.isbn,
        titulo: 'No debe crearse',
        autor: 'Autor operación',
        categoriaId: categoria.id,
        resena: 'No debe persistir',
        cantidad: 1,
        bodegaId: env.bodega.id,
      };
      const respuestas = [
        await api.api('POST', '/libros/escanear', { token: api.tokens.empleado, body: { isbn: fixture.libro.isbn, bodegaId: env.bodega.id } }),
        await api.api('POST', '/libros/consultar', { token: api.tokens.empleado, body: { isbn: fixture.libro.isbn } }),
        await api.api('POST', `/libros/${fixture.libro.id}/ingreso`, { token: api.tokens.empleado, body: { bodegaId: env.bodega.id, cantidad: 1 } }),
        await api.api('POST', '/libros/registrar', { token: api.tokens.empleado, body: payloadRegistro }),
        await api.postVenta(api.cuerpo([{ libroId: fixture.libro.id, cantidad: 1 }]), api.tokens.empleado),
      ];
      for (const respuesta of respuestas) {
        assert.equal(respuesta.status, 409);
        assert.equal(respuesta.json.status, 'fail');
      }
      assert.match(respuestas[0].json.message, /inactivo/i);
      assert.match(respuestas[1].json.message, /inactivo/i);
      assert.match(respuestas[2].json.message, /inactivo/i);
      assert.match(respuestas[3].json.message, /inactivo/i);
      assert.match(respuestas[4].json.message, /inactivo/i);
      assert.deepEqual(await env.conteos(), before);
    });

    await t.test('GET admin acepta filtros de categoría y expone solo campos de gestión', async () => {
      const response = await api.api('GET', `/libros/admin?categoriaId=${categoria.id}&limit=2&offset=0`, { token: api.tokens.admin });
      assert.equal(response.status, 200);
      assert.ok(response.json.data.every((libro) => libro.categoria_id === categoria.id));
      assert.ok(response.json.data.every((libro) => !Object.hasOwn(libro, 'password_hash')));
    });
  } finally {
    try {
      await env.limpiar();
      await Autor.destroy({ where: { nombre: [autorCreado, `Autor rollback ${tag}`] } });
      await Editorial.destroy({ where: { nombre: [editorialCreada, `Editorial rollback ${tag}`] } });
    } finally {
      await api.cerrar();
      await sequelize.close();
    }
  }
});
