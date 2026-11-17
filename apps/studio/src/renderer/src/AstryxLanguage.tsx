import type { ReactNode } from 'react';
import { InternationalizationProvider, type Overrides } from '@astryxdesign/core/i18n';
import { astryxMessages } from '@studio/i18n/astryx';
import { activeLocale, intlLocale } from '@studio/i18n';

let overrides: { locale: string; value: Overrides } | undefined;

function overridesFor(locale: string): Overrides {
  if (overrides?.locale !== locale) overrides = { locale, value: { [locale]: astryxMessages() } };
  return overrides.value;
}

/** English mounts no provider, so Astryx keeps its own shipped English exactly. */
export function AstryxLanguage({ children }: { children: ReactNode }): React.JSX.Element {
  const chosen = activeLocale();
  const locale = intlLocale();
  if (chosen === undefined || chosen === 'en' || locale === undefined) return <>{children}</>;
  return (
    <InternationalizationProvider locale={locale} overrides={overridesFor(locale)}>
      {children}
    </InternationalizationProvider>
  );
}
