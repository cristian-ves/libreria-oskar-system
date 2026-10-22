function TipoBadge({ tipo }) {
  const t = tipo?.toLowerCase();
  const cls =
    t === 'ingreso'
      ? 'bg-[#e19922] text-[#252525]'
      : t === 'salida'
      ? 'bg-red-600 text-white'
      : 'bg-[#b07c19] text-white';
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md shadow-2xs ${cls}`}>
      {tipo}
    </span>
  );
}

export default TipoBadge;
