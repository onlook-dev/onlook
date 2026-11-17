import { describe, expect, it } from 'bun:test';
import type { WebContents } from 'electron';
import { IPC_EMIT } from '@studio/events';
import { SettingsRequest } from './settings-request.js';
import { seatedTabs } from './test-support.js';

const PROJECTS_VIEW = 101;
const PROJECT_VIEW = 202;

interface TestContents {
  id: number;
  sent: string[];
  isDestroyed: () => boolean;
  send: (channel: string) => void;
}

function contents(id: number): TestContents {
  const sent: string[] = [];
  return { id, sent, isDestroyed: () => false, send: (channel: string) => sent.push(channel) };
}

/** A window holding the Projects Tab and a project Tab, with the project Tab forward. */
function testRequest(): { request: SettingsRequest; select: (id: string) => void; projects: TestContents; project: TestContents } {
  const projects = contents(PROJECTS_VIEW);
  const project = contents(PROJECT_VIEW);
  const views = new Map<string, TestContents>([['projects', projects], ['project-0', project]]);
  let selectedId = 'project-0';
  const request = new SettingsRequest({
    selectedId: () => selectedId,
    contentsFor: (id) => views.get(id) as unknown as WebContents | undefined,
  });
  return { request, select: (id) => { selectedId = id; }, projects, project };
}

describe('SettingsRequest (ONL-2499)', () => {
  it('emits to the Tab that asked, and holds the one-shot for that Tab alone', () => {
    const { request, projects, project } = testRequest();

    request.reveal();

    expect(project.sent).toEqual([IPC_EMIT.settingsOpen]);
    expect(projects.sent).toEqual([]);
    expect(request.take(PROJECTS_VIEW)).toBe(false);
    expect(request.take(PROJECT_VIEW)).toBe(true);
    // One-shot: a second pull answers nothing.
    expect(request.take(PROJECT_VIEW)).toBe(false);
  });

  it('follows the person to the Tab they switch to before the request is taken', () => {
    const { request, select, projects, project } = testRequest();

    request.reveal();
    select('projects');
    request.follow('project-0');

    expect(projects.sent).toEqual([IPC_EMIT.settingsOpen]);
    expect(request.take(PROJECT_VIEW)).toBe(false);
    expect(request.take(PROJECTS_VIEW)).toBe(true);
    expect(project.sent).toEqual([IPC_EMIT.settingsOpen]);
  });

  it('leaves a taken request behind when the person switches Tabs afterwards', () => {
    const { request, select, projects } = testRequest();

    request.reveal();
    expect(request.take(PROJECT_VIEW)).toBe(true);
    select('projects');
    request.follow('project-0');

    expect(projects.sent).toEqual([]);
    expect(request.take(PROJECTS_VIEW)).toBe(false);
  });
});

describe('TabHost.revealSettings (ONL-2499)', () => {
  it('leaves the forward Tab where it is: the modal opens over the screen the person is on', () => {
    const projects = contents(PROJECTS_VIEW);
    const project = contents(PROJECT_VIEW);
    const tabs = new Map<string, unknown>([
      ['projects', { id: 'projects', isWorking: false, view: { webContents: projects } }],
      ['project-0', { id: 'project-0', isWorking: false, workspacePath: '/fixture/open-0', view: { webContents: project } }],
    ]);
    const activations: string[] = [];
    const host = seatedTabs({ tabs, order: [...tabs.keys()], activeId: 'project-0', activate: (id: string) => { activations.push(id); } });

    host.revealSettings();

    expect(activations).toEqual([]);
    expect(host.activeId).toBe('project-0');
    expect(host.state().activeId).toBe('project-0');
    expect(project.sent).toEqual([IPC_EMIT.settingsOpen]);
    expect(host.takeSettingsRequest(PROJECT_VIEW)).toBe(true);
  });
});
