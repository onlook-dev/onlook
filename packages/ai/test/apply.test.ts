import { describe, expect, it } from 'bun:test';
import { applyCodeChange } from '../src/apply';

const hasFastApplyEnv = Boolean(process.env.MORPH_API_KEY) || Boolean(process.env.RELACE_API_KEY);

describe('applyCodeChange', () => {
    const run = hasFastApplyEnv ? it : it.skip;

    run('should apply code change', async () => {
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
  // ... existing code
  if (!response.ok) {
    throw new Error('Failed to fetch user: ' + response.status);
  }
  // ... new code
}`;

        const expectedResult = `interface User {
  id: string;
  name: string;
  email?: string;
}

async function fetchUserData(userId: string): Promise<User> {
  const response = await fetch('/api/users/' + userId);
  if (!response.ok) {
    throw new Error('Failed to fetch user: ' + response.status);
  }
  return response.json();
}`;

        const result = await applyCodeChange(
            originalCode,
            updateSnippet,
            'I will add email field to User interface and improve fetchUserData function with proper typing and error handling',
        );
        expect(result).toBe(expectedResult);
    });
});
