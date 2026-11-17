import { app } from 'electron';
import { LOCALES, resolveLocale, setLocale, systemLocale, type Locale } from '@studio/i18n';
import { log } from '../log/index.js';
import { devSwitches } from '../env/dev-switches.js';

function forcedLocale(): Locale | undefined {
  return resolveLocale({ override: devSwitches.locale, preferred: [], supported: LOCALES });
}

/** Before `ready`: Chromium reads `--lang` only at startup, and `pseudo` is no language Chromium has. */
export function applyChromiumLanguage(): void {
  const forced = forcedLocale();
  if (forced !== undefined && forced !== 'pseudo') app.commandLine.appendSwitch('lang', forced);
}

/** After `primeFlags` and before the first view: every view reads the choice once, as it loads. */
export function chooseLocale(): void {
  const override = devSwitches.locale;
  const forced = forcedLocale();
  const locale = forced ?? systemLocale(app.getPreferredSystemLanguages());
  setLocale(locale);
  const logger = log('locale');
  if (override !== undefined && override.trim() !== '' && forced === undefined) {
    logger.warn('STUDIO_LOCALE names no supported language', { supported: LOCALES.join(',') });
  }
  logger.info('language chosen', { locale: locale ?? 'none', source: locale === undefined ? 'none' : forced !== undefined ? 'override' : 'system' });
}
