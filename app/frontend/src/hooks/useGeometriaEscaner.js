import { useEffect, useRef, useState } from 'react';
import {
  LAYOUT_WIDTH,
  DEFAULT_VIDEO_RATIO,
  GEOMETRIA_INICIAL,
  calcularEstilosVisor,
} from '../utils/geometriaEscaner';

// Alto del marco = alto del video (con tope) y escala = ancho del marco / ancho lógico.
export function useGeometriaEscaner() {
  const [geometry, setGeometry] = useState(GEOMETRIA_INICIAL);
  const frameRef = useRef(null);
  const readerRef = useRef(null);

  useEffect(() => {
    const frame = frameRef.current;
    const reader = readerRef.current;
    if (!frame || !reader || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => {
      const frameWidth = frame.clientWidth;
      if (!frameWidth) return;
      const scale = frameWidth / LAYOUT_WIDTH;
      const videoHeight = reader.offsetHeight || Math.round(LAYOUT_WIDTH * DEFAULT_VIDEO_RATIO);
      setGeometry((prev) => (
        prev.scale === scale && prev.videoHeight === videoHeight ? prev : { scale, videoHeight }
      ));
    };
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    observer.observe(reader);
    update();
    return () => observer.disconnect();
  }, []);

  return { frameRef, readerRef, ...calcularEstilosVisor(geometry) };
}
