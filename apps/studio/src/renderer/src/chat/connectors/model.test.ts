import { describe, expect, it } from 'bun:test';
import { CONNECTORS_NOTICE_MIN_PROJECTS, connectorRows, connectorsMenuMaxHeight, showsConnectorsNotice } from './model.js';

describe('connector presentation', () => {
  it('never offers Add for an unknown or unavailable inventory', () => {
    expect(connectorRows(undefined).known).toBe(false);
    expect(connectorRows({ servers: [], unavailable: true }).known).toBe(false);
    expect(connectorRows({ servers: [] }).known).toBe(true);
  });

  it('folds every featured alias into one slot', () => {
    const rows = connectorRows({ servers: [
      { id: 'remote', name: 'renamed', featured: 'figma', state: 'off' },
      { id: 'desktop', name: 'Desktop', featured: 'figma', state: 'connected' },
    ] });
    expect(rows.featured).toHaveLength(2);
    expect(rows.featured[0]?.server?.id).toBe('desktop');
  });

  it('orders Other tools by name alone, ignoring case, so a row never moves when its status changes', () => {
    const servers = [
      { id: 'fine', name: 'Fine', state: 'connected' },
      { id: 'auth', name: 'Sign in', state: 'needs-sign-in' },
      { id: 'lower', name: 'context7', state: 'connected' },
      { id: 'failed', name: 'Broken', state: 'failed' },
      { id: 'waiting', name: 'In the browser', state: 'awaiting-sign-in' },
      { id: 'same-first', name: 'linear', state: 'connected' },
      { id: 'same-second', name: 'Linear', state: 'connected' },
    ] as const;
    const order = ['failed', 'lower', 'fine', 'waiting', 'same-first', 'same-second', 'auth'];
    expect(connectorRows({ servers: [...servers] }).others.map((server) => server.id)).toEqual(order);
    const restarted = servers.map((server) => (server.id === 'failed' ? { ...server, state: 'starting' as const } : server));
    expect(connectorRows({ servers: restarted }).others.map((server) => server.id)).toEqual(order);
  });

  it('caps the menu so it grows upward from its trigger and stops short of the panel header', () => {
    const header = { top: 0, bottom: 42 };
    for (const top of [820, 400, 60]) {
      const trigger = { top, bottom: top + 32 };
      const maxHeight = connectorsMenuMaxHeight({ header, trigger });
      expect(maxHeight).toBeGreaterThanOrEqual(0);
      expect(trigger.top - maxHeight).toBeGreaterThan(header.bottom);
    }
  });

  const ready = { primed: true, dismissed: false, projectCount: CONNECTORS_NOTICE_MIN_PROJECTS, isInvitationAsking: false };

  it('shows the notice only after both inventory and global settings are known', () => {
    expect(showsConnectorsNotice(undefined, ready)).toBe(false);
    expect(showsConnectorsNotice({ servers: [], unavailable: true }, ready)).toBe(false);
    expect(showsConnectorsNotice({ servers: [] }, { ...ready, primed: false })).toBe(false);
    expect(showsConnectorsNotice({ servers: [] }, { ...ready, dismissed: true })).toBe(false);
    expect(showsConnectorsNotice({ servers: [] }, ready)).toBe(true);
    expect(showsConnectorsNotice({ servers: [{ id: 'f', name: 'Figma', featured: 'figma', state: 'connected' }] }, ready)).toBe(false);
  });

  it('holds the notice back until the person has enough projects', () => {
    expect(showsConnectorsNotice({ servers: [] }, { ...ready, projectCount: CONNECTORS_NOTICE_MIN_PROJECTS - 1 })).toBe(false);
    expect(showsConnectorsNotice({ servers: [] }, ready)).toBe(true);
  });

  it('gives way while the notifications invitation asks', () => {
    expect(showsConnectorsNotice({ servers: [] }, { ...ready, isInvitationAsking: true })).toBe(false);
  });
});
