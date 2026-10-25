import { Link } from 'react-router-dom';

export const CLASE_SECUNDARIO =
  'text-xs font-semibold text-[#b07c19] hover:underline rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b07c19] cursor-pointer';

export default function EnlaceSecundario({ to, children }) {
  return <Link to={to} className={CLASE_SECUNDARIO}>{children}</Link>;
}
