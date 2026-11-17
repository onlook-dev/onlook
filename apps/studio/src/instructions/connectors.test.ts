import { expect, it } from 'bun:test';
import { connectorInstructions } from './connectors.js';

it('tells the agent why unavailable featured tools need sign-in without including private server names', () => {
  const context = connectorInstructions({ servers: [
    { id: 'secret', name: 'Private client', featured: 'figma', state: 'needs-sign-in' },
    { id: 'other', name: 'Secret other server', state: 'connected' },
  ] });
  expect(context).toContain('Figma: needs sign-in');
  expect(context).toContain('Mobbin: not added');
  expect(context).toContain('connectors menu to sign in');
  expect(context).not.toContain('Private client');
  expect(context).not.toContain('Secret other server');
});

it('unknown inventory does not claim the user needs sign-in', () => {
  expect(connectorInstructions({ servers: [], unavailable: true })).toContain('Figma: status unavailable');
});
