export default function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-bold text-[#252525] mb-1.5">
      {children}{required && <span className="text-[#e19922] ml-0.5">*</span>}
    </label>
  );
}
