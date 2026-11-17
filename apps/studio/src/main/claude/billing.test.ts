import { expect, test } from 'bun:test';
import { claudeBillingPlan, configuredClaudeSource } from './billing.js';

test('billing reports safe kinds with configured transport ahead of a cached subscription', () => {
  const body = { subscriptionType: 'max', authMethod: 'claude.ai' };
  expect(claudeBillingPlan(body, {})).toBe('max');
  expect(claudeBillingPlan({ ...body, apiKeySource: 'ANTHROPIC_API_KEY' }, { ANTHROPIC_API_KEY: 'secret' })).toBe('api-key');
  expect(claudeBillingPlan(body, { CLAUDE_CODE_USE_BEDROCK: '1', AWS_ACCESS_KEY_ID: 'secret' })).toBe('bedrock');
  expect(claudeBillingPlan(body, { ANTHROPIC_BASE_URL: 'https://private.example/account', ANTHROPIC_AUTH_TOKEN: 'secret' })).toBe('custom-endpoint');
  expect(configuredClaudeSource({ ANTHROPIC_BASE_URL: 'https://api.anthropic.com/' })).toBeUndefined();
  expect(configuredClaudeSource({ CLAUDE_CODE_USE_BEDROCK: '0' })).toBeUndefined();
  expect(configuredClaudeSource({ ANTHROPIC_BASE_URL: 'https://api.anthropic.com/private-proxy' })).toBe('custom-endpoint');
  expect(claudeBillingPlan({ subscriptionType: 'https://private.example/account' }, {})).toBeUndefined();
});
