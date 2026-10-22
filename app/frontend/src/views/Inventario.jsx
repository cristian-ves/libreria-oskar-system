import { useState } from 'react';
import { Warehouse, Layers, Clock } from 'lucide-react';
import Toast from '../components/Toast';
import useInventarioData from '../features/inventario/hooks/useInventarioData';
import useKardex from '../features/inventario/hooks/useKardex';
import ResumenKpis from '../features/inventario/components/ResumenKpis';
import TablaExistencias from '../features/inventario/components/TablaExistencias';
import TablaKardex from '../features/inventario/components/TablaKardex';
import ModalSalidaInventario from '../features/inventario/components/ModalSalidaInventario';
import ModalAjusteInventario from '../features/inventario/components/ModalAjusteInventario';

export default function Inventario() {
  const [activeTab, setActiveTab] = useState('existencias');
  const [toast, setToast] = useState(null);

  const {
    bodegas,
    resumen,
    loadingResumen,
    existencias,
    loadingExistencias,
    estadoFilter,
    setEstadoFilter,
    searchInput,
    setSearchInput,
    selectedBodega,
    setSelectedBodega,
    cargarResumen,
    cargarExistencias,
  } = useInventarioData(activeTab);

  const {
    movimientos,
    totalMovimientos,
    loadingKardex,
    kardexTipo,
    setKardexTipo,
    kardexBodega,
    setKardexBodega,
    kardexLibroId,
    kardexLibroTitulo,
    kardexOffset,
    setKardexOffset,
    filtrarPorLibro,
    limpiarFiltroLibroKardex,
  } = useKardex(activeTab);

  // ── Modales ───────────────────────────────────────────────────────────────
  const [modalSalidaOpen, setModalSalidaOpen] = useState(false);
  const [modalAjusteOpen, setModalAjusteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const abrirModalSalida = (item) => {
    setSelectedItem(item);
    setModalSalidaOpen(true);
  };

  const abrirModalAjuste = (item) => {
    setSelectedItem(item);
    setModalAjusteOpen(true);
  };

  const handleModalSuccess = (toastData) => {
    setModalSalidaOpen(false);
    setModalAjusteOpen(false);
    setToast(toastData);

    cargarExistencias();
    cargarResumen();
  };

  const handleVerKardex = (item) => {
    filtrarPorLibro(item.libro_id, item.titulo);
    setActiveTab('kardex');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Encabezado principal */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-[#b07c19] text-xs font-bold uppercase tracking-wider mb-1">
          <Warehouse className="w-4 h-4 text-[#e19922]" />
          <span>Control de Existencias y Auditoría</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#252525] tracking-tight">
          Inventario y Kardex
        </h1>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Supervisión en tiempo real de existencias por bodega, control de mermas, alertas de desabastecimiento y trazabilidad completa de movimientos.
        </p>
      </div>

      {/* ── 1. Panel Superior de Alertas y Métricas (Cards blancas con elevación suave) ── */}
      <ResumenKpis
        resumen={resumen}
        loadingResumen={loadingResumen}
        setActiveTab={setActiveTab}
        setEstadoFilter={setEstadoFilter}
      />

      {/* ── 2. Pestañas de Navegación ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('existencias')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'existencias'
              ? 'border-[#e19922] text-[#252525] bg-white shadow-2xs'
              : 'border-transparent text-gray-500 hover:text-[#252525]'
          }`}
        >
          <Layers className="w-4 h-4 text-[#b07c19]" />
          <span>Existencias</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('kardex')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'kardex'
              ? 'border-[#e19922] text-[#252525] bg-white shadow-2xs'
              : 'border-transparent text-gray-500 hover:text-[#252525]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#b07c19]" />
          <span>Kardex de Movimientos</span>
        </button>
      </div>

      {/* ── 3. Contenido: Existencias ─────────────────────────────────────────── */}
      {activeTab === 'existencias' && (
        <TablaExistencias
          bodegas={bodegas}
          existencias={existencias}
          loadingExistencias={loadingExistencias}
          estadoFilter={estadoFilter}
          setEstadoFilter={setEstadoFilter}
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          selectedBodega={selectedBodega}
          setSelectedBodega={setSelectedBodega}
          abrirModalSalida={abrirModalSalida}
          abrirModalAjuste={abrirModalAjuste}
          handleVerKardex={handleVerKardex}
        />
      )}

      {/* ── 4. Contenido: Kardex ─────────────────────────────────────────────── */}
      {activeTab === 'kardex' && (
        <TablaKardex
          bodegas={bodegas}
          movimientos={movimientos}
          totalMovimientos={totalMovimientos}
          loadingKardex={loadingKardex}
          kardexTipo={kardexTipo}
          setKardexTipo={setKardexTipo}
          kardexBodega={kardexBodega}
          setKardexBodega={setKardexBodega}
          kardexLibroId={kardexLibroId}
          kardexLibroTitulo={kardexLibroTitulo}
          kardexOffset={kardexOffset}
          setKardexOffset={setKardexOffset}
          limpiarFiltroLibroKardex={limpiarFiltroLibroKardex}
        />
      )}

      {/* ── Modal de Salida ──────────────────────────────────────────────────── */}
      {modalSalidaOpen && selectedItem && (
        <ModalSalidaInventario
          selectedItem={selectedItem}
          onClose={() => setModalSalidaOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* ── Modal de Ajuste ──────────────────────────────────────────────────── */}
      {modalAjusteOpen && selectedItem && (
        <ModalAjusteInventario
          selectedItem={selectedItem}
          onClose={() => setModalAjusteOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
