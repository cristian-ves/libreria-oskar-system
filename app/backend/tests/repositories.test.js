const test = require('node:test');
const assert = require('node:assert');
const { sequelize } = require('../src/config/sequelize');
const db = require('../src/config/db');

const categoriaRepository = require('../src/repositories/categoria.repository');
const autorRepository = require('../src/repositories/autor.repository');
const editorialRepository = require('../src/repositories/editorial.repository');

test('CategoriaRepository - findAll() retorna categorías en orden alfabético como objetos planos', async () => {
  const categorias = await categoriaRepository.findAll();
  assert.ok(Array.isArray(categorias), 'Debe retornar un arreglo');
  assert.ok(categorias.length > 0, 'Debe contener categorías');

  const primera = categorias[0];
  assert.ok(primera.id, 'Debe contener la propiedad id');
  assert.ok(primera.nombre, 'Debe contener la propiedad nombre');

  // Verificar ordenamiento alfabético
  for (let i = 1; i < categorias.length; i++) {
    assert.ok(
      categorias[i - 1].nombre.localeCompare(categorias[i].nombre) <= 0,
      `Debe estar ordenado alfabéticamente: "${categorias[i - 1].nombre}" vs "${categorias[i].nombre}"`
    );
  }
});

test('CategoriaRepository - findById() y findByNombre() buscan correctamente', async () => {
  const categorias = await categoriaRepository.findAll();
  const muestra = categorias[0];

  // Buscar por ID
  const porId = await categoriaRepository.findById(muestra.id);
  assert.ok(porId, 'Debe encontrar la categoría por ID');
  assert.strictEqual(porId.id, muestra.id);
  assert.strictEqual(porId.nombre, muestra.nombre);

  // Buscar por nombre (case-insensitive)
  const porNombre = await categoriaRepository.findByNombre(muestra.nombre.toUpperCase());
  assert.ok(porNombre, 'Debe encontrar la categoría ignorando mayúsculas');
  assert.strictEqual(porNombre.id, muestra.id);

  // Búsqueda de inexistente
  const noExiste = await categoriaRepository.findByNombre('CategoriaInexistenteXYZ123');
  assert.strictEqual(noExiste, null);
});

test('AutorRepository - findByNombre(), findById() y findAll() con Sequelize', async () => {
  // 1. Crear un autor de prueba dentro de una transacción Sequelize para rollback
  const t = await sequelize.transaction();
  try {
    const nombreUnico = `Autor Test ${Date.now()}`;
    const autorCreado = await autorRepository.create(
      { nombre: nombreUnico, biografia: 'Biografía de prueba' },
      { transaction: t }
    );

    assert.ok(autorCreado.id, 'El autor creado debe tener un UUID');
    assert.strictEqual(autorCreado.nombre, nombreUnico);
    assert.strictEqual(autorCreado.biografia, 'Biografía de prueba');

    // 2. Buscar por nombre
    const encontradoPorNombre = await autorRepository.findByNombre(nombreUnico.toLowerCase(), { transaction: t });
    assert.ok(encontradoPorNombre, 'Debe encontrar el autor por nombre case-insensitive');
    assert.strictEqual(encontradoPorNombre.id, autorCreado.id);

    // 3. Buscar por ID
    const encontradoPorId = await autorRepository.findById(autorCreado.id, { transaction: t });
    assert.ok(encontradoPorId, 'Debe encontrar el autor por ID');
    assert.strictEqual(encontradoPorId.nombre, nombreUnico);

    // 4. Upsert con Sequelize (actualizar biografía)
    const autorActualizado = await autorRepository.upsert(
      { transaction: t },
      { nombre: nombreUnico, biografia: 'Biografía actualizada' }
    );
    assert.strictEqual(autorActualizado.id, autorCreado.id);
    assert.strictEqual(autorActualizado.biografia, 'Biografía actualizada');

    await t.rollback();
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

test('EditorialRepository - findByNombre(), findById() y findAll() con Sequelize', async () => {
  const t = await sequelize.transaction();
  try {
    const nombreUnico = `Editorial Test ${Date.now()}`;
    const editorialCreada = await editorialRepository.create(
      { nombre: nombreUnico, pais: 'Guatemala' },
      { transaction: t }
    );

    assert.ok(editorialCreada.id, 'La editorial creada debe tener un UUID');
    assert.strictEqual(editorialCreada.nombre, nombreUnico);
    assert.strictEqual(editorialCreada.pais, 'Guatemala');

    // Buscar por nombre
    const encontrada = await editorialRepository.findByNombre(nombreUnico.toLowerCase(), { transaction: t });
    assert.ok(encontrada, 'Debe encontrar la editorial por nombre case-insensitive');
    assert.strictEqual(encontrada.id, editorialCreada.id);

    // Buscar por ID
    const porId = await editorialRepository.findById(editorialCreada.id, { transaction: t });
    assert.ok(porId, 'Debe encontrar la editorial por ID');
    assert.strictEqual(porId.nombre, nombreUnico);

    // Upsert con Sequelize (actualizar país)
    const actualizada = await editorialRepository.upsert(
      { transaction: t },
      { nombre: nombreUnico, pais: 'México' }
    );
    assert.strictEqual(actualizada.id, editorialCreada.id);
    assert.strictEqual(actualizada.pais, 'México');

    await t.rollback();
  } catch (err) {
    await t.rollback();
    throw err;
  }
});

test('AutorRepository y EditorialRepository - compatibilidad con cliente transaccional pg (ACID rollback)', async () => {
  // Probar que cuando se pasa un cliente pg activo (db.withTransaction), la delegación transaccional funciona y preserva el rollback
  let autorIdGuardado = null;
  let editorialIdGuardada = null;

  try {
    await db.withTransaction(async (client) => {
      const autor = await autorRepository.upsert(client, {
        nombre: `Autor Rollback ${Date.now()}`,
        biografia: 'Prueba de atomicidad',
      });
      autorIdGuardado = autor.id;

      const editorial = await editorialRepository.upsert(client, {
        nombre: `Editorial Rollback ${Date.now()}`,
        pais: 'País Temporal',
      });
      editorialIdGuardada = editorial.id;

      // Provocar error intencional para verificar ROLLBACK en la transacción pg
      throw new Error('ROLLBACK_INTENCIONAL_REPOSITORIOS');
    });
  } catch (err) {
    assert.strictEqual(err.message, 'ROLLBACK_INTENCIONAL_REPOSITORIOS');
  }

  // Verificar que los registros NO existen en PostgreSQL tras el rollback
  assert.ok(autorIdGuardado, 'Se generó un ID temporal');
  assert.ok(editorialIdGuardada, 'Se generó un ID temporal');

  const autorPostRollback = await autorRepository.findById(autorIdGuardado);
  assert.strictEqual(autorPostRollback, null, 'El autor no debe existir tras el rollback de pg');

  const editorialPostRollback = await editorialRepository.findById(editorialIdGuardada);
  assert.strictEqual(editorialPostRollback, null, 'La editorial no debe existir tras el rollback de pg');
});
