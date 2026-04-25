// Formateadores de fechas, numeros y moneda. Timezone GT (America/Guatemala, UTC-6).

const TZ_GT = 'America/Guatemala';

function toDate(input) {
  if (!input) return null;
  if (input instanceof Date) return input;
  // ISO 8601 UTC del backend
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(input, opts = {}) {
  const d = toDate(input);
  if (!d) return '';
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: TZ_GT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...opts,
  }).format(d);
}

export function fmtDateTime(input) {
  const d = toDate(input);
  if (!d) return '';
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: TZ_GT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function fmtTimeAgo(input) {
  const d = toDate(input);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `hace ${sec}s`;
  if (sec < 3600) return `hace ${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `hace ${Math.floor(sec / 3600)}h`;
  return `hace ${Math.floor(sec / 86400)}d`;
}

export function fmtNumber(n, decimals = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function fmtPercent(n, decimals = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${fmtNumber(n, decimals)}%`;
}

export function fmtCurrency(n, currency = 'GTQ') {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

// Calculo local de KPIs basicos (paridad parcial con backend).
// items = array de 18 ints 1..5 (algunos pueden ser null si user dejo vacio).
export function calcKpisLocal(items) {
  const valid = items.filter((v) => typeof v === 'number' && v >= 1 && v <= 5);
  if (valid.length === 0) {
    return { promedio: null, satisfaccion: 0, insatisfaccion: 0, validCount: 0 };
  }
  const promedio = valid.reduce((a, b) => a + b, 0) / valid.length;
  const sat = valid.filter((v) => v >= 4).length / valid.length;
  const ins = valid.filter((v) => v <= 2).length / valid.length;
  return {
    promedio: Math.round(promedio * 100) / 100,
    satisfaccion: Math.round(sat * 1000) / 10,
    insatisfaccion: Math.round(ins * 1000) / 10,
    validCount: valid.length,
  };
}

export function truncate(str, len = 80) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

// Aliases para compatibilidad con componentes que esperan estos nombres.
export const formatFechaCorta = (input) => fmtDate(input);
export const formatFechaLarga = (input) =>
  fmtDate(input, { year: 'numeric', month: 'long', day: 'numeric' });
export const formatFechaHora = (input) => fmtDateTime(input);
export const formatTimeAgo = fmtTimeAgo;
export const formatNumber = fmtNumber;
export const formatPercent = fmtPercent;
export const formatCurrency = fmtCurrency;
