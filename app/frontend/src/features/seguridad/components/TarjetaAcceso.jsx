import logo from '../../../assets/logo.jpg';

// Misma tarjeta que Login.jsx (duplicación menor: Login no se refactoriza aquí).
// `titulo` admite la etiqueta dorada; refTitulo permite llevar el foco al h1.
export default function TarjetaAcceso({ titulo, subtitulo, refTitulo, children }) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="text-center mb-8">
          <img
            src={logo}
            alt="Librería Oskar"
            className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-sm border border-gray-200"
          />
          <h1 ref={refTitulo} tabIndex={refTitulo ? -1 : undefined} className="text-2xl font-extrabold text-[#252525] tracking-tight outline-none">
            {titulo}
          </h1>
          {subtitulo && <p className="text-xs text-gray-500 mt-1.5">{subtitulo}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Etiqueta({ children }) {
  return <span className="bg-[#e8c85e] text-[#252525] px-1.5 py-0.5 rounded-md">{children}</span>;
}
