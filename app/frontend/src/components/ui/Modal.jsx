export default function Modal({ children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
      <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain p-4 sm:p-6 shadow-2xl animate-scale-in space-y-4">
        {children}
      </div>
    </div>
  );
}
