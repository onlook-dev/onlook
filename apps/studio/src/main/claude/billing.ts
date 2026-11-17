import { CLAUDE_API_KEY_PLAN, CLAUDE_BEDROCK_PLAN, CLAUDE_CUSTOM_ENDPOINT_PLAN } from '@studio/events';
import type { Env } from '../env/shell-env.js';

export function configuredClaudeSource(env: Env): string | undefined {
  if (env['CLAUDE_CODE_USE_BEDROCK'] === '1' || env['CLAUDE_CODE_USE_BEDROCK'] === 'true') return CLAUDE_BEDROCK_PLAN;
  const base = env['ANTHROPIC_BASE_URL']?.trim();
  if (base) {
    try {
      const url = new URL(base);
      if (url.protocol !== 'https:' || url.hostname !== 'api.anthropic.com' || url.port !== '' || (url.pathname !== '/' && url.pathname !== '')) return CLAUDE_CUSTOM_ENDPOINT_PLAN;
    } catch {
      return CLAUDE_CUSTOM_ENDPOINT_PLAN;
    }
  }
  return undefined;
}

export function claudeBillingPlan(body: Record<string, unknown>, env: Env): string | undefined {
  const configured = configuredClaudeSource(env);
  if (configured !== undefined) return configured;
  if (body['authMethod'] === 'api_key' || body['authMethod'] === 'api-key' || (typeof body['apiKeySource'] === 'string' && body['apiKeySource'] !== '' && body['apiKeySource'] !== 'none')) return CLAUDE_API_KEY_PLAN;
  const plan = body['subscriptionType'];
  return plan === 'max' || plan === 'pro' || plan === 'team' || plan === 'enterprise' ? plan : undefined;
}
