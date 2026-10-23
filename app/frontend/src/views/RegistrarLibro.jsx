import { Barcode, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { esAdministrador } from '../utils/roles';
import useRegistrarLibro from '../features/registrar-libro/hooks/useRegistrarLibro';
import PanelLateral from '../features/registrar-libro/components/PanelLateral';
import PanelConsulta from '../features/registrar-libro/components/PanelConsulta';
import FichaLibroExistente from '../features/registrar-libro/components/FichaLibroExistente';
import FormularioIngreso from '../features/registrar-libro/components/FormularioIngreso';
import ResultadoIngreso from '../features/registrar-libro/components/ResultadoIngreso';
import FormularioRegistro from '../features/registrar-libro/components/FormularioRegistro';
import ResultadoRegistro from '../features/registrar-libro/components/ResultadoRegistro';
import { rotuloSugerencia } from '../features/registrar-libro/camposFaltantes';

export default function RegistrarLibro({ onShowToast }) {
  const { user } = useAuth();
  const esAdmin = esAdministrador(user);

  const {
    bodegas, categorias, loadingMaestros,
    isCameraOpen, setIsCameraOpen, isbnInput, setIsbnInput,
    paso, isLoading, errorBox,
    libroExistente, inventarios, sugerencia,
    ingresoForm, setIngresoForm, ingresoResultado,
    regForm, setRegForm, camposFaltantes, fieldErrors, setFieldErrors, imgError, setImgError, regResultado,
    historial,
    handleConsultar, handleScanSuccess, handleAgregarManual, reiniciar, handleIngreso, handleRegistrar, handlePrecioActualizado,
  } = useRegistrarLibro({ esAdmin, onShowToast });

  const panelLateral = (
    <PanelLateral
      user={user}
      isCameraOpen={isCameraOpen}
      setIsCameraOpen={setIsCameraOpen}
      onScanSuccess={handleScanSuccess}
      isLoading={isLoading}
      historial={historial}
    />
  );

  // ─── PASO: CONSULTA ───────────────────────────────────────────────────────────
  if (paso === 'consulta') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <LoadingSpinner message="Consultando ISBN..." />}

        {/* Encabezado */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
            <Barcode className="w-4 h-4 text-[#e19922]" />
            <span>Módulo de Recepción e Inventario</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">
            Registrar Libro en Bodega
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Ingresa o escanea el ISBN para consultar si el libro existe en el sistema. Si no existe, podrás registrarlo manualmente.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {panelLateral}

          <PanelConsulta
            errorBox={errorBox}
            isbnInput={isbnInput}
            setIsbnInput={setIsbnInput}
            isLoading={isLoading}
            onConsultar={handleConsultar}
            onAgregarManual={handleAgregarManual}
          />
        </div>
      </div>
    );
  }

  // ─── PASO: LIBRO EXISTE ───────────────────────────────────────────────────────
  if (paso === 'existe') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <LoadingSpinner message="Registrando ingreso..." />}

        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
              <CheckCircle className="w-4 h-4 text-[#e19922]" />
              <span>Libro encontrado en catálogo</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#252525] tracking-tight">Ingresar Unidades</h1>
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#252525] bg-white border border-gray-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Registrar otro
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {panelLateral}

          <div className="lg:col-span-8 space-y-5">
            <FichaLibroExistente
              libroExistente={libroExistente}
              inventarios={inventarios}
              esAdmin={esAdmin}
              onPrecioActualizado={handlePrecioActualizado}
            />

            {/* Formulario ingreso */}
            {!ingresoResultado ? (
              <FormularioIngreso
                errorBox={errorBox}
                ingresoForm={ingresoForm}
                setIngresoForm={setIngresoForm}
                bodegas={bodegas}
                loadingMaestros={loadingMaestros}
                isLoading={isLoading}
                onSubmit={handleIngreso}
              />
            ) : (
              <ResultadoIngreso ingresoResultado={ingresoResultado} bodegas={bodegas} onReiniciar={reiniciar} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── PASO: LIBRO NO EXISTE ────────────────────────────────────────────────────
  if (paso === 'noExiste') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading && <LoadingSpinner message="Registrando libro..." />}

        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
              <AlertCircle className="w-4 h-4 text-[#e19922]" />
              <span>{sugerencia ? rotuloSugerencia(sugerencia.fuente) : 'Libro no encontrado'}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#252525] tracking-tight">Registrar Libro Nuevo</h1>
          </div>
          <button
            type="button"
            onClick={reiniciar}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#252525] bg-white border border-gray-200 px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Volver
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {panelLateral}

          <div className="lg:col-span-8 space-y-5">
            {!sugerencia && camposFaltantes.length > 0 && (
              <div role="status" aria-live="polite" className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#b07c19]" />
                <span>No se encontró información de este ISBN. Completa los datos del libro.</span>
              </div>
            )}

            {regResultado ? (
              <ResultadoRegistro regResultado={regResultado} onReiniciar={reiniciar} />
            ) : (
              <FormularioRegistro
                regForm={regForm}
                setRegForm={setRegForm}
                camposFaltantes={camposFaltantes}
                fieldErrors={fieldErrors}
                setFieldErrors={setFieldErrors}
                imgError={imgError}
                setImgError={setImgError}
                errorBox={errorBox}
                isLoading={isLoading}
                loadingMaestros={loadingMaestros}
                bodegas={bodegas}
                categorias={categorias}
                esAdmin={esAdmin}
                onSubmit={handleRegistrar}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
