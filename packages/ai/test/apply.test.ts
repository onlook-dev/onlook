import { describe, expect, it } from 'bun:test';
import { FastApplyClient } from '../src/apply';

describe('applyCodeChange', () => {
    it('should apply code change', async () => {
        const client = new FastApplyClient(process.env.MORPH_API_KEY || '');
        const originalCode = `interface User {
  id: string;
  name: string;
}

function fetchUserData(userId) {
  const response = await fetch('/api/users/' + userId);
  return response.json();
}`;

        const updateSnippet = `interface User {
  // other fields
  email?: string;
}

async function fetchUserData(userId: string): Promise<User> {
  // ...
  if (!response.ok) {
    throw new Error('Failed to fetch user: ' + response.status);
  }
  // ...
}`;

        const result = await client.applyCodeChange(originalCode, updateSnippet);
        expect(result).toBeDefined();
        console.log(result);
    });
});
