import account from '../locales/en/account.json' with { type: 'json' };
import teams from '../locales/en/teams.json' with { type: 'json' };
import jaAccount from '../locales/ja/account.json' with { type: 'json' };
import jaTeams from '../locales/ja/teams.json' with { type: 'json' };
import zhAccount from '../locales/zh-CN/account.json' with { type: 'json' };
import zhTeams from '../locales/zh-CN/teams.json' with { type: 'json' };

export type EditionKey = keyof typeof account | keyof typeof teams;

export interface Edition {
  /** Applies in every language: a product name is never translated. */
  brand: { 'app.name'?: string };
  en: Partial<Record<EditionKey, string>>;
  ja: Partial<Record<EditionKey, string>>;
  'zh-CN': Partial<Record<EditionKey, string>>;
}

export const edition: Edition = { brand: {}, en: { ...account, ...teams }, ja: { ...jaAccount, ...jaTeams }, 'zh-CN': { ...zhAccount, ...zhTeams } };
