import Input from '../../../components/ui/Input';
import { limpiarCodigoTotp } from '../codigos';

export default function CampoCodigoTotp({ id, value, onChange, disabled, autoFocus, label = 'Código de 6 dígitos' }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-[#252525] mb-1.5">
        {label}
      </label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="123456"
        value={value}
        onChange={(e) => onChange(limpiarCodigoTotp(e.target.value))}
        disabled={disabled}
        autoFocus={autoFocus}
        className="text-center font-mono text-lg tracking-[0.4em]"
      />
    </div>
  );
}
