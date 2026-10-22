import Input from '../../../components/ui/Input';
import OpcionesSegmentadas from '../../../components/ui/OpcionesSegmentadas';
import FieldLabel from '../../../components/ui/FieldLabel';

export default function FormularioCliente({
  metodoPago, setMetodoPago,
  clienteNombre, setClienteNombre,
  clienteNit, setClienteNit,
  notas, setNotas,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
      <div>
        <FieldLabel required>Método de pago</FieldLabel>
        <OpcionesSegmentadas
          ariaLabel="Método de pago"
          opciones={[
            { valor: 'Efectivo', etiqueta: 'Efectivo' },
            { valor: 'Transferencia', etiqueta: 'Transferencia' },
          ]}
          valor={metodoPago}
          onChange={setMetodoPago}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Cliente</FieldLabel>
          <Input
            type="text"
            value={clienteNombre}
            onChange={(e) => setClienteNombre(e.target.value)}
            maxLength={150}
            placeholder="Consumidor final"
          />
        </div>
        <div>
          <FieldLabel>NIT</FieldLabel>
          <Input type="text" value={clienteNit} onChange={(e) => setClienteNit(e.target.value)} maxLength={20} />
        </div>
      </div>
      <div>
        <FieldLabel>Notas</FieldLabel>
        <Input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={1000} />
      </div>
    </div>
  );
}
