import { AlertCircle } from 'lucide-react';

export default function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
      <div className="min-w-0">
        <p className="font-bold">{error.message}</p>
        {Array.isArray(error.details) && error.details.length > 0 && (
          <ul className="mt-1 list-disc list-inside space-y-0.5 text-red-600">
            {error.details.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
