import { AlertCircle, BookOpen, ShieldCheck } from 'lucide-react';
import ErrorBox from '../../../components/ui/ErrorBox';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { AUTOR_PLACEHOLDER } from '../validacion';

export default function FormularioRegistro({
  regForm, setRegForm, fieldErrors, setFieldErrors, imgError, setImgError,
  errorBox, isLoading, loadingMaestros, bodegas, categorias, esAdmin, onSubmit,
}) {
  const ramasDerecho = categorias
    .filter(c => c.nombre && c.nombre.toLowerCase().startsWith('derecho'))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const otrasCategorias = categorias
    .filter(c => c.nombre && !c.nombre.toLowerCase().startsWith('derecho'))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const autorValido = regForm.autor.trim() !== '' && regForm.autor.trim() !== AUTOR_PLACEHOLDER;
  const categoriaValida = Boolean(regForm.categoriaId);
  const botonGuardarDeshabilitado = isLoading || !autorValido || !categoriaValida;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-bold text-[#252525] uppercase tracking-wider mb-4 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-[#e19922]" />
        Datos del Libro
      </h3>

      <ErrorBox error={errorBox} />

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <FieldLabel>ISBN</FieldLabel>
          <Input
            type="text"
            value={regForm.isbn}
            onChange={e => setRegForm(f => ({ ...f, isbn: e.target.value }))}
            disabled={isLoading}
            placeholder="Opcional — deja vacío si no tiene ISBN"
          />
        </div>

        <div>
          <FieldLabel required>Título</FieldLabel>
          <Input
            type="text"
            value={regForm.titulo}
            onChange={e => setRegForm(f => ({ ...f, titulo: e.target.value }))}
            disabled={isLoading}
            placeholder="Título completo del libro"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Autor</FieldLabel>
            <Input
              type="text"
              value={regForm.autor}
              onChange={e => {
                setRegForm(f => ({ ...f, autor: e.target.value }));
                if (fieldErrors.autor) setFieldErrors(fe => ({ ...fe, autor: null }));
              }}
              disabled={isLoading}
              placeholder="Nombre del autor"
              className={fieldErrors.autor ? 'border-red-500' : ''}
            />
            {fieldErrors.autor && (
              <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {fieldErrors.autor}
              </p>
            )}
          </div>
          <div>
            <FieldLabel>Editorial</FieldLabel>
            <Input
              type="text"
              value={regForm.editorial}
              onChange={e => setRegForm(f => ({ ...f, editorial: e.target.value }))}
              disabled={isLoading}
              placeholder="Nombre de la editorial"
            />
          </div>
        </div>

        <div>
          <FieldLabel required>Categoría</FieldLabel>
          <Select
            value={regForm.categoriaId}
            onChange={e => {
              setRegForm(f => ({ ...f, categoriaId: e.target.value }));
              if (fieldErrors.categoriaId) setFieldErrors(fe => ({ ...fe, categoriaId: null }));
            }}
            disabled={isLoading || loadingMaestros}
            className={fieldErrors.categoriaId ? 'border-red-500' : ''}
          >
            <option value="" disabled>Selecciona una categoría</option>
            {ramasDerecho.length > 0 && (
              <optgroup label="Ramas del Derecho" className="font-bold text-gray-700">
                {ramasDerecho.map(c => (
                  <option key={c.id} value={c.id} className="text-[#252525] font-normal">
                    {c.nombre}
                  </option>
                ))}
              </optgroup>
            )}
            {otrasCategorias.length > 0 && (
              <optgroup label="Otras categorías" className="font-bold text-gray-700">
                {otrasCategorias.map(c => (
                  <option key={c.id} value={c.id} className="text-[#252525] font-normal">
                    {c.nombre}
                  </option>
                ))}
              </optgroup>
            )}
          </Select>
          {fieldErrors.categoriaId && (
            <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3 h-3 shrink-0" />
              {fieldErrors.categoriaId}
            </p>
          )}
        </div>

        <div>
          <FieldLabel required>Reseña</FieldLabel>
          <textarea
            value={regForm.resena}
            onChange={e => setRegForm(f => ({ ...f, resena: e.target.value }))}
            disabled={isLoading}
            rows={4}
            placeholder="Descripción o sinopsis del libro..."
            className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-all placeholder:text-gray-400 disabled:opacity-50 resize-none"
          />
        </div>

        <div>
          <FieldLabel>URL de portada</FieldLabel>
          <Input
            type="url"
            value={regForm.imagenUrl}
            onChange={e => { setRegForm(f => ({ ...f, imagenUrl: e.target.value })); setImgError(false); }}
            disabled={isLoading}
            placeholder="https://..."
          />
          {regForm.imagenUrl && !imgError && (
            <div className="mt-2">
              <img
                src={regForm.imagenUrl}
                alt="Vista previa"
                className="h-24 rounded-lg border border-gray-200 object-cover shadow-2xs"
                onError={() => setImgError(true)}
              />
            </div>
          )}
        </div>

        <div>
          <FieldLabel>Precio</FieldLabel>
          {esAdmin ? (
            <Input
              type="number"
              min={0}
              step={0.01}
              value={regForm.precio}
              onChange={e => setRegForm(f => ({ ...f, precio: e.target.value }))}
              disabled={isLoading}
              placeholder="0.00"
            />
          ) : (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#f3f3f3] border border-gray-200 rounded-xl text-xs text-gray-500 font-medium">
              <ShieldCheck className="w-4 h-4 text-gray-400 shrink-0" />
              El administrador asignará el precio
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <FieldLabel required>Cantidad inicial</FieldLabel>
            <Input
              type="number"
              min={1}
              step={1}
              value={regForm.cantidad}
              onChange={e => setRegForm(f => ({ ...f, cantidad: e.target.value }))}
              disabled={isLoading}
              placeholder="1"
            />
          </div>
          <div>
            <FieldLabel>Stock mínimo</FieldLabel>
            <Input
              type="number"
              min={0}
              step={1}
              value={regForm.stockMinimo}
              onChange={e => setRegForm(f => ({ ...f, stockMinimo: e.target.value }))}
              disabled={isLoading}
              placeholder="5"
            />
          </div>
          <div>
            <FieldLabel required>Bodega</FieldLabel>
            {loadingMaestros ? (
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
            ) : (
              <Select
                value={regForm.bodegaId}
                onChange={e => setRegForm(f => ({ ...f, bodegaId: e.target.value }))}
                disabled={isLoading}
              >
                <option value="">— Bodega —</option>
                {bodegas.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}{b.sucursal_nombre ? ` (${b.sucursal_nombre})` : ''}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={botonGuardarDeshabilitado}
          className="w-full flex items-center justify-center gap-2 bg-[#e19922] hover:bg-[#b07c19] text-[#252525] hover:text-white disabled:opacity-50 text-sm font-bold px-5 py-3 rounded-xl shadow-xs transition-all hover:-translate-y-0.5 cursor-pointer disabled:cursor-not-allowed"
        >
          <BookOpen className="w-4 h-4" />
          {isLoading ? 'Guardando...' : 'Registrar Libro'}
        </button>
      </form>
    </div>
  );
}
