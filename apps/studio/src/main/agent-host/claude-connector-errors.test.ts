import { expect, it, mock } from 'bun:test';
import type { Query } from '@anthropic-ai/claude-agent-sdk';

it('Claude SDK sign-in failures reach our error capture without OAuth details', async () => {
  const captured: { error: unknown; options: unknown }[] = [];
  mock.module('../errors/index.js', () => ({ captureError: (error: unknown, options: unknown) => { captured.push({ error, options }); } }));
  const { claudeConnectorSignIn } = await import('./claude-connector-sign-in.js');
  const query = { mcpAuthenticate: async () => { throw new Error('https://design.example.test/oauth?code=private-token'); } } as unknown as Query;
  await expect(claudeConnectorSignIn(query, '/workspace').authenticate('figma', new AbortController().signal, () => {})).rejects.toThrow();
  expect(captured).toHaveLength(1);
  expect(captured[0]?.options).toEqual({ owner: 'ours', subsystem: 'connectors', mechanism: 'claude-mcp-authenticate' });
  expect(String(captured[0]?.error)).toBe('Error: Claude connector authentication call failed');
  expect(JSON.stringify(captured)).not.toContain('private-token');
});
