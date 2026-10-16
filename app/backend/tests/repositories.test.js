const test = require('node:test');
const assert = require('node:assert');
const { sequelize, Autor, Editorial } = require('../src/models');

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

test('AutorRepository y EditorialRepository - upsert conserva rollback Sequelize y resuelve inserciones concurrentes', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const rollbackAutor = `Autor Rollback ORM ${suffix}`;
  const rollbackEditorial = `Editorial Rollback ORM ${suffix}`;
  const concurrentAutor = `Autor Concurrente ORM ${suffix}`;
  const concurrentEditorial = `Editorial Concurrente ORM ${suffix}`;

  await assert.rejects(sequelize.transaction(async (transaction) => {
    await autorRepository.upsert({ transaction }, {
      nombre: rollbackAutor,
      biografia: 'Prueba de atomicidad',
    });
    await editorialRepository.upsert({ transaction }, {
      nombre: rollbackEditorial,
      pais: 'País Temporal',
    });
    throw new Error('ROLLBACK_INTENCIONAL_REPOSITORIOS');
  }), /ROLLBACK_INTENCIONAL_REPOSITORIOS/);

  assert.strictEqual(await autorRepository.findByNombre(rollbackAutor), null);
  assert.strictEqual(await editorialRepository.findByNombre(rollbackEditorial), null);

  try {
    const [autores, editoriales] = await Promise.all([
      Promise.all([
        sequelize.transaction((transaction) => autorRepository.upsert({ transaction }, {
          nombre: concurrentAutor,
          biografia: 'Primera biografía',
        })),
        sequelize.transaction((transaction) => autorRepository.upsert({ transaction }, {
          nombre: concurrentAutor,
          biografia: 'Segunda biografía',
        })),
      ]),
      Promise.all([
        sequelize.transaction((transaction) => editorialRepository.upsert({ transaction }, {
          nombre: concurrentEditorial,
          pais: 'Guatemala',
        })),
        sequelize.transaction((transaction) => editorialRepository.upsert({ transaction }, {
          nombre: concurrentEditorial,
          pais: 'México',
        })),
      ]),
    ]);

    assert.strictEqual(autores[0].id, autores[1].id);
    assert.strictEqual(editoriales[0].id, editoriales[1].id);
    assert.strictEqual(await Autor.count({ where: { nombre: concurrentAutor } }), 1);
    assert.strictEqual(await Editorial.count({ where: { nombre: concurrentEditorial } }), 1);
  } finally {
    await Promise.all([
      Autor.destroy({ where: { nombre: concurrentAutor } }),
      Editorial.destroy({ where: { nombre: concurrentEditorial } }),
    ]);
  }
});
