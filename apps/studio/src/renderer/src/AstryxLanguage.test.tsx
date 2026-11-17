import { afterEach, describe, expect, it } from 'bun:test';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { InternationalizationProvider, useTranslator } from '@astryxdesign/core/i18n';
import { AstryxLanguage } from './AstryxLanguage.js';
import { astryxMessages } from '@studio/i18n/astryx';
import { setLocale } from '@studio/i18n';

afterEach(() => setLocale(undefined));

const SENDERS = ['user', 'assistant', 'system'];

function Read({ keys }: { keys: string[] }): ReactNode {
  const translate = useTranslator();
  return keys.flatMap((key) => SENDERS.map((sender) => translate(key, { sender }))).join('\n');
}

function read(keys: string[], wrap: (children: ReactNode) => ReactNode = (children) => children): string[] {
  return renderToStaticMarkup(wrap(<Read keys={keys} />)).split('\n');
}

describe('Astryx strings from the catalog', () => {
  it('say in English exactly what Astryx says on its own', () => {
    const messages = astryxMessages();
    const keys = Object.keys(messages);
    const own = read(keys);
    expect(own.some((line) => line.startsWith('@astryx'))).toBe(false);
    const fromCatalog = read(keys, (children) => (
      <InternationalizationProvider locale="en" overrides={{ en: messages }}>{children}</InternationalizationProvider>
    ));
    expect(fromCatalog).toEqual(own);
  });

  it('reach Astryx in the chosen language', () => {
    setLocale('pseudo');
    const keys = Object.keys(astryxMessages());
    const lines = read(keys, (children) => <AstryxLanguage>{children}</AstryxLanguage>);
    const system = SENDERS.indexOf('system');
    const translated = lines.filter((_, at) => !(keys[Math.floor(at / SENDERS.length)] === '@astryx.chatMessage.messageFrom' && at % SENDERS.length === system));
    for (const line of translated) expect(line).toStartWith('⟦');
  });
});
