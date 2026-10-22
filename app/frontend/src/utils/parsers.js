export function orNull(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

export function toNum(val, fallback = 0) {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}
