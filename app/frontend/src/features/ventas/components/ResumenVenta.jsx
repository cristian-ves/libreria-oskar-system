import Input from '../../../components/ui/Input';
import FieldLabel from '../../../components/ui/FieldLabel';
import { formatQuetzales } from '../../../utils/dinero';

export default function ResumenVenta({ subtotal, total, descuento, setDescuento, errorDescuento }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 font-medium">Subtotal</span>
        <span className="font-mono font-bold text-[#252525]">{formatQuetzales(subtotal)}</span>
      </div>
      <div>
        <FieldLabel>Descuento (Q)</FieldLabel>
        <Input
          type="text"
          inputMode="decimal"
          value={descuento}
          onChange={(e) => setDescuento(e.target.value)}
          placeholder="0.00"
        />
        {errorDescuento && <p className="mt-1 text-[11px] text-red-600 font-semibold">{errorDescuento}</p>}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-sm font-bold text-[#252525]">Total</span>
        <span className="font-mono font-extrabold text-lg text-[#252525]">{formatQuetzales(total)}</span>
      </div>
    </div>
  );
}
