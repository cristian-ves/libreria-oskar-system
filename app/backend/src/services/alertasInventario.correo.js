const { escaparHtml, COLORES } = require('./mail/plantillas');

function crearResumenCorreo({ alertas, fecha }) {
  const rowsHtml = alertas.map((a) => `<tr>
    <td style="padding:10px;border-bottom:1px solid ${COLORES.borde};">${escaparHtml(a.titulo)}${a.isbn ? `<br><small>ISBN: ${escaparHtml(a.isbn)}</small>` : ''}</td>
    <td style="padding:10px;border-bottom:1px solid ${COLORES.borde};">${escaparHtml(a.bodega)}</td>
    <td style="padding:10px;border-bottom:1px solid ${COLORES.borde};text-align:right;">${escaparHtml(a.stock_actual)}</td>
    <td style="padding:10px;border-bottom:1px solid ${COLORES.borde};text-align:right;">${escaparHtml(a.stock_minimo)}</td>
    <td style="padding:10px;border-bottom:1px solid ${COLORES.borde};text-align:right;">${escaparHtml(a.deficit)}</td>
  </tr>`).join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Alerta de inventario</title></head>
  <body style="margin:0;background:${COLORES.fondo};font-family:Arial,Helvetica,sans-serif;color:${COLORES.texto};"><main style="max-width:900px;margin:24px auto;background:${COLORES.blanco};padding:24px;border:1px solid ${COLORES.borde};border-radius:12px;">
  <header style="font-size:20px;font-weight:bold;margin-bottom:22px;">Librería <span style="background:${COLORES.dorado};padding:3px 8px;border-radius:5px;">Oskar</span></header>
  <h1 style="font-size:22px;">Alerta de stock mínimo</h1><p>Reporte del ${escaparHtml(fecha)}. Se encontraron <strong>${alertas.length}</strong> libros que requieren reposición.</p>
  <div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:14px;"><thead><tr style="background:${COLORES.fondo};text-align:left;">
  <th style="padding:10px;">Libro / ISBN</th><th style="padding:10px;">Bodega</th><th style="padding:10px;text-align:right;">Existencias</th><th style="padding:10px;text-align:right;">Stock mínimo</th><th style="padding:10px;text-align:right;">Déficit</th>
  </tr></thead><tbody>${rowsHtml}</tbody></table></div><p style="margin-top:22px;">Se recomienda revisar el inventario y programar la reposición correspondiente.</p>
  <footer style="margin-top:28px;font-size:12px;color:${COLORES.gris};text-align:center;">Mensaje automático de Librería Oskar.</footer></main></body></html>`;
  const texto = [
    'Librería Oskar — Alerta de stock mínimo', `Reporte del ${fecha}. ${alertas.length} libros requieren reposición.`, '',
    ...alertas.map((a) => `${a.titulo}${a.isbn ? ` (ISBN ${a.isbn})` : ''} | Bodega: ${a.bodega} | Existencias: ${a.stock_actual} | Mínimo: ${a.stock_minimo} | Déficit: ${a.deficit}`),
    '', 'Se recomienda revisar el inventario y programar la reposición correspondiente.',
  ].join('\n');
  return { asunto: `Alerta de stock mínimo — ${fecha}`, html, texto };
}

module.exports = { crearResumenCorreo };
