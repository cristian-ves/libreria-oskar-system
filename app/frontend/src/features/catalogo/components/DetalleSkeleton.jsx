export default function DetalleSkeleton() {
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-4 w-32 bg-gray-200 rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 flex justify-center md:justify-start">
          <div className="w-56 h-80 bg-white border border-gray-200 rounded-2xl shadow-sm" />
        </div>
        <div className="md:col-span-8 space-y-4">
          <div className="h-8 w-3/4 bg-gray-200 rounded-xl" />
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-1/3 bg-gray-200 rounded" />
          <div className="h-24 w-full bg-white border border-gray-200 rounded-xl mt-6 shadow-sm" />
          <div className="h-32 w-full bg-white border border-gray-200 rounded-xl mt-6 shadow-sm" />
        </div>
      </div>
    </div>
  );
}
