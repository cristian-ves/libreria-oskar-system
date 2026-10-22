import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useLibroDetalle from '../features/catalogo/hooks/useLibroDetalle';
import DetalleSkeleton from '../features/catalogo/components/DetalleSkeleton';
import LibroNoEncontrado from '../features/catalogo/components/LibroNoEncontrado';
import LibroError from '../features/catalogo/components/LibroError';
import FichaLibro from '../features/catalogo/components/FichaLibro';

export default function LibroDetalle() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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

  return <FichaLibro libro={libro} onVolver={handleVolver} />;
}
