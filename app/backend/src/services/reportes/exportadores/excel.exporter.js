const ExcelJS = require('exceljs');

const MAX_TEXT_LENGTH = 32000;
const MONEY_FORMAT = '"Q" #,##0.00;[Red]("Q" #,##0.00)';
const DATE_FORMAT = 'dd/mm/yyyy hh:mm';

function fechaLocalGuatemala(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, Number(partValue)]));
  return new Date(Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second));
}

function celdaSegura(value, type) {
  if (value === null || value === undefined || value === '') return 'No disponible';
  if (type === 'money' || type === 'number') {
    const numeric = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : 'No disponible';
  }
  if (type === 'integer') {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) ? numeric : 'No disponible';
  }
  if (type === 'date' || type === 'datetime') {
    const date = fechaLocalGuatemala(value);
    return date || String(value);
  }
  if (type === 'boolean') return Boolean(value) ? 'Sí' : 'No';
  let text = String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ');
  if (text.length > MAX_TEXT_LENGTH) text = `${text.slice(0, MAX_TEXT_LENGTH - 1)}…`;
  // ExcelJS escribe fórmulas solo cuando recibe un objeto { formula }; anteponemos apóstrofo
  // además para que el contenido de usuarios siga siendo explícitamente texto al abrirlo en Excel.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return text;
}

function normalizarNombre(texto, fallback) {
  const limpio = String(texto || fallback).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 31);
  return limpio || fallback;
}

async function exportarExcel(reporte) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Librería Oskar';
  workbook.created = reporte.fechaGeneracion;
  workbook.modified = reporte.fechaGeneracion;
  workbook.properties.subject = 'Reporte administrativo';
  workbook.calcProperties.fullCalcOnLoad = false;

  reporte.secciones.forEach((seccion, index) => {
    const worksheet = workbook.addWorksheet(normalizarNombre(seccion.titulo, `Datos ${index + 1}`), {
      views: [{ state: 'frozen', ySplit: 6 }],
      pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: seccion.columnas.length > 5 ? 'landscape' : 'portrait' },
    });
    worksheet.mergeCells(1, 1, 1, Math.max(1, seccion.columnas.length));
    worksheet.getCell(1, 1).value = celdaSegura(`${reporte.titulo} — ${seccion.titulo}`, 'text');
    worksheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    worksheet.getCell(1, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF263B52' } };
    worksheet.getCell(2, 1).value = 'Librería Oskar';
    worksheet.getCell(2, 1).font = { bold: true, color: { argb: 'FF263B52' } };
    worksheet.getCell(3, 1).value = `Generado: ${reporte.fechaGeneracion.toISOString()}`;
    worksheet.getCell(4, 1).value = `Filtros: ${JSON.stringify(reporte.filtros)}`;
    worksheet.getCell(5, 1).value = reporte.notas.join(' | ') || 'Sin notas adicionales.';
    [3, 4, 5].forEach((row) => {
      worksheet.mergeCells(row, 1, row, Math.max(1, seccion.columnas.length));
      worksheet.getRow(row).height = row === 5 ? 30 : 24;
      worksheet.getCell(row, 1).alignment = { vertical: 'middle', wrapText: true };
    });
    const headerRow = worksheet.getRow(6);
    headerRow.values = seccion.columnas.map((col) => col.titulo);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF426B8A' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF263B52' } } };
    });

    seccion.columnas.forEach((col, i) => {
      const column = worksheet.getColumn(i + 1);
      column.width = col.ancho || Math.min(42, Math.max(14, col.titulo.length + 4));
      column.alignment = { vertical: 'top', wrapText: true, horizontal: col.tipo === 'money' || col.tipo === 'integer' || col.tipo === 'number' ? 'right' : 'left' };
    });
    const firstDataRow = 7;
    seccion.filas.forEach((row, rowIndex) => {
      const excelRow = worksheet.getRow(firstDataRow + rowIndex);
      seccion.columnas.forEach((column, columnIndex) => {
        const cell = excelRow.getCell(columnIndex + 1);
        cell.value = celdaSegura(row[column.clave], column.tipo);
        if (column.tipo === 'money') cell.numFmt = MONEY_FORMAT;
        else if (column.tipo === 'number') cell.numFmt = '#,##0.00';
        else if (column.tipo === 'integer') cell.numFmt = '#,##0';
        else if (column.tipo === 'date' || column.tipo === 'datetime') cell.numFmt = DATE_FORMAT;
        cell.alignment = { vertical: 'top', wrapText: true, horizontal: column.tipo === 'money' || column.tipo === 'integer' || column.tipo === 'number' ? 'right' : 'left' };
      });
      excelRow.height = 30;
      if (rowIndex % 2 === 1) excelRow.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6F8' } }; });
    });
    if (!seccion.filas.length) {
      worksheet.mergeCells(firstDataRow, 1, firstDataRow, Math.max(1, seccion.columnas.length));
      worksheet.getCell(firstDataRow, 1).value = 'Sin registros';
      worksheet.getCell(firstDataRow, 1).font = { italic: true, color: { argb: 'FF667788' } };
    }
    if (seccion.totales) {
      const rowIndex = firstDataRow + Math.max(1, seccion.filas.length);
      const totalRow = worksheet.getRow(rowIndex);
      seccion.columnas.forEach((column, columnIndex) => {
        const cell = totalRow.getCell(columnIndex + 1);
        cell.value = celdaSegura(seccion.totales[column.clave], column.tipo);
        if (column.tipo === 'money') cell.numFmt = MONEY_FORMAT;
        else if (column.tipo === 'integer') cell.numFmt = '#,##0';
        cell.font = { bold: true };
        cell.border = { top: { style: 'thin', color: { argb: 'FF263B52' } } };
      });
    }
    const lastRow = Math.max(firstDataRow, firstDataRow + seccion.filas.length - 1);
    if (seccion.filas.length) worksheet.autoFilter = { from: { row: 6, column: 1 }, to: { row: lastRow, column: seccion.columnas.length } };
  });

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

module.exports = { exportarExcel };
