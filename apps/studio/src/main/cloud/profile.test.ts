import { describe, expect, it } from 'bun:test';
import { profileFor } from './profile.js';

const PICTURE = 'data:image/png;base64,AAAA';
const ALEX = { email: 'alex@example.com', name: 'Alex Designer', source: 'provider', pictureUrl: 'https://pictures.example.com/alex.png' } as const;
const kept = { url: ALEX.pictureUrl, data: PICTURE };

describe('the profile main publishes', () => {
  it('is nothing at all without an identity', () => {
    expect(profileFor(null, kept)).toBeNull();
  });

  it('carries a picture that was resolved for this person', () => {
    expect(profileFor(ALEX, kept)).toEqual({ name: 'Alex Designer', email: 'alex@example.com', picture: PICTURE });
  });

  it('refuses a picture resolved for anyone else, so the next person wears no stale face', () => {
    const bea = { email: 'bea@example.com', source: 'provider', pictureUrl: 'https://pictures.example.com/bea.png' } as const;
    expect(profileFor(bea, kept)).toEqual({ name: null, email: 'bea@example.com', picture: null });
  });

  it('refuses a picture when the person has none', () => {
    const cy = { email: 'cy@example.com', source: 'provider' } as const;
    expect(profileFor(cy, kept)?.picture).toBeNull();
  });
});
