import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.jpg';
import useLoginDosPasos from '../features/seguridad/hooks/useLoginDosPasos';
import FormularioCredenciales from '../features/seguridad/components/FormularioCredenciales';
import PasoVerificar from '../features/seguridad/components/PasoVerificar';
import PasoConfigurar from '../features/seguridad/components/PasoConfigurar';
import CodigosRespaldo from '../features/seguridad/components/CodigosRespaldo';

const SUBTITULOS = {
  credenciales: 'Acceso para personal administrativo y bodegueros',
  verificar: 'Código de tu app de autenticación',
  configurar: 'Configura tu app de autenticación',
  respaldo: 'Último paso',
};

export default function Login() {
  const { user } = useAuth();
  const location = useLocation();
  const flujo = useLoginDosPasos();

  const from = location.state?.from?.pathname || '/registrar';

  // Se fija user solo al completar el flujo (en el alta, tras "Continuar")
  if (user) {
    return <Navigate to={from} replace />;
  }

  const comunes = {
    enviando: flujo.enviando,
    error: flujo.error,
    requiereReinicio: flujo.requiereReinicio,
    estadoCodigo: flujo.estadoCodigo,
    onVolver: flujo.volver,
    onReintentar: flujo.limpiarError,
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200">
        {/* Cabecera del formulario */}
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="Librería Oskar"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-sm border border-gray-200"
          />
          <h1 className="text-2xl font-extrabold text-[#252525] tracking-tight">
            Iniciar <span className="bg-[#e8c85e] text-[#252525] px-1.5 py-0.5 rounded-md">Sesión</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1.5">{SUBTITULOS[flujo.paso]}</p>
        </div>

        {flujo.paso === 'credenciales' && (
          <FormularioCredenciales
            enviando={flujo.enviando}
            error={flujo.error}
            aviso={flujo.aviso}
            onEnviar={flujo.enviarCredenciales}
          />
        )}
        {flujo.paso === 'verificar' && (
          <PasoVerificar {...comunes} onVerificar={flujo.verificar} onCambioModo={flujo.limpiarError} />
        )}
        {flujo.paso === 'configurar' && <PasoConfigurar {...comunes} alta={flujo.alta} onActivar={flujo.activar} />}
        {flujo.paso === 'respaldo' && flujo.sesionPendiente && (
          <CodigosRespaldo
            codigos={flujo.sesionPendiente.codigosRespaldo}
            email={flujo.sesionPendiente.usuario?.email}
            onContinuar={flujo.continuar}
          />
        )}
      </div>
    </div>
  );
}
