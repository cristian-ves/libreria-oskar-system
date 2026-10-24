import { Download, FileSpreadsheet, FileText } from 'lucide-react';

export default function AccionesExportacion({ onExportar, formatoExportando, disabled }) {
  return <div className="flex flex-col sm:flex-row gap-2">
    <button type="button" onClick={() => onExportar('xlsx')} disabled={disabled || Boolean(formatoExportando)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Descargar reporte Excel">
      {formatoExportando === 'xlsx' ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-700 border-t-transparent" /> : <FileSpreadsheet aria-hidden="true" className="w-4 h-4" />}
      <span>{formatoExportando === 'xlsx' ? 'Preparando Excel…' : 'Descargar Excel'}</span><Download aria-hidden="true" className="w-3.5 h-3.5" />
    </button>
    <button type="button" onClick={() => onExportar('pdf')} disabled={disabled || Boolean(formatoExportando)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-800 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Descargar reporte PDF">
      {formatoExportando === 'pdf' ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-red-700 border-t-transparent" /> : <FileText aria-hidden="true" className="w-4 h-4" />}
      <span>{formatoExportando === 'pdf' ? 'Preparando PDF…' : 'Descargar PDF'}</span>
    </button>
  </div>;
}
