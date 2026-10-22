import { useState } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { esAdministrador } from '../utils/roles';
import useVentaDetalle from '../features/ventas/hooks/useVentaDetalle';
import FichaVenta from '../features/ventas/components/FichaVenta';
import ModalAnularVenta from '../features/ventas/components/ModalAnularVenta';
import ErrorBox from '../components/ui/ErrorBox';

const BTN = 'px-4 py-2 rounded-xl text-xs font-bold bg-[#e19922] text-[#252525] hover:bg-[#b07c19] hover:text-white transition-all cursor-pointer';

export default function VentaDetalle() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { venta, loading, noEncontrada, error, recargar } = useVentaDetalle(id);
  const [modalAbierto, setModalAbierto] = useState(false);

  const recienCreada = Boolean(location.state?.recienCreada);
  const limpiarBanner = () => navigate(location.pathname, { replace: true, state: null });

  const alAnular = () => {
    setModalAbierto(false);
    recargar();
  };

  let contenido;
  if (loading && !venta) {
    contenido = <p className="text-xs text-gray-500 font-medium">Cargando venta...</p>;
  } else if (noEncontrada) {
    contenido = (
      <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm space-y-3">
        <h2 className="text-base font-bold text-[#252525]">Venta no encontrada</h2>
        <Link to="/ventas" className="inline-block text-xs font-semibold text-[#b07c19] hover:underline">
          Volver al listado de ventas
        </Link>
      </div>
    );
  } else if (error) {
    contenido = (
      <div className="space-y-3">
        <ErrorBox error={error} />
        <button type="button" onClick={recargar} className={BTN}>Reintentar</button>
      </div>
    );
  } else if (venta) {
    contenido = <FichaVenta venta={venta} />;
  }

  return (
    <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-5">
        <Link to="/ventas" className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#252525]">
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a ventas</span>
        </Link>
        {venta && esAdministrador(user) && venta.estado === 'Completada' && (
          <button
            type="button"
            onClick={() => setModalAbierto(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer shadow-xs"
          >
            <Ban className="w-4 h-4" />
            <span>Anular venta</span>
          </button>
        )}
      </div>

      {recienCreada && venta && (
        <div className="mb-5 flex items-center justify-between gap-3 p-3.5 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-800">
          <span className="inline-flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Venta {venta.codigo} registrada correctamente.
          </span>
          <button type="button" onClick={limpiarBanner} className="font-bold underline cursor-pointer">Cerrar</button>
        </div>
      )}

      {contenido}

      {modalAbierto && venta && (
        <ModalAnularVenta venta={venta} onClose={() => setModalAbierto(false)} onSuccess={alAnular} />
      )}
    </div>
  );
}
