// Validadores reutilizables.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_GT_RE = /^[2-7]\d{7}$/; // 8 digitos, primer digito 2-7 (movil/fijo GT)

export function isEmail(value) {
  if (!value) return false;
  return EMAIL_RE.test(String(value).trim());
}

export function isPhoneGT(value) {
  if (!value) return false;
  return PHONE_GT_RE.test(String(value).replace(/\D/g, ''));
}

// Validacion CUI guatemalteco (Codigo Unico de Identificacion):
// 13 digitos, ultimo es check digit modulo 11 sobre los primeros 8.
// Estructura: AAAAAAAA-C-DDMM (8 secuencial, 1 verificador, 4 codigo municipio).
export function isCUI(value) {
  if (!value) return false;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length !== 13) return false;
  const base = digits.slice(0, 8);
  const checkDigit = parseInt(digits[8], 10);
  const muni = digits.slice(9, 11);
  const dept = digits.slice(11, 13);
  if (parseInt(muni, 10) === 0) return false;
  if (parseInt(dept, 10) === 0) return false;

  let suma = 0;
  for (let i = 0; i < 8; i++) {
    suma += parseInt(base[i], 10) * (i + 2);
  }
  const computed = suma % 11;
  return computed === checkDigit;
}

export function nonEmpty(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function inRange(value, min, max) {
  const n = Number(value);
  if (Number.isNaN(n)) return false;
  return n >= min && n <= max;
}

export function maxLen(value, max) {
  if (value === null || value === undefined) return true;
  return String(value).length <= max;
}
