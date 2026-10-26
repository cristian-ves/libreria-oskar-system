function EstadoBadge({ bajo_stock, obsoleto }) {
  if (bajo_stock) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-500 text-[#252525]">
        Bajo stock
      </span>
    );
  }
  if (obsoleto) {
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-red-600 text-white">
        Sin salidas
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-[#e8c85e] text-[#252525]">
      Normal
    </span>
  );
}

export default EstadoBadge;
