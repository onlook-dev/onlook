import { LOCALE_ARG } from '@studio/events';
import { activeLocale } from '@studio/i18n';

export function localeArguments(): string[] {
  const locale = activeLocale();
  return locale === undefined ? [] : [`${LOCALE_ARG}=${locale}`];
}
