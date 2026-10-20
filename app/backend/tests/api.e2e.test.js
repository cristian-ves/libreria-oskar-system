const test = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const db = require('../src/config/db');
const seed = require('../src/database/seed');
const { mockExternalFetch, googleBooksResponse } = require('./helpers/httpMocks');

test('Test E2E de la API RESTful (Express + PostgreSQL)', async (t) => {
  let server;
  let baseUrl;
  let seededData;
  let adminToken;
  let employeeToken;

  await t.test('Inicializar Servidor de Pruebas y Semilla', async () => {
    seededData = await seed();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });
    assert.ok(baseUrl);
  });

  await t.test('GET /api/health - Monitoreo de salud del sistema', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'healthy');
    assert.strictEqual(json.database.connected, true);
  });

  await t.test('GET /api/bodegas - Conserva los datos planos y ordenados con sucursal', async () => {
    const res = await fetch(`${baseUrl}/bodegas`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(Array.isArray(json.data));

    const bodegaSeed = json.data.find((bodega) => bodega.id === seededData.bodegaId);
    assert.ok(bodegaSeed, 'Debe incluir la bodega sembrada para pruebas');
    assert.ok(bodegaSeed.nombre);
    assert.ok(typeof bodegaSeed.sucursal_nombre === 'string');
    assert.deepStrictEqual(Object.keys(bodegaSeed).sort(), [
      'descripcion', 'id', 'nombre', 'sucursal_nombre',
    ]);
    assert.deepStrictEqual(json.data, [...json.data].sort((a, b) =>
      a.sucursal_nombre.localeCompare(b.sucursal_nombre) || a.nombre.localeCompare(b.nombre)
    ));
  });

  await t.test('POST /api/auth/login - Obtener token de administrador', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@libreriaoskar.com',
        password: 'Admin123!',
      }),
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    adminToken = json.data.token;
    assert.ok(adminToken);
  });

  await t.test('GET /api/usuarios - Requiere administrador y no expone credenciales', async () => {
    const sinSesion = await fetch(`${baseUrl}/usuarios`);
    assert.strictEqual(sinSesion.status, 401);

    const loginEmpleado = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'empleado@libreriaoskar.com',
        password: 'Empleado123!',
      }),
    });
    assert.strictEqual(loginEmpleado.status, 200);
    employeeToken = (await loginEmpleado.json()).data.token;
    assert.ok(employeeToken);

    const empleadoRes = await fetch(`${baseUrl}/usuarios`, {
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert.strictEqual(empleadoRes.status, 403);

    const adminRes = await fetch(`${baseUrl}/usuarios`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.strictEqual(adminRes.status, 200);
    const json = await adminRes.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(Array.isArray(json.data));
    assert.ok(json.data.length > 0);
    assert.ok(json.data.some((usuario) => usuario.id === seededData.adminId));
    assert.ok(json.data.some((usuario) => usuario.id === seededData.usuarioId));

    json.data.forEach((usuario) => {
      assert.ok(usuario.rol_nombre);
      assert.deepStrictEqual(Object.keys(usuario).sort(), [
        'email', 'id', 'nombre_completo', 'rol_nombre',
      ]);
      assert.equal('password_hash' in usuario, false);
      assert.equal('dos_factores_secreto' in usuario, false);
      assert.equal('token_recuperacion' in usuario, false);
    });
    assert.deepStrictEqual(json.data, [...json.data].sort((a, b) =>
      a.nombre_completo.localeCompare(b.nombre_completo)
    ));
  });

  await t.test('POST /api/libros/escanear - Error 400 si faltan datos requeridos', async () => {
    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        isbn: '',
        bodegaId: seededData.bodegaId,
      }),
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.status, 'fail');
    assert.ok(json.message);
  });

  await t.test('POST /api/libros/escanear - Escaneo exitoso con respuesta HTTP estructurada', async (t) => {
    const externalCalls = mockExternalFetch(t, async (url) => {
      if (url.hostname === 'www.googleapis.com') return googleBooksResponse('9780135957059');
      return undefined;
    }, { allowLocal: true });

    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
      body: JSON.stringify({
        isbn: '9780135957059', // The Pragmatic Programmer
        bodegaId: seededData.bodegaId,
        usuarioId: seededData.usuarioId,
      }),
    });

    assert.ok([200, 201].includes(res.status));
    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(json.data.libro);
    assert.strictEqual(json.data.libro.isbn, '9780135957059');
    assert.strictEqual(json.data.movimiento.tipo, 'Ingreso');
    assert.strictEqual(json.data.movimiento.cantidad, 1);
    assert.ok(json.data.inventario.stock_actual >= 1);
    assert.ok(externalCalls.length <= 1, 'El escaneo debe usar solo el mock de Google si el libro no existe localmente');
  });


  // ── Nuevos casos: autorización y actor del movimiento ──────────────────────

  await t.test('POST /api/libros/escanear - 401 sin token', async () => {
    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isbn: '9780135957059', bodegaId: seededData.bodegaId }),
    });
    assert.strictEqual(res.status, 401);
  });

  await t.test('POST /api/libros/escanear - 403 con token de rol Usuario', async () => {
    const bcrypt = require('bcryptjs');
    const { Usuario, Rol } = require('../src/models');
    const rolUsuario = await Rol.findOne({ where: { nombre: 'Usuario' } });
    assert.ok(rolUsuario, 'El rol "Usuario" debe existir en BD');

    const uniqueEmail = `test-rol-usuario-${Date.now()}@libreriaoskar-test.com`;
    const hash = await bcrypt.hash('Test123!', 10);
    const nuevoUsuario = await Usuario.create({
      rol_id: rolUsuario.id,
      nombre_completo: 'Usuario de Prueba Temporal',
      email: uniqueEmail,
      password_hash: hash,
      activo: true,
    });

    try {
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: uniqueEmail, password: 'Test123!' }),
      });
      assert.strictEqual(loginRes.status, 200);
      const usuarioToken = (await loginRes.json()).data.token;
      assert.ok(usuarioToken);

      const res = await fetch(`${baseUrl}/libros/escanear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${usuarioToken}` },
        body: JSON.stringify({ isbn: '9780135957059', bodegaId: seededData.bodegaId }),
      });
      assert.strictEqual(res.status, 403);
    } finally {
      await nuevoUsuario.destroy();
    }
  });

  await t.test('POST /api/libros/escanear - 2xx con token de Empleado', async (t) => {
    const externalCalls = mockExternalFetch(t, async (url) => {
      if (url.hostname === 'www.googleapis.com') return googleBooksResponse('9780201633610');
      return undefined;
    }, { allowLocal: true });

    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        isbn: '9780201633610', // The Pragmatic Programmer 2nd alt ISBN
        bodegaId: seededData.bodegaId,
      }),
    });
    assert.ok([200, 201].includes(res.status));
    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    assert.ok(json.data.libro);
    assert.strictEqual(json.data.movimiento.tipo, 'Ingreso');
    assert.ok(externalCalls.length <= 1);
  });

  await t.test('POST /api/libros/escanear - usuarioId del body se ignora; actor = usuario autenticado', async (t) => {
    const fakeUsuarioId = '00000000-dead-beef-0000-000000000000';
    const externalCalls = mockExternalFetch(t, async (url) => {
      if (url.hostname === 'www.googleapis.com') return googleBooksResponse('9780132350884');
      return undefined;
    }, { allowLocal: true });

    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        isbn: '9780132350884',
        bodegaId: seededData.bodegaId,
        usuarioId: fakeUsuarioId,
      }),
    });
    assert.ok([200, 201].includes(res.status));
    const json = await res.json();
    const movimientoId = json.data.movimiento.id;
    assert.ok(movimientoId);

    // Verificar en BD que el actor del movimiento es el Empleado, no el falso
    const { rows } = await db.pool.query(
      'SELECT usuario_id FROM movimientos_inventario WHERE id = $1',
      [movimientoId]
    );
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].usuario_id, seededData.usuarioId, 'El actor debe ser el Empleado autenticado');
    assert.notStrictEqual(rows[0].usuario_id, fakeUsuarioId, 'El usuarioId falso del body debe haber sido ignorado');
    assert.ok(externalCalls.length <= 1);
  });

  // ── Caracterización de contratos: GET /api/categorias y GET /api/libros ──────

  /**
   * ISBN ficticio para los tests de caracterización.
   * Se usa un valor que no colisione con los escaneos anteriores del test.
   */
  const CARACT_ISBN = '9780596517748'; // JavaScript: The Good Parts
  let caractLibroId = null;
  let caractLibroRef = null;
  let caractLibroCategoriaId = null;

  /**
   * Helper de limpieza idempotente: elimina el libro con ISBN CARACT_ISBN y
   * sus movimientos e inventarios asociados.
   *
   * Cadena de borrado (respeta FKs):
   *   1. movimientos_inventario  → referencia inventario_id (no libro_id)
   *   2. inventarios             → referencia libro_id
   *   3. libros                  → por isbn (idempotente aunque el ID en memoria sea null)
   *
   * El trigger tg_movimientos_inventario_stock es AFTER INSERT, no afecta DELETEs.
   */
  async function limpiarLibroCaracterizacion() {
    // 1. Movimientos: eliminados via FK inventario_id → inventarios.id ON DELETE CASCADE,
    //    pero los borramos explícitamente primero para claridad y por si CASCADE no está activo.
    await db.pool.query(`
      DELETE FROM movimientos_inventario
      WHERE inventario_id IN (
        SELECT inv.id FROM inventarios inv
        INNER JOIN libros l ON l.id = inv.libro_id
        WHERE l.isbn = $1
      )
    `, [CARACT_ISBN]);

    // 2. Inventarios: referencia libro_id
    await db.pool.query(`
      DELETE FROM inventarios
      WHERE libro_id IN (SELECT id FROM libros WHERE isbn = $1)
    `, [CARACT_ISBN]);

    // 3. El libro en sí
    await db.pool.query(
      'DELETE FROM libros WHERE isbn = $1',
      [CARACT_ISBN]
    );

    caractLibroId = null;
    caractLibroRef = null;
    caractLibroCategoriaId = null;
  }

  // ── Caso 1: GET /api/categorias ──────────────────────────────────────────────

  await t.test('GET /api/categorias - 200 con lista no vacía de { id, nombre } ordenada ASC', async () => {
    const res = await fetch(`${baseUrl}/categorias`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();

    assert.strictEqual(json.status, 'success');
    assert.ok(Array.isArray(json.data), 'data debe ser un array');
    assert.ok(json.data.length > 0, 'el seed crea al menos una categoría');

    // Cada elemento tiene exactamente los campos { id, nombre }
    json.data.forEach((cat) => {
      assert.deepStrictEqual(
        Object.keys(cat).sort(),
        ['id', 'nombre'],
        `La categoría ${cat.id} no tiene exactamente [id, nombre]`
      );
      assert.ok(typeof cat.id === 'string' && cat.id.length > 0);
      assert.ok(typeof cat.nombre === 'string' && cat.nombre.length > 0);
    });

    // Verificar orden alfabético ascendente por nombre (igual que hoy)
    const nombres = json.data.map((c) => c.nombre);
    const nombresOrdenados = [...nombres].sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(nombres, nombresOrdenados, 'Las categorías deben estar ordenadas ASC por nombre');
  });

  // ── Preparar libro para los siguientes tests de /api/libros ─────────────────

  await t.test('Preparar libro de caracterización para pruebas de /api/libros', async (t) => {
    // Partir de estado limpio (por si quedaron restos de una corrida anterior fallida)
    await limpiarLibroCaracterizacion();

    mockExternalFetch(t, async (url) => {
      if (url.hostname === 'www.googleapis.com') return googleBooksResponse(CARACT_ISBN);
      return undefined;
    }, { allowLocal: true });

    const res = await fetch(`${baseUrl}/libros/escanear`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        isbn: CARACT_ISBN,
        bodegaId: seededData.bodegaId,
      }),
    });

    assert.ok([200, 201].includes(res.status), `Escaneo devolvió ${res.status}`);
    const json = await res.json();
    assert.strictEqual(json.status, 'success');
    caractLibroId = json.data.libro.id;
    assert.ok(caractLibroId, 'El escaneo debe retornar el id del libro');

    // Asignar una categoría real del seed al libro con UPDATE directo.
    // El fixture de googleBooksResponse no rellena categoria_id, así que lo hacemos
    // explícitamente para que el test de categoriaId pueda afirmar inclusión SIEMPRE.
    // Columna real en tabla libros: categoria_id (FK → categorias.id ON DELETE SET NULL).
    const catRow = await db.pool.query(
      'SELECT id FROM categorias ORDER BY nombre ASC LIMIT 1'
    );
    assert.ok(catRow.rows.length > 0, 'El seed debe haber creado al menos una categoría');
    caractLibroCategoriaId = catRow.rows[0].id;

    await db.pool.query(
      'UPDATE libros SET categoria_id = $1 WHERE isbn = $2',
      [caractLibroCategoriaId, CARACT_ISBN]
    );

    // Obtener el ref real desde GET /api/libros
    const listRes = await fetch(`${baseUrl}/libros`);
    const listJson = await listRes.json();
    const libroEnLista = listJson.data.find((l) => l.id === caractLibroId);
    assert.ok(libroEnLista, 'El libro creado debe aparecer en GET /api/libros');
    assert.ok(libroEnLista.ref, 'El libro en el listado debe tener campo ref');
    caractLibroRef = libroEnLista.ref;
  });

  // ── Caso 2: GET /api/libros sin filtros ─────────────────────────────────────

  await t.test('GET /api/libros sin filtros - 200 con { status, results, data } y cada libro con ref', async () => {
    const res = await fetch(`${baseUrl}/libros`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();

    assert.strictEqual(json.status, 'success');
    assert.ok(typeof json.results === 'number', 'results debe ser un número');
    assert.ok(Array.isArray(json.data), 'data debe ser un array');
    assert.strictEqual(json.results, json.data.length, 'results debe ser igual a data.length');
    assert.ok(json.data.length > 0, 'Debe haber al menos el libro creado');

    json.data.forEach((libro) => {
      assert.ok('ref' in libro, `El libro ${libro.id} debe tener campo ref`);
      assert.ok(typeof libro.ref === 'string' && libro.ref.length > 0, 'ref debe ser un string no vacío');
      assert.ok('id' in libro);
      assert.ok('titulo' in libro);
    });
  });

  // ── Caso 3: GET /api/libros con filtros ?q y ?categoriaId ───────────────────

  await t.test('GET /api/libros?q=<término> - filtra por título y devuelve coincidencias con ref', async () => {
    // El fixture googleBooksResponse siempre pone titulo = 'Libro fixture de Google'
    const res = await fetch(`${baseUrl}/libros?q=fixture`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();

    assert.strictEqual(json.status, 'success');
    assert.ok(Array.isArray(json.data));
    assert.strictEqual(json.results, json.data.length);

    // El libro creado debe aparecer en la búsqueda porque su título contiene 'fixture'
    const encontrado = json.data.find((l) => l.id === caractLibroId);
    assert.ok(encontrado, 'El libro de caracterización debe aparecer al buscar "fixture"');
    assert.ok('ref' in encontrado, 'El libro filtrado debe tener campo ref');
  });

  await t.test('GET /api/libros?categoriaId - (a) libro SÍ aparece con su cat; (b) NO con otra cat; (c) vacío con UUID inexistente', async () => {
    // El test "Preparar" ya asignó caractLibroCategoriaId al libro mediante UPDATE directo,
    // por lo que no hay rama condicional: la afirmación de inclusión es siempre incondicional.

    // ── (a) Filtrando por la categoría del libro: debe aparecer en data ────────
    const resA = await fetch(`${baseUrl}/libros?categoriaId=${caractLibroCategoriaId}`);
    assert.strictEqual(resA.status, 200);
    const jsonA = await resA.json();
    assert.strictEqual(jsonA.status, 'success');
    assert.ok(Array.isArray(jsonA.data));
    assert.strictEqual(jsonA.results, jsonA.data.length);
    jsonA.data.forEach((l) => assert.ok('ref' in l, 'Cada libro debe tener campo ref'));
    const libroEnA = jsonA.data.find((l) => l.id === caractLibroId);
    assert.ok(libroEnA, '(a) El libro debe aparecer al filtrar por su propia categoría');

    // ── (b) Con OTRA categoría real distinta: el libro NO debe aparecer ────────
    // El schema inserta 12+ categorías; tomamos la segunda por nombre (diferente a la primera).
    const otraCatRow = await db.pool.query(
      'SELECT id FROM categorias WHERE id != $1 ORDER BY nombre ASC LIMIT 1',
      [caractLibroCategoriaId]
    );
    assert.ok(otraCatRow.rows.length > 0, '(b) Debe existir al menos otra categoría en el seed');
    const otraCategoriaId = otraCatRow.rows[0].id;

    const resB = await fetch(`${baseUrl}/libros?categoriaId=${otraCategoriaId}`);
    assert.strictEqual(resB.status, 200);
    const jsonB = await resB.json();
    assert.strictEqual(jsonB.status, 'success');
    assert.ok(Array.isArray(jsonB.data));
    assert.strictEqual(jsonB.results, jsonB.data.length);
    const libroEnB = jsonB.data.find((l) => l.id === caractLibroId);
    assert.ok(!libroEnB, '(b) El libro NO debe aparecer al filtrar por una categoría diferente a la suya');

    // ── (c) Con UUID inexistente: data vacío y results 0 ──────────────────────
    const uuidInexistente = '00000000-0000-0000-0000-000000000099';
    const resC = await fetch(`${baseUrl}/libros?categoriaId=${uuidInexistente}`);
    assert.strictEqual(resC.status, 200);
    const jsonC = await resC.json();
    assert.strictEqual(jsonC.status, 'success');
    assert.ok(Array.isArray(jsonC.data));
    assert.strictEqual(jsonC.data.length, 0, '(c) Una categoría inexistente no debe retornar libros');
    assert.strictEqual(jsonC.results, 0);
  });

  // ── Caso 4: GET /api/libros/:ref con ref existente ──────────────────────────

  await t.test('GET /api/libros/:ref existente - 200 con { status, data: { ...libro, ref } } y ref coincide', async () => {
    assert.ok(caractLibroRef, 'Se necesita un ref válido del libro de caracterización');

    const res = await fetch(`${baseUrl}/libros/${caractLibroRef}`);
    assert.strictEqual(res.status, 200);
    const json = await res.json();

    assert.strictEqual(json.status, 'success');
    assert.ok(json.data, 'data debe existir');

    const data = json.data;
    // Campos base que findDetalleByRef siempre incluye en el detalle
    ['id', 'titulo', 'isbn', 'resena', 'imagen_url', 'precio',
      'creado_en', 'categoria_id', 'autor_nombre', 'editorial_nombre',
      'categoria_nombre', 'disponibilidad', 'stock_total', 'ref'].forEach((campo) => {
      assert.ok(campo in data, `El detalle debe incluir el campo "${campo}"`);
    });

    // El ref devuelto debe coincidir con el pedido
    assert.strictEqual(data.ref, caractLibroRef, 'El ref del detalle debe coincidir con el ref solicitado');
    assert.strictEqual(data.id, caractLibroId, 'El id del detalle debe corresponder al libro creado');
    assert.ok(Array.isArray(data.disponibilidad), 'disponibilidad debe ser un array');
  });

  // ── Caso 5: GET /api/libros/:ref con ref inexistente → 404 ──────────────────

  await t.test('GET /api/libros/:ref inexistente - 404 con { status: "fail", message }', async () => {
    // Un slug con shortId hex de 12 chars que casi con certeza no existe en la BD
    const refInexistente = 'libro-inexistente-deadbeef0000';
    const res = await fetch(`${baseUrl}/libros/${refInexistente}`);

    assert.strictEqual(res.status, 404);
    const json = await res.json();

    // Forma del cuerpo de error tal como responde hoy el errorHandler
    assert.strictEqual(json.status, 'fail', 'El status del cuerpo debe ser "fail" para errores 4xx');
    assert.ok(typeof json.message === 'string' && json.message.length > 0, 'Debe haber un mensaje de error');
  });

  // ── Limpieza: eliminar el libro de caracterización ─────────────────────────

  await t.test('Limpieza: eliminar libro de caracterización de la BD', async () => {
    await limpiarLibroCaracterizacion();
    assert.strictEqual(caractLibroId, null, 'El id debe haberse limpiado tras la eliminación');
  });

  await t.test('Cerrar Servidor y Pool de Conexiones', async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.pool.end();
  });
});
