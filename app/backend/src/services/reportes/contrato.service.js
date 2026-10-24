function respuestaPaginada({ filtros, total, limit, offset, propiedadDatos, datos, extra = {} }) {
  return {
    filtros,
    total,
    limit,
    offset,
    [propiedadDatos]: datos,
    ...extra,
  };
}

module.exports = { respuestaPaginada };
