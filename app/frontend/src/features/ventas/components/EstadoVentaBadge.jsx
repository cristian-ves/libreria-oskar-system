function EstadoVentaBadge({ estado }) {
  const cls = estado === 'Anulada' ? 'bg-red-600 text-white' : 'bg-green-600 text-white';
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-2xs ${cls}`}>
      {estado}
    </span>
  );
}

export default EstadoVentaBadge;
