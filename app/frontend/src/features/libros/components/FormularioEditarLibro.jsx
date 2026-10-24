import { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import ErrorBox from '../../../components/ui/ErrorBox';
import FieldLabel from '../../../components/ui/FieldLabel';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

function isbnValido(valor) {
  const isbn = valor.replace(/[-\s]/g, '').trim();
  if (!isbn) return true;
  if (isbn.length > 20) return false;
  if (/^\d{13}$/.test(isbn)) {
    const suma = [...isbn.slice(0, 12)].reduce((total, digito, index) => total + Number(digito) * (index % 2 ? 3 : 1), 0);
    return (10 - (suma % 10)) % 10 === Number(isbn[12]);
  }
  if (/^\d{9}[\dX]$/i.test(isbn)) {
    return [...isbn].reduce((total, caracter, index) => total + (caracter.toUpperCase() === 'X' ? 10 : Number(caracter)) * (10 - index), 0) % 11 === 0;
  }
  return false;
}

export default function FormularioEditarLibro({ libro, categorias, guardando, error, onClose, onGuardar }) {
  const [titulo, setTitulo] = useState(libro.titulo || '');
  const [autor, setAutor] = useState(libro.autor_nombre || libro.autor?.nombre || libro.autor || '');
  const [editorial, setEditorial] = useState(libro.editorial_nombre || libro.editorial?.nombre || libro.editorial || '');
  const [categoriaId, setCategoriaId] = useState(libro.categoria_id || libro.categoriaId || libro.categoria?.id || '');
  const [resena, setResena] = useState(libro.resena || '');
  const [imagenUrl, setImagenUrl] = useState(libro.imagen_url || libro.imagenUrl || '');
  const [isbn, setIsbn] = useState(libro.isbn || '');
  const [errorLocal, setErrorLocal] = useState(null);
  const ramas = categorias.filter((categoria) => categoria.nombre?.toLocaleLowerCase('es').startsWith('derecho')).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const otras = categorias.filter((categoria) => !categoria.nombre?.toLocaleLowerCase('es').startsWith('derecho')).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const enviar = async (event) => {
    event.preventDefault(); setErrorLocal(null);
    if (!autor.trim() || autor.trim() === 'Autor de Biblioteca Internacional') {
      setErrorLocal({ message: 'Ingresa el nombre real del autor; el autor marcador no está permitido.' }); return;
    }
    if (!isbnValido(isbn)) { setErrorLocal({ message: 'El ISBN debe ser un ISBN-10 o ISBN-13 válido.' }); return; }
    const guardado = await onGuardar({
      titulo: titulo.trim(), autor: autor.trim(), editorial: editorial.trim() || null,
      categoriaId, resena: resena.trim(), imagenUrl: imagenUrl.trim() || null,
      isbn: isbn.trim() || null,
    });
    if (!guardado) setErrorLocal(null);
  };

  return <Modal><section role="dialog" aria-modal="true" aria-labelledby="titulo-editar-libro" className="max-h-[90vh] overflow-y-auto -m-1 p-1 space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h2 id="titulo-editar-libro" className="text-lg font-extrabold text-[#252525] flex items-center gap-2"><BookOpen aria-hidden="true" className="w-5 h-5 text-[#b07c19]" />Editar libro</h2><p className="mt-1 text-xs text-gray-500">Actualiza los datos bibliográficos. El precio y las existencias se administran por separado.</p></div><button type="button" onClick={onClose} disabled={guardando} aria-label="Cerrar formulario" className="min-h-11 min-w-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-[#252525] disabled:opacity-40"><X aria-hidden="true" className="w-5 h-5" /></button></div>
    <ErrorBox error={error || errorLocal} />
    <form onSubmit={enviar} className="space-y-3">
      <div><FieldLabel required>Título</FieldLabel><Input aria-label="Título" required maxLength={255} value={titulo} onChange={(event) => setTitulo(event.target.value)} disabled={guardando} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><FieldLabel required>Autor</FieldLabel><Input aria-label="Autor" required maxLength={150} value={autor} onChange={(event) => setAutor(event.target.value)} disabled={guardando} /></div><div><FieldLabel>Editorial</FieldLabel><Input aria-label="Editorial" maxLength={150} value={editorial} onChange={(event) => setEditorial(event.target.value)} disabled={guardando} /></div></div>
      <div><FieldLabel required>Categoría</FieldLabel><Select aria-label="Categoría" required value={categoriaId} onChange={(event) => setCategoriaId(event.target.value)} disabled={guardando}><option value="" disabled>Selecciona una categoría</option>{ramas.length > 0 && <optgroup label="Ramas del Derecho">{ramas.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}</optgroup>}{otras.length > 0 && <optgroup label="Otras categorías">{otras.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}</optgroup>}</Select></div>
      <div><FieldLabel required>Reseña</FieldLabel><textarea aria-label="Reseña" required value={resena} onChange={(event) => setResena(event.target.value)} disabled={guardando} rows={4} className="w-full bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] disabled:opacity-50 resize-y" /></div>
      <div><FieldLabel>URL de portada</FieldLabel><Input aria-label="URL de portada" type="url" value={imagenUrl} onChange={(event) => setImagenUrl(event.target.value)} disabled={guardando} placeholder="https://..." /></div>
      <div><FieldLabel>ISBN</FieldLabel><Input aria-label="ISBN" value={isbn} onChange={(event) => setIsbn(event.target.value)} disabled={guardando} maxLength={25} placeholder="ISBN-10 o ISBN-13" /><p className="mt-1 text-[11px] text-gray-500">Deja vacío para quitar el ISBN.</p></div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-gray-100"><button type="button" onClick={onClose} disabled={guardando} className="min-h-11 px-4 rounded-xl text-sm font-semibold text-gray-600 bg-[#f3f3f3] hover:bg-gray-200 border border-gray-200 disabled:opacity-50">Cancelar</button><button type="submit" disabled={guardando} className="min-h-11 px-4 rounded-xl text-sm font-bold text-[#252525] bg-[#e19922] hover:bg-[#b07c19] hover:text-white disabled:opacity-50">{guardando ? 'Guardando...' : 'Guardar cambios'}</button></div>
    </form>
  </section></Modal>;
}
