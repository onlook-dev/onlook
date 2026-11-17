import { describe, expect, it } from 'bun:test';
import { FRAME_QUOTE_MAX_LENGTH, type ArtifactToolInput } from '@studio/events';
import { artifactTools } from './artifact-tools.js';

const ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';

function placeTool(quotes: boolean, seen: ArtifactToolInput[] = []) {
  const tool = artifactTools(async (_verb, input) => {
    seen.push(input);
    return { ok: true, value: { node: { id: 'a1' } } };
  }, quotes).find((definition) => definition.name === 'place_artifact');
  if (tool === undefined) throw new Error('place_artifact is not offered');
  return tool as unknown as {
    inputSchema: Record<string, { safeParse: (value: unknown) => { success: boolean; data?: unknown } }>;
    handler: (args: unknown, extra: unknown) => Promise<{ content: { text: string }[] }>;
  };
}

describe('a quote on a placed artifact (ONL-2960)', () => {
  it('passes the trimmed quote through and says the artifact shows it', async () => {
    const seen: ArtifactToolInput[] = [];
    const tool = placeTool(true, seen);
    const quote = tool.inputSchema['quote']!.safeParse('  A pricing card  ').data;
    const reply = await tool.handler({ artifactId: ID, quote }, {});
    expect(seen[0]?.quote).toBe('A pricing card');
    expect(reply.content[0]?.text).toContain('shows your quote');
  });

  it('says nothing about a quote when none was given', async () => {
    const reply = await placeTool(true).handler({ artifactId: ID }, {});
    expect(reply.content[0]?.text).not.toContain('quote');
  });

  it('refuses a quote past the limit', () => {
    expect(placeTool(true).inputSchema['quote']!.safeParse('x'.repeat(FRAME_QUOTE_MAX_LENGTH + 1)).success).toBe(false);
  });

  it('is not offered when quotes are off', () => {
    expect(Object.keys(placeTool(false).inputSchema)).not.toContain('quote');
  });
});
