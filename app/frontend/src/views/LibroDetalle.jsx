import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useLibroDetalle from '../features/catalogo/hooks/useLibroDetalle';
import DetalleSkeleton from '../features/catalogo/components/DetalleSkeleton';
import LibroNoEncontrado from '../features/catalogo/components/LibroNoEncontrado';
import LibroError from '../features/catalogo/components/LibroError';
import FichaLibro from '../features/catalogo/components/FichaLibro';
import ModalPrecioLibro from '../components/ModalPrecioLibro';
import { useAuth } from '../context/AuthContext';
import { esAdministrador } from '../utils/roles';

export default function LibroDetalle() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useAuth();
  const [precioAbierto, setPrecioAbierto] = useState(false);

  const { libro, loading, isNotFound, error, reintentar } = useLibroDetalle(ref, navigate);

  const handleVolver = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/catalogo');
    }
  };

  if (loading) {
    return <DetalleSkeleton />;
  }

  if (isNotFound) {
    return <LibroNoEncontrado onVolver={handleVolver} />;
  }

  if (error) {
    return <LibroError error={error} onVolver={handleVolver} onReintentar={reintentar} />;
  }

  if (!libro) return null;

  const handlePrecioGuardado = () => {
    setPrecioAbierto(false);
    reintentar();
  };

  return (
    <>
      <FichaLibro
        libro={libro}
        onVolver={handleVolver}
        esAdmin={esAdministrador(user)}
        onFijarPrecio={() => setPrecioAbierto(true)}
      />
      {precioAbierto && (
        <ModalPrecioLibro
          libro={libro}
          onClose={() => setPrecioAbierto(false)}
          onSuccess={handlePrecioGuardado}
        />
      )}
    </>
  );
}
