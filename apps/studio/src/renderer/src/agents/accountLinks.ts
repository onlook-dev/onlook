import { CLAUDE_API_KEY_PLAN, CLAUDE_BEDROCK_PLAN, CLAUDE_CUSTOM_ENDPOINT_PLAN, type HarnessId } from '@studio/events';

const CLAUDE_USAGE_URL = 'https://claude.ai/settings/usage';
const CLAUDE_BILLING_URL = 'https://claude.ai/settings/billing';
const CLAUDE_CONSOLE_USAGE_URL = 'https://platform.claude.com/usage';
const CLAUDE_CONSOLE_BILLING_URL = 'https://platform.claude.com/settings/billing';
const CHATGPT_USAGE_URL = 'https://chatgpt.com/codex/settings/usage';
const CHATGPT_BILLING_URL = 'https://chatgpt.com/#settings/Account';

export type AccountPage = 'usage' | 'billing';

/** Bedrock and a custom endpoint are billed by whoever runs them, so they get no page (ONL-2903). */
export function accountLink(harness: HarnessId, page: AccountPage, plan: string | undefined): string | undefined {
  if (harness === 'codex') return page === 'usage' ? CHATGPT_USAGE_URL : CHATGPT_BILLING_URL;
  if (plan === CLAUDE_BEDROCK_PLAN || plan === CLAUDE_CUSTOM_ENDPOINT_PLAN) return undefined;
  if (plan === CLAUDE_API_KEY_PLAN) return page === 'usage' ? CLAUDE_CONSOLE_USAGE_URL : CLAUDE_CONSOLE_BILLING_URL;
  return page === 'usage' ? CLAUDE_USAGE_URL : CLAUDE_BILLING_URL;
}

/** `window.open` of an https URL reaches `shell.openExternal` in main. */
export function openAccountLink(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
