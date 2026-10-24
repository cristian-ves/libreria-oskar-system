const PDFDocument = require('pdfkit');

const MARGIN = 34;

function valorPdf(value, type) {
  if (value === null || value === undefined || value === '') return 'No disponible';
  if (type === 'money') {
    const raw = String(value).trim();
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
    if (!match) return 'No disponible';
    const enteros = match[1].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return `Q ${enteros}.${(match[2] || '').padEnd(2, '0')}`;
  }
  if (type === 'integer' || type === 'number') {
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat('es-GT', { maximumFractionDigits: type === 'integer' ? 0 : 2 }).format(number) : 'No disponible';
  }
  if (type === 'date' || type === 'datetime') {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', dateStyle: 'short', ...(type === 'datetime' ? { timeStyle: 'short' } : {}) }).format(date);
  }
  if (type === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}

function compatibleConHelvetica(value) {
  return String(value).replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, ' ')
    .replace(/[^\u0000-\u00ff]/g, '?');
}

function textoAjustado(doc, value, width, height) {
  const text = compatibleConHelvetica(value);
  if (doc.heightOfString(text, { width, lineGap: 1 }) <= height) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${text.slice(0, mid)}...`;
    if (doc.heightOfString(candidate, { width, lineGap: 1 }) <= height) low = mid;
    else high = mid - 1;
  }
  return `${text.slice(0, low)}...`;
}

function pesos(column) {
  if (column.peso) return column.peso;
  if (column.tipo === 'money' || column.tipo === 'integer' || column.tipo === 'number') return 1;
  if (/titulo|libro|motivo|vendedor|nota|categor/i.test(column.titulo)) return 2.1;
  if (/id|isbn|estado|activo|tipo|fecha|posición/i.test(column.titulo)) return 1.05;
  return 1.4;
}

function widthsFor(section, pageWidth) {
  const available = pageWidth - MARGIN * 2;
  const weights = section.columnas.map(pesos);
  const total = weights.reduce((sum, value) => sum + value, 0);
  return weights.map((weight) => available * weight / total);
}

function pageHeader(doc, report, section, layout) {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - MARGIN * 2;
  doc.fillColor('#263b52').font('Helvetica-Bold').fontSize(9).text('LIBRERÍA OSKAR', MARGIN, MARGIN, { width: contentWidth, align: 'right' });
  doc.fillColor('#172838').fontSize(15).text(compatibleConHelvetica(report.titulo), MARGIN, MARGIN + 14, { width: contentWidth, height: 22, ellipsis: true });
  doc.font('Helvetica-Bold').fontSize(10).text(compatibleConHelvetica(section.titulo), MARGIN, MARGIN + 39, { width: contentWidth, height: 15, ellipsis: true });
  doc.font('Helvetica').fontSize(7.5).fillColor('#46545f')
    .text(`Generado: ${report.fechaGeneracion.toISOString()}  |  Filtros: ${compatibleConHelvetica(JSON.stringify(report.filtros))}`, MARGIN, MARGIN + 57, { width: contentWidth, height: 20, ellipsis: true });
  const notes = [...report.notas, ...(section.notas || [])].filter(Boolean).join(' ');
  doc.text(compatibleConHelvetica(notes || 'Sin notas adicionales.'), MARGIN, MARGIN + 77, { width: contentWidth, height: 22, ellipsis: true });
  const y = MARGIN + 104;
  const widths = widthsFor(section, pageWidth);
  const headerHeight = 25;
  let x = MARGIN;
  section.columnas.forEach((column, index) => {
    doc.save().rect(x, y, widths[index], headerHeight).fill('#426b8a').restore();
    doc.fillColor('white').font('Helvetica-Bold').fontSize(7)
      .text(textoAjustado(doc, column.titulo, widths[index] - 8, headerHeight - 5), x + 4, y + 5, { width: widths[index] - 8, height: headerHeight - 7, ellipsis: true });
    x += widths[index];
  });
  doc.fillColor('black').font('Helvetica').fontSize(7.5);
  return { y: y + headerHeight, widths, headerY: y, headerHeight, pageWidth };
}

function drawRow(doc, section, row, layout, y, rowHeight, isTotal = false) {
  let x = MARGIN;
  section.columnas.forEach((column, index) => {
    const width = layout.widths[index];
    if (!isTotal && row._band) doc.save().rect(x, y, width, rowHeight).fill('#f2f6f8').restore();
    doc.save().rect(x, y, width, rowHeight).strokeColor(isTotal ? '#263b52' : '#d5dde3').lineWidth(isTotal ? 0.8 : 0.35).stroke().restore();
    doc.font(isTotal ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor('#18232c');
    const text = textoAjustado(doc, valorPdf(row[column.clave], column.tipo), width - 8, rowHeight - 8);
    doc.text(text, x + 4, y + 4, { width: width - 8, height: rowHeight - 8, align: column.tipo === 'money' || column.tipo === 'integer' || column.tipo === 'number' ? 'right' : 'left', lineGap: 1 });
    x += width;
  });
}

async function exportarPdf(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, bufferPages: true, margin: MARGIN, info: { Title: report.titulo, Author: 'Librería Oskar', Subject: 'Reporte administrativo' } });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    for (const section of report.secciones) {
      if (!section.columnas.length) continue;
      const layoutName = section.columnas.length > 4 ? 'landscape' : 'portrait';
      const dimensions = layoutName === 'landscape' ? [841.89, 595.28] : [595.28, 841.89];
      let layout;
      let y;
      const addPage = () => {
        doc.addPage({ size: 'A4', layout: layoutName, margin: MARGIN });
        layout = pageHeader(doc, report, section, layoutName);
        y = layout.y;
      };
      addPage();
      const maxHeight = dimensions[1] - MARGIN - 25 - y;
      if (!section.filas.length) {
        const row = Object.fromEntries(section.columnas.map((column, index) => [column.clave, index === 0 ? 'Sin registros' : null]));
        drawRow(doc, section, row, layout, y, 24);
        y += 24;
      } else {
        section.filas.forEach((row, rowIndex) => {
          const values = section.columnas.map((column, index) => {
            doc.font('Helvetica').fontSize(7.5);
            return doc.heightOfString(compatibleConHelvetica(valorPdf(row[column.clave], column.tipo)), { width: layout.widths[index] - 8, lineGap: 1 });
          });
          const height = Math.min(maxHeight, Math.max(24, Math.ceil(Math.max(...values)) + 8));
          if (y + height > doc.page.height - MARGIN - 25) addPage();
          drawRow(doc, section, { ...row, _band: rowIndex % 2 === 1 }, layout, y, height);
          y += height;
        });
      }
      if (section.totales) {
        const totalHeight = 26;
        if (y + totalHeight > doc.page.height - MARGIN - 25) addPage();
        drawRow(doc, section, section.totales, layout, y, totalHeight, true);
      }
    }
    const range = doc.bufferedPageRange();
    for (let page = range.start; page < range.start + range.count; page += 1) {
      doc.switchToPage(page);
      doc.font('Helvetica').fontSize(8).fillColor('#46545f')
        .text(`Página ${page - range.start + 1} de ${range.count}`, MARGIN, doc.page.height - MARGIN + 5, { width: doc.page.width - MARGIN * 2, align: 'right' });
    }
    doc.end();
  });
}

module.exports = { exportarPdf };
