import { AUTOR_PLACEHOLDER } from './validacion.js';

// Nombres del backend (campos_faltantes) → claves de regForm.
export const CLAVE_POR_CAMPO_BACKEND = {
  titulo: 'titulo',
  autor: 'autor',
  editorial: 'editorial',
  resena: 'resena',
  imagen_url: 'imagenUrl',
  categoria: 'categoriaId',
};

// Obligatorios en el orden en que aparecen en el formulario.
export const OBLIGATORIOS = [
  { clave: 'titulo', etiqueta: 'Título' },
  { clave: 'autor', etiqueta: 'Autor' },
  { clave: 'categoriaId', etiqueta: 'Categoría' },
  { clave: 'resena', etiqueta: 'Reseña' },
];

// Campos que rellena la consulta, en orden de pantalla.
const CLAVES_CONSULTA = ['titulo', 'autor', 'editorial', 'categoriaId', 'resena', 'imagenUrl'];

export const CLASE_AMBAR = 'border-amber-500 ring-1 ring-amber-300';

const FUENTES = {
  'Google Books API': 'Google Books',
  'OpenLibrary Fallback': 'OpenLibrary',
  'Catálogo Bibliográfico de Respaldo': 'el catálogo de respaldo',
};

export const estaVacio = (v) => v == null || String(v).trim() === '';

// Valores que se reinician en cada consulta (también en modo manual); la bodega se conserva.
export const REINICIO_CONSULTA = { categoriaId: '', cantidad: 1, stockMinimo: 5 };

// Aplica lo prellenado sobre el formulario anterior sin arrastrar categoría, cantidad ni stock mínimo.
export const aplicarPrellenado = (form, valores) => ({ ...form, ...REINICIO_CONSULTA, ...valores, precio: '' });

export function prellenarDesdeSugerencia(sug, isbn) {
  const valores = {
    isbn: sug?.isbn || isbn,
    titulo: sug?.titulo || '',
    autor: (!sug || sug.autor === AUTOR_PLACEHOLDER) ? '' : (sug.autor || ''),
    editorial: sug?.editorial || '',
    resena: sug?.resena || '',
    imagenUrl: sug?.imagen_url || '',
  };
  if (!sug) return { valores, camposFaltantes: [...CLAVES_CONSULTA] };

  const marcados = new Set((sug.campos_faltantes || []).map(c => CLAVE_POR_CAMPO_BACKEND[c]));
  const camposFaltantes = CLAVES_CONSULTA.filter(
    clave => clave === 'categoriaId' || marcados.has(clave) || estaVacio(valores[clave]),
  );
  return { valores, camposFaltantes };
}

export function obligatoriosFaltantes(regForm, camposFaltantes) {
  return OBLIGATORIOS.filter(o => camposFaltantes.includes(o.clave) && estaVacio(regForm[o.clave]));
}

export function obligatoriosVacios(regForm) {
  return OBLIGATORIOS.filter(o => estaVacio(regForm[o.clave]));
}

// Texto bajo el botón: vacíos más el autor si es el placeholder (el botón ya lo bloquea).
export function pendientesParaGuardar(regForm) {
  const placeholder = String(regForm.autor ?? '').trim() === AUTOR_PLACEHOLDER;
  return OBLIGATORIOS.flatMap(o => {
    if (estaVacio(regForm[o.clave])) return [o];
    return o.clave === 'autor' && placeholder ? [{ ...o, etiqueta: 'Autor (nombre real)' }] : [];
  });
}

// Un campo se resalta o muestra pista solo si se marcó al consultar y sigue vacío.
export const estaFaltante = (regForm, camposFaltantes, clave) =>
  camposFaltantes.includes(clave) && estaVacio(regForm[clave]);

export const nombreFuente = (fuente) => FUENTES[fuente] || fuente;

export function rotuloSugerencia(fuente) {
  if (!fuente) return 'Sugerencia';
  const nombre = nombreFuente(fuente);
  return nombre.startsWith('el ') ? `Sugerencia del ${nombre.slice(3)}` : `Sugerencia de ${nombre}`;
}
