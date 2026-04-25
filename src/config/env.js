// Centraliza acceso a import.meta.env para tipar y poder mockear en tests.

const fallback = (val, def) => (val === undefined || val === null || val === '' ? def : val);

export const VITE_API_URL = fallback(
  import.meta.env?.VITE_API_URL,
  'https://igss.mediclic.org/sfyc'
);

export const VITE_VERSION = fallback(import.meta.env?.VITE_VERSION, 'dev');

export const BASE_URL = fallback(import.meta.env?.BASE_URL, '/salud-familiar-comunitaria/');

export const IS_DEV = !!import.meta.env?.DEV;
export const IS_PROD = !!import.meta.env?.PROD;
