export const defaultLocale = 'en';
export const locales = ['en'];

export default function getRequestConfig() {
  return {
    locales,
    defaultLocale
  };
}
