export const AUTOR_PLACEHOLDER = 'Autor de Biblioteca Internacional';

/**
 * Valida regForm en el mismo orden que el submit original.
 * Devuelve { errorMessage } (error general), { fieldErrors } (errores por campo) o {} si es válido.
 */
export function validarRegistro(regForm) {
  const autorTrim = regForm.autor.trim();
  const nuevosFieldErrors = {};

  if (!autorTrim) {
    nuevosFieldErrors.autor = 'El autor es obligatorio.';
  } else if (autorTrim === AUTOR_PLACEHOLDER) {
    nuevosFieldErrors.autor = `Ingresa el nombre real del autor (no se permite "${AUTOR_PLACEHOLDER}").`;
  }

  if (!regForm.categoriaId) {
    nuevosFieldErrors.categoriaId = 'Debes seleccionar una categoría.';
  }

  if (!regForm.titulo.trim()) {
    return { errorMessage: 'El título es obligatorio.' };
  }
  if (Object.keys(nuevosFieldErrors).length > 0) {
    return { fieldErrors: nuevosFieldErrors };
  }
  if (!regForm.resena.trim()) return { errorMessage: 'La reseña es obligatoria.' };
  if (!regForm.bodegaId) return { errorMessage: 'Selecciona una bodega.' };
  if (!regForm.cantidad || Number(regForm.cantidad) < 1) {
    return { errorMessage: 'La cantidad debe ser un entero ≥ 1.' };
  }
  return {};
}
