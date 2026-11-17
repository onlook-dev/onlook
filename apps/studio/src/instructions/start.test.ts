import { describe, expect, it } from 'bun:test';
import { SERVER_RUNNING_TOOL_NAME } from '../main/agent-host/tool-names.js';
import { startPrompt } from './start.js';

describe('startPrompt', () => {
  it('names the registered server_running tool in both forms', () => {
    expect(startPrompt()).toContain(SERVER_RUNNING_TOOL_NAME);
    expect(startPrompt(['apps/web'])).toContain(SERVER_RUNNING_TOOL_NAME);
  });

  it('lists the folders it was given', () => {
    const named = startPrompt(['apps/web', 'services/api']);
    expect(named).toContain('apps/web');
    expect(named).toContain('services/api');
  });
});

describe('the setup prompt (ONL-2960)', () => {
  const guided = startPrompt([], { pendingFrame: true });

  it('says what it is about to do before calling get_project_setup', () => {
    const say = guided.indexOf('Before your first tool call');
    expect(say).toBeGreaterThanOrEqual(0);
    expect(say).toBeLessThan(guided.indexOf('get_project_setup'));
    expect(startPrompt(['apps/web'])).toStartWith(guided.slice(0, say + 30));
  });

  it('puts a pending frame on the canvas before the setup runs, and never a second one', () => {
    expect(guided).toContain('create_frame');
    expect(guided).toContain('pending');
    expect(guided).toContain('never create a second frame');
  });

  it('asks for no pending frame with covers off, as on main', () => {
    expect(startPrompt()).not.toContain('pending');
    expect(startPrompt([], { pendingFrame: false })).not.toContain('pending');
  });

  it('proposes a repair that changes how the project installs or runs instead of running it', () => {
    expect(guided).toContain('--ignore-scripts');
    expect(guided).toContain('ask me before you save or run it');
  });
});
