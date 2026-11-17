import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, jest, mock } from 'bun:test';
import { IPC_SEND } from '@studio/events';
import { fromMainFrame, seatedTabs } from './test-support.js';

function projectsHost(visible = true, hasSpare = true) {
  let attached = false;
  let viewVisible = true;
  let paint!: (image: { isEmpty(): boolean }) => void;
  const frame = new Promise<{ isEmpty(): boolean }>(resolve => { paint = resolve; });
  const contents = Object.assign(new EventEmitter(), {
    id: 2991, ipc: new EventEmitter(), isDestroyed: () => false,
    capturePage: mock(() => attached && viewVisible ? frame : Promise.reject(new Error('Current display surface not available for capture'))),
    loadFile: mock(async (_file: string, _options: { query: Record<string, string> }) => {}), loadURL: mock(async () => {}),
  });
  const view = { webContents: contents, setVisible: mock((visible: boolean) => { viewVisible = visible; }), setBounds: mock() };
  const spare = { id: 'spare', view, hasPainted: true };
  const host = seatedTabs({
    window: Object.assign(new EventEmitter(), {
      isVisible: () => visible, isFocused: () => true, isDestroyed: () => false,
      contentView: { addChildView: mock(() => { attached = true; }) },
    }), seq: 0, tabs: new Map(), order: [], activation: 0,
    spare: { take: mock(() => hasSpare ? spare : undefined), schedule: mock() },
    newView: mock((attach = true) => { attached = attach; return view; }), observeHealth: mock(), layout: mock(),
    revealWhenPainted: mock(), activate: mock(), persistWindows: mock(),
    slots: { forget: mock(), forTab: mock(() => []) }, cooling: { forget: mock(), touch: mock() },
    raiseChrome: mock(), broadcastTabs: mock(), followSettingsRequest: mock(),
    assign: mock(), expand: mock(), pushSlots: mock(), pushOnScreen: mock(), hasReachedProduct: () => true,
  });
  return { host, view, contents, paint: async () => { paint({ isEmpty: () => false }); await Promise.resolve(); } };
}

afterEach(() => jest.useRealTimers());

describe('Projects paints its own screen before replacing a running project (ONL-2991)', () => {
  for (const hasSpare of [true, false]) {
    it(`opens covered and waits for Projects with spare=${String(hasSpare)}`, () => {
      const { host, view, contents } = projectsHost(true, hasSpare);
      const id = host.open();
      expect(host.spare.take).not.toHaveBeenCalled();
      expect(host.newView).toHaveBeenCalledWith(false);
      expect(host.window.contentView.addChildView).toHaveBeenCalledWith(view, 0);
      expect(view.setVisible).not.toHaveBeenCalledWith(false);
      expect(host.revealWhenPainted).toHaveBeenCalledWith(host.tabs.get(id), view);
      expect(contents.loadFile.mock.calls[0]?.[1]?.query.purpose).toBe('projects');
    });
  }

  it('warms an unmounted Projects tab without promoting an editor scaffold', () => {
    const { host, view, contents } = projectsHost();
    const tab = { id: 'home', isWorking: false };
    expect(host.warm(tab)).toBe(tab);
    expect(host.spare.take).not.toHaveBeenCalled();
    expect(host.newView).toHaveBeenCalledWith(false);
    expect(host.window.contentView.addChildView).toHaveBeenCalledWith(view, 0);
    expect(host.revealWhenPainted).toHaveBeenCalledWith(tab, view);
    expect(contents.loadFile.mock.calls[0]?.[1]?.query.purpose).toBe('projects');
  });

  it('leaves the initial window reveal to the startup show gate', () => {
    const { host } = projectsHost(false);
    host.open();
    expect(host.newView).toHaveBeenCalledWith(true);
    expect(host.revealWhenPainted).not.toHaveBeenCalled();
  });

  it('warms Projects at startup with its own birth purpose and the startup show gate', () => {
    const { host, contents } = projectsHost(false);
    host.warm({ id: 'home', isWorking: false });
    expect(host.spare.take).not.toHaveBeenCalled();
    expect(host.newView).toHaveBeenCalledWith(true);
    expect(host.revealWhenPainted).not.toHaveBeenCalled();
    expect(contents.loadFile.mock.calls[0]?.[1]?.query.purpose).toBe('projects');
  });

  it('still promotes and rekeys a parked spare for a cold project, not Projects', () => {
    const { host, view } = projectsHost();
    const home = { id: 'home', isWorking: false };
    const project = { id: 'project', workspacePath: '/fixture/project', isWorking: false };
    host.tabs.set(home.id, home);
    host.tabs.set(project.id, project);
    host.order = [home.id, project.id];
    const warmed = host.warm(project);
    expect(warmed.id).toBe('spare');
    expect(warmed.view).toBe(view);
    expect(host.tabs.get(home.id)).toBe(home);
    expect(host.order).toEqual(['home', 'spare']);
    expect(host.spare.take).toHaveBeenCalledTimes(1);
    expect(host.newView).not.toHaveBeenCalled();
  });

  for (const coldProjects of [false, true]) {
    it(`shows Projects after the folder action when capture refuses hidden or detached views, cold Projects=${String(coldProjects)}`, async () => {
      jest.useFakeTimers();
      const pending = projectsHost();
      const { host, view, contents } = pending;
      const projectView = { webContents: { id: 3020, isDestroyed: () => false }, setVisible: mock() };
      const project = { id: 'project', workspacePath: '/fixture/project', isWorking: false, view: projectView };
      host.tabs.set(project.id, project);
      host.order = [project.id];
      host.activeId = project.id;
      host.visibleId = project.id;
      if (coldProjects) {
        host.tabs.set('home', { id: 'home', isWorking: false });
        host.order.push('home');
      }
      delete host.activate;
      delete host.revealWhenPainted;

      host.goHome();
      const homeId = host.activeId;
      expect(homeId).not.toBe(project.id);
      expect(host.visibleId).toBe(homeId);
      expect(view.setVisible).toHaveBeenCalledWith(true);
      expect(projectView.setVisible).toHaveBeenCalledWith(false);
      expect(host.window.contentView.addChildView).toHaveBeenCalledWith(view, 0);
      expect(view.setVisible).not.toHaveBeenCalledWith(false);
      expect(contents.loadFile.mock.calls[0]?.[1]?.query.purpose).toBe('projects');
      const pendingTabCount = host.tabs.size;
      host.goHome();
      expect(host.activeId).toBe(homeId);
      expect(host.visibleId).toBe(homeId);
      expect(host.tabs.size).toBe(pendingTabCount);
      contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
      await pending.paint();
      contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(contents));

      expect(host.visibleId).toBe(homeId);
      expect(view.setVisible).toHaveBeenLastCalledWith(true);
      expect(projectView.setVisible).toHaveBeenLastCalledWith(false);
      const tabCount = host.tabs.size;
      const captureCount = contents.capturePage.mock.calls.length;
      const revealCount = view.setVisible.mock.calls.length;
      host.goHome();
      expect(host.activeId).toBe(homeId);
      expect(host.visibleId).toBe(homeId);
      expect(host.tabs.size).toBe(tabCount);
      expect(contents.capturePage).toHaveBeenCalledTimes(captureCount);
      expect(view.setVisible).toHaveBeenCalledTimes(revealCount);
      expect(jest.getTimerCount()).toBe(0);
    });
  }

  it('keeps the running project selected when Projects paints after a rapid return', async () => {
    jest.useFakeTimers();
    const pending = projectsHost();
    const { host, view, contents } = pending;
    const projectView = { webContents: Object.assign(new EventEmitter(), { id: 2992, ipc: new EventEmitter(), isDestroyed: () => false, capturePage: mock(async () => ({ isEmpty: () => false })) }), setVisible: mock() };
    const project = { id: 'project', isWorking: false, view: projectView };
    host.tabs.set(project.id, project);
    host.order = [project.id];
    host.activeId = project.id;
    host.visibleId = project.id;
    delete host.activate;
    delete host.revealWhenPainted;
    const homeId = host.open();
    host.activate(project.id);
    projectView.webContents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(projectView.webContents));
    contents.ipc.emit(IPC_SEND.uiReady, fromMainFrame(contents));
    await pending.paint();
    expect(host.activeId).toBe(project.id);
    expect(host.visibleId).toBe(project.id);
    expect(projectView.setVisible).toHaveBeenLastCalledWith(true);
    expect(view.setVisible).toHaveBeenLastCalledWith(false);
    host.activate(homeId);
    await pending.paint();
    contents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(contents));
    expect(host.visibleId).toBe(homeId);
    expect(view.setVisible).toHaveBeenLastCalledWith(true);
    expect(projectView.setVisible).toHaveBeenLastCalledWith(false);
    expect(host.tabs.get(project.id)?.view).toBe(projectView);
    expect(jest.getTimerCount()).toBe(0);
  });
});
