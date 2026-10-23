import { useState, useEffect, useCallback } from 'react';
import { getBodegas } from '../../../services/api/bodegas.api';
import { getCategorias } from '../../../services/api/categorias.api';
import { consultarLibro, ingresarLibro, registrarLibro } from '../../../services/api/libros.api';
import { formatPrecio } from '../../../utils/formatters';
import { orNull, toNum } from '../../../utils/parsers';
import { validarRegistro } from '../validacion';
import { aplicarPrellenado, prellenarDesdeSugerencia, REINICIO_CONSULTA } from '../camposFaltantes';

export default function useRegistrarLibro({ esAdmin, onShowToast }) {
  const [bodegas, setBodegas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loadingMaestros, setLoadingMaestros] = useState(true);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isbnInput, setIsbnInput] = useState('');

  const [paso, setPaso] = useState('consulta');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBox, setErrorBox] = useState(null);

  const [libroExistente, setLibroExistente] = useState(null);
  const [inventarios, setInventarios] = useState([]);
  const [sugerencia, setSugerencia] = useState(null);

  const [ingresoForm, setIngresoForm] = useState({ bodegaId: '', cantidad: 1 });
  const [ingresoResultado, setIngresoResultado] = useState(null);

  const [regForm, setRegForm] = useState({
    isbn: '', titulo: '', autor: '', editorial: '',
    categoriaId: '', resena: '', imagenUrl: '',
    precio: '', cantidad: 1, stockMinimo: 5, bodegaId: '',
  });
  const [camposFaltantes, setCamposFaltantes] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [imgError, setImgError] = useState(false);
  const [regResultado, setRegResultado] = useState(null);

  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    async function cargar() {
      setLoadingMaestros(true);
      try {
        const [resBod, resCat] = await Promise.all([
          getBodegas(),
          getCategorias(),
        ]);
        if (resBod.ok) {
          const j = await resBod.json();
          const data = j.data || [];
          setBodegas(data);
          const primeraId = data[0]?.id || '';
          setIngresoForm(f => ({ ...f, bodegaId: primeraId }));
          setRegForm(f => ({ ...f, bodegaId: primeraId }));
        }
        if (resCat.ok) {
          const j = await resCat.json();
          setCategorias(j.data || []);
        }
      } catch (err) {
        console.warn('[MAESTROS]:', err.message);
      } finally {
        setLoadingMaestros(false);
      }
    }
    cargar();
  }, []);

  const handleConsultar = useCallback(async (isbnValue) => {
    const isbn = (isbnValue || isbnInput).trim();
    if (!isbn) {
      setErrorBox({ message: 'Ingresa un ISBN antes de consultar.' });
      return;
    }
    setErrorBox(null);
    setIsLoading(true);
    setIngresoResultado(null);
    setRegResultado(null);

    try {
      const res = await consultarLibro({ isbn });
      const json = await res.json();

      if (!res.ok) {
        setErrorBox({ message: json.message || 'Error al consultar el ISBN.', details: json.details });
        return;
      }

      const { existe, libro, inventarios: invs, sugerencia: sug } = json.data;

      if (existe) {
        setLibroExistente(libro);
        setInventarios(invs || []);
        setPaso('existe');
      } else {
        setSugerencia(sug);
        const { valores, camposFaltantes: faltantes } = prellenarDesdeSugerencia(sug, isbn);
        setRegForm(f => aplicarPrellenado(f, valores));
        setCamposFaltantes(faltantes);
        setFieldErrors({});
        setImgError(false);
        setPaso('noExiste');
      }
    } catch (err) {
      setErrorBox({ message: err.message || 'Error de red al consultar.' });
    } finally {
      setIsLoading(false);
    }
  }, [isbnInput]);

  const handleScanSuccess = useCallback(async (scannedIsbn) => {
    if (!scannedIsbn || isLoading) return;
    setIsbnInput(scannedIsbn);
    setIsCameraOpen(false);
    await handleConsultar(scannedIsbn);
  }, [isLoading, handleConsultar]);

  const handleAgregarManual = () => {
    setErrorBox(null);
    setFieldErrors({});
    setSugerencia(null);
    setCamposFaltantes([]);
    setRegForm(f => ({
      ...f,
      isbn: isbnInput.trim(),
      titulo: '', autor: '', editorial: '',
      resena: '', imagenUrl: '',
      precio: '', ...REINICIO_CONSULTA,
    }));
    setImgError(false);
    setPaso('noExiste');
  };

  const reiniciar = () => {
    setPaso('consulta');
    setIsbnInput('');
    setLibroExistente(null);
    setInventarios([]);
    setSugerencia(null);
    setCamposFaltantes([]);
    setIngresoResultado(null);
    setRegResultado(null);
    setErrorBox(null);
    setFieldErrors({});
  };

  const handleIngreso = async (e) => {
    e.preventDefault();
    setErrorBox(null);
    if (!ingresoForm.bodegaId) {
      setErrorBox({ message: 'Selecciona una bodega.' }); return;
    }
    if (!ingresoForm.cantidad || ingresoForm.cantidad < 1) {
      setErrorBox({ message: 'La cantidad debe ser un entero ≥ 1.' }); return;
    }
    setIsLoading(true);
    try {
      const res = await ingresarLibro(libroExistente.id, {
        bodegaId: ingresoForm.bodegaId,
        cantidad: Number(ingresoForm.cantidad),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorBox({ message: json.message || 'Error al registrar ingreso.', details: json.details });
        return;
      }
      const resultado = json.data;
      setIngresoResultado(resultado);
      setHistorial(h => [{ tipo: 'ingreso', ...resultado }, ...h]);
      onShowToast({
        type: 'success',
        title: '¡Ingreso Registrado!',
        bookTitle: resultado.libro.titulo,
        message: `Stock actualizado: ${resultado.inventario.stock_actual} uds. en bodega.`,
      });
    } catch (err) {
      setErrorBox({ message: err.message || 'Error de red.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrecioActualizado = (libroActualizado) => {
    setLibroExistente(l => ({ ...l, precio: libroActualizado.precio }));
    onShowToast({
      type: 'success',
      title: 'Precio actualizado',
      bookTitle: libroExistente.titulo,
      message: formatPrecio(libroActualizado.precio),
    });
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setErrorBox(null);
    setFieldErrors({});

    const { errorMessage, fieldErrors: nuevosFieldErrors } = validarRegistro(regForm);
    if (errorMessage) {
      setErrorBox({ message: errorMessage });
      return;
    }
    if (nuevosFieldErrors) {
      setFieldErrors(nuevosFieldErrors);
      return;
    }

    setIsLoading(true);
    try {
      const body = {
        isbn: orNull(regForm.isbn),
        titulo: regForm.titulo.trim(),
        autor: regForm.autor.trim(),
        editorial: orNull(regForm.editorial),
        categoriaId: regForm.categoriaId,
        resena: regForm.resena.trim(),
        imagenUrl: orNull(regForm.imagenUrl),
        cantidad: Number(regForm.cantidad),
        stockMinimo: toNum(regForm.stockMinimo, 5),
        bodegaId: regForm.bodegaId,
      };
      if (esAdmin) {
        body.precio = toNum(regForm.precio, 0);
      }

      const res = await registrarLibro(body);
      const json = await res.json();

      if (!res.ok) {
        const details = Array.isArray(json.details) ? json.details : (json.details ? [json.details] : undefined);
        setErrorBox({ message: json.message || 'Error al registrar el libro.', details });
        return;
      }
      const resultado = json.data;
      setRegResultado(resultado);
      setHistorial(h => [{ tipo: 'registro', ...resultado }, ...h]);
      onShowToast({
        type: 'success',
        title: '¡Libro Registrado!',
        bookTitle: resultado.libro.titulo,
        message: resultado.precio_pendiente
          ? 'El libro fue registrado. El precio está pendiente de asignación.'
          : `Stock inicial: ${resultado.inventario.stock_actual} uds.`,
      });
    } catch (err) {
      setErrorBox({ message: err.message || 'Error de red.' });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    bodegas, categorias, loadingMaestros,
    isCameraOpen, setIsCameraOpen, isbnInput, setIsbnInput,
    paso, isLoading, errorBox,
    libroExistente, inventarios, sugerencia,
    ingresoForm, setIngresoForm, ingresoResultado,
    regForm, setRegForm, camposFaltantes, fieldErrors, setFieldErrors, imgError, setImgError, regResultado,
    historial,
    handleConsultar, handleScanSuccess, handleAgregarManual, reiniciar, handleIngreso, handleRegistrar,
    handlePrecioActualizado,
  };
}
