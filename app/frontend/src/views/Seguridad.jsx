import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useSeguridad from '../features/seguridad/hooks/useSeguridad';
import PanelSeguridad from '../features/seguridad/components/PanelSeguridad';

export default function Seguridad() {
  const { user } = useAuth();
  const seguridad = useSeguridad();

  return (
    <div className="flex-1 px-4 py-8">
      <div className="w-full max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-lg font-extrabold text-[#252525] flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#e19922]" />
          Mi cuenta y seguridad
        </h1>
        <p className="text-xs text-gray-500 mt-1 mb-5 break-all">
          {user?.nombre_completo} · {user?.email}
        </p>
        <PanelSeguridad email={user?.email} seguridad={seguridad} />
      </div>
    </div>
  );
}
