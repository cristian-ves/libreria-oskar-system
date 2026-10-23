import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import AlertaError from './AlertaError';
import BotonPrincipal from './BotonPrincipal';

const CLASE_INPUT =
  'w-full pl-10 pr-3.5 py-2.5 bg-[#f3f3f3] border border-gray-200 rounded-xl text-sm text-[#252525] placeholder-gray-400 focus:outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-colors';

export default function FormularioCredenciales({ enviando, error, aviso, onEnviar }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!enviando) onEnviar(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p role="status" className={aviso ? 'p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800' : 'sr-only'}>
        {aviso}
      </p>
      <AlertaError error={error} />

      <div>
        <label htmlFor="login-email" className="block text-xs font-bold text-[#252525] mb-1.5">
          Correo Electrónico
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Mail className="w-4 h-4" />
          </div>
          <input
            id="login-email"
            type="email"
            required
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="empleado@libreriaoskar.com"
            className={CLASE_INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="login-password" className="block text-xs font-bold text-[#252525] mb-1.5">
          Contraseña
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Lock className="w-4 h-4" />
          </div>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={CLASE_INPUT}
          />
        </div>
      </div>

      <BotonPrincipal type="submit" cargando={enviando} textoCargando="Iniciando sesión..." className="mt-2">
        <span>Ingresar al Sistema</span>
      </BotonPrincipal>
    </form>
  );
}
