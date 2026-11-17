import { activeLocale, type Locale } from '@studio/i18n';

/** `pseudo` is English to the person reading it, so the agent stays in English there too. */
const AGENT_LANGUAGE: Readonly<Record<Locale, string | undefined>> = {
  en: undefined,
  ja: 'Japanese',
  'zh-CN': 'Simplified Chinese',
  pseudo: undefined,
};

export function agentLanguage(): string | undefined {
  const locale = activeLocale();
  return locale === undefined ? undefined : AGENT_LANGUAGE[locale];
}
