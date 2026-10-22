const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateListarInventario,
  validateSalidaInventario,
  validateAjusteInventario,
  validateListarMovimientos,
  validateIngresoLibro,
  validateRegistrarLibro,
} = require('../src/middlewares/validator');

const VALID_UUID = '5a215402-f1fb-45a2-b20c-a5816e0445a0';
const OTHER_VALID_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Helper local para ejecutar un middleware de validación y capturar el resultado.
 *
 * @param {Function} middleware
 * @param {Object} req - Objeto mock de request Express ({ body, params, query })
 * @returns {{ error: import('../src/utils/errors').ValidationError|null, nextCalled: boolean }}
 */
function validate(middleware, req) {
  let error = null;
  let nextCalled = false;
  middleware(req, {}, (err) => {
    error = err || null;
    nextCalled = true;
  });
  return { error, nextCalled };
}

describe('Caracterización: validateListarInventario', () => {
  test('caso válido: sin parámetros en query llama a next sin error', () => {
    const { error, nextCalled } = validate(validateListarInventario, { query: {} });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso válido: estado y bodegaId correctos llama a next sin error', () => {
    const estadosValidos = ['todos', 'en_stock', 'bajo_stock', 'obsoleto'];
    for (const estado of estadosValidos) {
      const { error, nextCalled } = validate(validateListarInventario, {
        query: { estado, bodegaId: VALID_UUID },
      });
      assert.equal(nextCalled, true);
      assert.equal(error, null);
    }
  });

  test('caso inválido: estado desconocido rechaza con mensaje y detalle exactos', () => {
    const { error, nextCalled } = validate(validateListarInventario, {
      query: { estado: 'desconocido' },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Parámetros de consulta inválidos para inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "estado" no es válido. Opciones permitidas: todos, en_stock, bajo_stock, obsoleto.',
    ]);
  });

  test('caso inválido: estado en mayúsculas se rechaza (comparación sensible a mayúsculas)', () => {
    const { error, nextCalled } = validate(validateListarInventario, {
      query: { estado: 'EN_STOCK' },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Parámetros de consulta inválidos para inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "estado" no es válido. Opciones permitidas: todos, en_stock, bajo_stock, obsoleto.',
    ]);
  });

  test('caso inválido: bodegaId no es UUID válido', () => {
    const { error, nextCalled } = validate(validateListarInventario, {
      query: { bodegaId: 'uuid-invalido-123' },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Parámetros de consulta inválidos para inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "bodegaId" debe ser un UUID válido.',
    ]);
  });

  test('caso inválido acumulado: estado y bodegaId erróneos en orden exacto', () => {
    const { error, nextCalled } = validate(validateListarInventario, {
      query: { estado: 'invalido', bodegaId: 'no-uuid' },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Parámetros de consulta inválidos para inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "estado" no es válido. Opciones permitidas: todos, en_stock, bajo_stock, obsoleto.',
      'El parámetro "bodegaId" debe ser un UUID válido.',
    ]);
  });
});

describe('Caracterización: validateSalidaInventario', () => {
  test('caso válido: id de inventario UUID y cantidad entera positiva', () => {
    const { error, nextCalled } = validate(validateSalidaInventario, {
      params: { id: VALID_UUID },
      body: { cantidad: 5, motivo: 'Venta presencial' },
    });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso inválido: id ausente en params', () => {
    const { error, nextCalled } = validate(validateSalidaInventario, {
      params: {},
      body: { cantidad: 3 },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para la salida de inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "id" de inventario debe ser un UUID válido.',
    ]);
  });

  test('caso inválido: id con formato no UUID', () => {
    const { error, nextCalled } = validate(validateSalidaInventario, {
      params: { id: '12345' },
      body: { cantidad: 3 },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para la salida de inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "id" de inventario debe ser un UUID válido.',
    ]);
  });

  test('caso inválido: cantidad ausente, nula o vacía', () => {
    for (const valor of [undefined, null, '']) {
      const { error, nextCalled } = validate(validateSalidaInventario, {
        params: { id: VALID_UUID },
        body: { cantidad: valor },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para la salida de inventario.');
      assert.deepEqual(error.details, [
        'El campo "cantidad" es obligatorio.',
      ]);
    }
  });

  test('caso inválido: cantidad igual a 0, negativa, decimal o no numérica', () => {
    for (const valor of [0, -1, -5, 2.5, 'tres']) {
      const { error, nextCalled } = validate(validateSalidaInventario, {
        params: { id: VALID_UUID },
        body: { cantidad: valor },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para la salida de inventario.');
      assert.deepEqual(error.details, [
        'El campo "cantidad" debe ser un número entero mayor o igual a 1.',
      ]);
    }
  });

  test('caso inválido acumulado: id inválido y cantidad ausente', () => {
    const { error, nextCalled } = validate(validateSalidaInventario, {
      params: { id: 'no-uuid' },
      body: {},
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para la salida de inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "id" de inventario debe ser un UUID válido.',
      'El campo "cantidad" es obligatorio.',
    ]);
  });
});

describe('Caracterización: validateAjusteInventario', () => {
  test('caso válido: id UUID, stockNuevo entero >= 0 y motivo no vacío', () => {
    const { error, nextCalled } = validate(validateAjusteInventario, {
      params: { id: VALID_UUID },
      body: { stockNuevo: 15, motivo: 'Conteo físico anual' },
    });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso válido: stockNuevo en 0 es permitido', () => {
    const { error, nextCalled } = validate(validateAjusteInventario, {
      params: { id: VALID_UUID },
      body: { stockNuevo: 0, motivo: 'Inventario en cero por obsolescencia' },
    });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso inválido: id ausente o no UUID', () => {
    const { error, nextCalled } = validate(validateAjusteInventario, {
      params: { id: 'malformado' },
      body: { stockNuevo: 5, motivo: 'Ajuste' },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el ajuste de inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "id" de inventario debe ser un UUID válido.',
    ]);
  });

  test('caso inválido: stockNuevo ausente, nulo o vacío', () => {
    for (const valor of [undefined, null, '']) {
      const { error, nextCalled } = validate(validateAjusteInventario, {
        params: { id: VALID_UUID },
        body: { stockNuevo: valor, motivo: 'Ajuste' },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el ajuste de inventario.');
      assert.deepEqual(error.details, [
        'El campo "stockNuevo" es obligatorio.',
      ]);
    }
  });

  test('caso inválido: stockNuevo negativo, decimal o no numérico', () => {
    for (const valor of [-1, -10, 4.25, 'cero']) {
      const { error, nextCalled } = validate(validateAjusteInventario, {
        params: { id: VALID_UUID },
        body: { stockNuevo: valor, motivo: 'Ajuste' },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el ajuste de inventario.');
      assert.deepEqual(error.details, [
        'El campo "stockNuevo" debe ser un número entero mayor o igual a 0.',
      ]);
    }
  });

  test('caso inválido: motivo ausente, vacío, con espacios o no string', () => {
    for (const valor of [undefined, null, '', '   ', 12345]) {
      const { error, nextCalled } = validate(validateAjusteInventario, {
        params: { id: VALID_UUID },
        body: { stockNuevo: 5, motivo: valor },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el ajuste de inventario.');
      assert.deepEqual(error.details, [
        'El campo "motivo" es obligatorio y debe ser una cadena no vacía.',
      ]);
    }
  });

  test('caso inválido acumulado: id, stockNuevo y motivo erróneos simultáneamente', () => {
    const { error, nextCalled } = validate(validateAjusteInventario, {
      params: { id: 'invalido' },
      body: { stockNuevo: '', motivo: '' },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el ajuste de inventario.');
    assert.deepEqual(error.details, [
      'El parámetro "id" de inventario debe ser un UUID válido.',
      'El campo "stockNuevo" es obligatorio.',
      'El campo "motivo" es obligatorio y debe ser una cadena no vacía.',
    ]);
  });
});

describe('Caracterización: validateListarMovimientos', () => {
  test('caso válido: sin parámetros de consulta llama a next sin error', () => {
    const { error, nextCalled } = validate(validateListarMovimientos, { query: {} });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso válido: todos los parámetros con valores correctos', () => {
    const { error, nextCalled } = validate(validateListarMovimientos, {
      query: {
        libroId: VALID_UUID,
        bodegaId: OTHER_VALID_UUID,
        tipo: 'Ingreso',
        limit: 50,
        offset: 0,
      },
    });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso válido: tipo en distintas mayúsculas/minúsculas es aceptado', () => {
    const tipos = ['ingreso', 'Ingreso', 'INGRESO', 'sAliDa', 'SALIDA', 'ajuste', 'Ajuste', 'AJUSTE'];
    for (const tipo of tipos) {
      const { error, nextCalled } = validate(validateListarMovimientos, {
        query: { tipo },
      });
      assert.equal(nextCalled, true);
      assert.equal(error, null);
    }
  });

  test('caso válido: límites frontera 1 y 200, y offset frontera 0', () => {
    for (const limit of [1, 200]) {
      const { error, nextCalled } = validate(validateListarMovimientos, {
        query: { limit, offset: 0 },
      });
      assert.equal(nextCalled, true);
      assert.equal(error, null);
    }
  });

  test('caso inválido: libroId o bodegaId con formato no UUID', () => {
    const { error: errLibro } = validate(validateListarMovimientos, {
      query: { libroId: 'malformado' },
    });
    assert.equal(errLibro.message, 'Parámetros de consulta inválidos para movimientos.');
    assert.deepEqual(errLibro.details, [
      'El parámetro "libroId" debe ser un UUID válido.',
    ]);

    const { error: errBodega } = validate(validateListarMovimientos, {
      query: { bodegaId: 'malformado' },
    });
    assert.equal(errBodega.message, 'Parámetros de consulta inválidos para movimientos.');
    assert.deepEqual(errBodega.details, [
      'El parámetro "bodegaId" debe ser un UUID válido.',
    ]);
  });

  test('caso inválido: tipo no permitido', () => {
    const { error, nextCalled } = validate(validateListarMovimientos, {
      query: { tipo: 'transferencia' },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Parámetros de consulta inválidos para movimientos.');
    assert.deepEqual(error.details, [
      'El parámetro "tipo" debe ser uno de: Ingreso, Salida, Ajuste.',
    ]);
  });

  test('comportamiento actual: tipo no string (p. ej. arreglo) lanza TypeError en vez de ValidationError', () => {
    assert.throws(
      () => validateListarMovimientos({ query: { tipo: ['ingreso'] } }, {}, () => {}),
      TypeError
    );
  });

  test('caso inválido: limit en 0, 201 y decimal', () => {
    for (const limit of [0, 201, 10.5, '20.5', 'cero']) {
      const { error, nextCalled } = validate(validateListarMovimientos, {
        query: { limit },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Parámetros de consulta inválidos para movimientos.');
      assert.deepEqual(error.details, [
        'El parámetro "limit" debe ser un número entero entre 1 y 200.',
      ]);
    }
  });

  test('caso inválido: offset negativo, decimal o no entero', () => {
    for (const offset of [-1, -50, 2.75, 'menos_uno']) {
      const { error, nextCalled } = validate(validateListarMovimientos, {
        query: { offset },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Parámetros de consulta inválidos para movimientos.');
      assert.deepEqual(error.details, [
        'El parámetro "offset" debe ser un número entero mayor o igual a 0.',
      ]);
    }
  });

  test('caso inválido acumulado: todos los parámetros erróneos a la vez', () => {
    const { error, nextCalled } = validate(validateListarMovimientos, {
      query: {
        libroId: 'invalido',
        bodegaId: 'invalido',
        tipo: 'invalido',
        limit: 0,
        offset: -1,
      },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Parámetros de consulta inválidos para movimientos.');
    assert.deepEqual(error.details, [
      'El parámetro "libroId" debe ser un UUID válido.',
      'El parámetro "bodegaId" debe ser un UUID válido.',
      'El parámetro "tipo" debe ser uno de: Ingreso, Salida, Ajuste.',
      'El parámetro "limit" debe ser un número entero entre 1 y 200.',
      'El parámetro "offset" debe ser un número entero mayor o igual a 0.',
    ]);
  });
});

describe('Caracterización: validateIngresoLibro', () => {
  test('caso válido: id de libro UUID, bodegaId UUID y cantidad entera >= 1', () => {
    const { error, nextCalled } = validate(validateIngresoLibro, {
      params: { id: VALID_UUID },
      body: { bodegaId: OTHER_VALID_UUID, cantidad: 10 },
    });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso inválido: parámetro id ausente o no UUID', () => {
    for (const id of [undefined, '', 'no-es-uuid']) {
      const { error, nextCalled } = validate(validateIngresoLibro, {
        params: { id },
        body: { bodegaId: VALID_UUID, cantidad: 5 },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el ingreso.');
      assert.deepEqual(error.details, [
        'El parámetro "id" del libro debe ser un UUID válido.',
      ]);
    }
  });

  test('caso inválido: bodegaId ausente', () => {
    const { error, nextCalled } = validate(validateIngresoLibro, {
      params: { id: VALID_UUID },
      body: { cantidad: 5 },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el ingreso.');
    assert.deepEqual(error.details, [
      'El campo "bodegaId" es obligatorio.',
    ]);
  });

  test('caso inválido: bodegaId no es UUID válido', () => {
    const { error, nextCalled } = validate(validateIngresoLibro, {
      params: { id: VALID_UUID },
      body: { bodegaId: 'uuid-invalido', cantidad: 5 },
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el ingreso.');
    assert.deepEqual(error.details, [
      'El campo "bodegaId" debe ser un UUID válido.',
    ]);
  });

  test('caso inválido: cantidad ausente, nula o vacía', () => {
    for (const cantidad of [undefined, null, '']) {
      const { error, nextCalled } = validate(validateIngresoLibro, {
        params: { id: VALID_UUID },
        body: { bodegaId: VALID_UUID, cantidad },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el ingreso.');
      assert.deepEqual(error.details, [
        'El campo "cantidad" es obligatorio.',
      ]);
    }
  });

  test('caso inválido: cantidad en 0, negativa, decimal o no entera', () => {
    for (const cantidad of [0, -2, 3.14, 'cinco']) {
      const { error, nextCalled } = validate(validateIngresoLibro, {
        params: { id: VALID_UUID },
        body: { bodegaId: VALID_UUID, cantidad },
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el ingreso.');
      assert.deepEqual(error.details, [
        'El campo "cantidad" debe ser un número entero mayor o igual a 1.',
      ]);
    }
  });

  test('caso inválido acumulado: id, bodegaId y cantidad erróneos a la vez', () => {
    const { error, nextCalled } = validate(validateIngresoLibro, {
      params: { id: 'x' },
      body: {},
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el ingreso.');
    assert.deepEqual(error.details, [
      'El parámetro "id" del libro debe ser un UUID válido.',
      'El campo "bodegaId" es obligatorio.',
      'El campo "cantidad" es obligatorio.',
    ]);
  });
});

describe('Caracterización: validateRegistrarLibro (casos límite adicionales)', () => {
  const payloadBaseValido = (overrides = {}) => ({
    isbn: '9780135957059',
    titulo: 'Clean Code',
    autor: 'Robert C. Martin',
    categoriaId: VALID_UUID,
    resena: 'Manual de estilo ágil para desarrollo de software.',
    cantidad: 5,
    stockMinimo: 2,
    precio: 29.99,
    bodegaId: VALID_UUID,
    ...overrides,
  });

  test('caso válido: payload base completo llama a next sin error', () => {
    const { error, nextCalled } = validate(validateRegistrarLibro, {
      body: payloadBaseValido(),
    });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso límite: precio negativo es rechazado', () => {
    for (const precio of [-1, -0.01, -100]) {
      const { error, nextCalled } = validate(validateRegistrarLibro, {
        body: payloadBaseValido({ precio }),
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el registro del libro.');
      assert.deepEqual(error.details, [
        'El campo "precio" debe ser un número mayor o igual a 0.',
      ]);
    }
  });

  test('caso límite: precio en 0 es permitido', () => {
    const { error, nextCalled } = validate(validateRegistrarLibro, {
      body: payloadBaseValido({ precio: 0 }),
    });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso límite: cantidad en 0 es rechazada por ser menor que 1', () => {
    const { error, nextCalled } = validate(validateRegistrarLibro, {
      body: payloadBaseValido({ cantidad: 0 }),
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el registro del libro.');
    assert.deepEqual(error.details, [
      'El campo "cantidad" debe ser un número entero mayor o igual a 1.',
    ]);
  });

  test('caso límite: cantidad como cadena vacía activa validación de obligatoriedad', () => {
    const { error, nextCalled } = validate(validateRegistrarLibro, {
      body: payloadBaseValido({ cantidad: '' }),
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el registro del libro.');
    assert.deepEqual(error.details, [
      'El campo "cantidad" es obligatorio.',
    ]);
  });

  test('caso límite: cantidad decimal es rechazada por no ser entero', () => {
    const { error, nextCalled } = validate(validateRegistrarLibro, {
      body: payloadBaseValido({ cantidad: 3.5 }),
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el registro del libro.');
    assert.deepEqual(error.details, [
      'El campo "cantidad" debe ser un número entero mayor o igual a 1.',
    ]);
  });

  test('caso límite: stockMinimo inválido (negativo, decimal o no numérico)', () => {
    for (const stockMinimo of [-1, 2.5, 'invalido']) {
      const { error, nextCalled } = validate(validateRegistrarLibro, {
        body: payloadBaseValido({ stockMinimo }),
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el registro del libro.');
      assert.deepEqual(error.details, [
        'El campo "stockMinimo" debe ser un número entero mayor o igual a 0.',
      ]);
    }
  });

  test('caso límite: stockMinimo en 0 es permitido', () => {
    const { error, nextCalled } = validate(validateRegistrarLibro, {
      body: payloadBaseValido({ stockMinimo: 0 }),
    });
    assert.equal(nextCalled, true);
    assert.equal(error, null);
  });

  test('caso límite: autor igual al placeholder "Autor de Biblioteca Internacional"', () => {
    for (const autor of ['Autor de Biblioteca Internacional', '  Autor de Biblioteca Internacional  ']) {
      const { error, nextCalled } = validate(validateRegistrarLibro, {
        body: payloadBaseValido({ autor }),
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el registro del libro.');
      assert.deepEqual(error.details, [
        'El campo "autor" no puede ser el valor de marcador de posición ("Autor de Biblioteca Internacional"). Ingresa el nombre real del autor.',
      ]);
    }
  });

  test('caso límite: categoriaId vacío o solo espacios es obligatorio', () => {
    for (const categoriaId of ['', '   ', null, undefined]) {
      const { error, nextCalled } = validate(validateRegistrarLibro, {
        body: payloadBaseValido({ categoriaId }),
      });
      assert.equal(nextCalled, true);
      assert.ok(error);
      assert.equal(error.message, 'Datos de entrada inválidos para el registro del libro.');
      assert.deepEqual(error.details, [
        'El campo "categoriaId" es obligatorio.',
      ]);
    }
  });

  test('caso límite: categoriaId que no es UUID es rechazado', () => {
    const { error, nextCalled } = validate(validateRegistrarLibro, {
      body: payloadBaseValido({ categoriaId: 'no-es-uuid' }),
    });
    assert.equal(nextCalled, true);
    assert.ok(error);
    assert.equal(error.message, 'Datos de entrada inválidos para el registro del libro.');
    assert.deepEqual(error.details, [
      'El campo "categoriaId" debe ser un UUID válido.',
    ]);
  });
});
