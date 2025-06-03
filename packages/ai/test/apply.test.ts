import { describe, expect, it } from 'bun:test';
import { applyCodeChange } from '../src/apply';

describe('applyCodeChange', () => {
    it('should apply code change', async () => {
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

        const result = await applyCodeChange(originalCode, updateSnippet);
        expect(result).toBe(expectedResult);
    });
});
