// La librería dimensiona el <video> con el ancho de #reader-container y recorta el
// análisis al tamaño EN PANTALLA del recuadro (canvas = qrbox). Por eso el contenedor
// se maqueta con un ancho lógico fijo y se reduce con transform: scale(), de modo que
// el recorte analizado sea grande aunque el visor se vea pequeño.
export const LAYOUT_WIDTH = 800;
export const DEFAULT_VIDEO_RATIO = 9 / 16;
// Alto visible máximo (1:1, ancho = alto). Un video vertical más alto se recorta por arriba y abajo,
// y el recuadro se calcula para caber dentro de esa parte visible.
export const MAX_VISIBLE_RATIO = 1;
export const FRAME_BORDER_PX = 4;

// Zona de escaneo ancha y baja para códigos 1D. Recibe el tamaño del VIDEO, no del marco.
export const calcularQrbox = (viewfinderWidth, viewfinderHeight) => {
  const visibleHeight = Math.min(viewfinderHeight, Math.floor(viewfinderWidth * MAX_VISIBLE_RATIO));
  return {
    width: Math.min(viewfinderWidth, Math.max(50, Math.floor(viewfinderWidth * 0.9))),
    height: Math.min(visibleHeight, Math.max(50, Math.floor(Math.min(visibleHeight * 0.45, viewfinderWidth * 0.3)))),
  };
};

export const GEOMETRIA_INICIAL = { scale: 0.5, videoHeight: Math.round(LAYOUT_WIDTH * DEFAULT_VIDEO_RATIO) };

export const calcularEstilosVisor = (geometry) => {
  const visibleHeight = Math.min(geometry.videoHeight, Math.floor(LAYOUT_WIDTH * MAX_VISIBLE_RATIO));
  return {
    frameStyle: { height: Math.round(visibleHeight * geometry.scale) + FRAME_BORDER_PX },
    stageStyle: {
      width: LAYOUT_WIDTH,
      transformOrigin: 'top left',
      transform: `translateY(${-((geometry.videoHeight - visibleHeight) / 2) * geometry.scale}px) scale(${geometry.scale})`,
    },
  };
};
