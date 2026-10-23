import ErrorBox from '../../../components/ui/ErrorBox';

// ErrorBox dentro de una región role="alert" que existe siempre, para que se anuncie al aparecer.
// Con onReintentar muestra "Intentar de nuevo" y refFoco va al botón; sin él, refFoco va a la región.
export default function AlertaError({ error, onReintentar, refFoco }) {
  const conReintento = Boolean(error && onReintentar);
  return (
    <div className="space-y-2">
      <div
        role="alert"
        ref={conReintento ? undefined : refFoco}
        tabIndex={refFoco && !conReintento ? -1 : undefined}
        className="outline-none"
      >
        <ErrorBox error={error} />
      </div>
      {conReintento && (
        <button
          type="button"
          ref={refFoco}
          onClick={onReintentar}
          className="px-3 py-1.5 text-xs font-semibold text-[#252525] bg-white border border-gray-200 rounded-xl hover:border-[#b07c19] hover:text-[#b07c19] transition-colors cursor-pointer"
        >
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
