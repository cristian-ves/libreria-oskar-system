export default function Select({ children, className = '', ...props }) {
  return (
    <select
      className={`w-full min-h-[44px] bg-[#f3f3f3] border border-gray-200 text-[#252525] text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-[#b07c19] focus:ring-1 focus:ring-[#b07c19] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
