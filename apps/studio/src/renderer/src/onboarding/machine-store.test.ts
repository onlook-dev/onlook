import '../testing/dom.js';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { MACHINE_CHECK_IDS, type MachineSnapshot } from '@studio/events';
import { seedFlags } from '../flags/store.js';
import { deferred, installBridge } from '../testing/bridge.js';
import { chooseMachineFolder, closeMachineDetail, installMachineTools, machineCreationBlocked, machineNeedsAttention, openMachineDetail, recheckMachineCheck, refreshMachineChecks, useMachineStore } from './machine-store.js';

const passed: MachineSnapshot = { checks: MACHINE_CHECK_IDS.map((id) => ({ id, status: 'passed' })), platform: 'mac', canChooseFolder: true };
const gitFailed: MachineSnapshot = { ...passed, checks: [{ id: 'git', status: 'failed', cause: 'developer_tools_missing' }] };
beforeEach(() => { seedFlags({ 'machine-check': true }); });
afterEach(() => { seedFlags(); });
afterEach(() => { useMachineStore.setState({ snapshot: { ...passed, checks: [] }, checking: false, action: undefined, stalled: undefined, detail: undefined, notice: undefined }); });

describe('machine check state', () => {
  // Off, onboarding never asks: the flag is read here rather than at every surface that could start a check (ONL-3111).
  it('asks main for nothing with the flag off', async () => {
    let asked = 0;
    seedFlags();
    installBridge({ machineCheck: async () => { asked += 1; return gitFailed; } });
    await refreshMachineChecks();
    expect(asked).toBe(0);
    expect(useMachineStore.getState().checking).toBe(false);
    expect(machineCreationBlocked()).toBe(false);

    seedFlags({ 'machine-check': true });
    await refreshMachineChecks();
    expect(asked).toBe(1);
    expect(machineCreationBlocked()).toBe(true);
  });

  it('never blocks while the first checks are running', async () => {
    const pending = deferred<MachineSnapshot>();
    installBridge({ machineCheck: () => pending.promise });
    const run = refreshMachineChecks();
    expect(useMachineStore.getState().checking).toBe(true);
    expect(machineCreationBlocked()).toBe(false);
    pending.settle(passed);
    await run;
    expect(machineCreationBlocked()).toBe(false);
  });

  it('keeps a known failure blocking during Check again and clears it only on recovery', async () => {
    useMachineStore.setState({ snapshot: { ...passed, checks: [{ id: 'git', status: 'failed', cause: 'git_not_found' }] } });
    const pending = deferred<MachineSnapshot>();
    installBridge({ machineCheck: () => pending.promise });
    const run = refreshMachineChecks();
    expect(machineCreationBlocked()).toBe(true);
    pending.settle(passed);
    await run;
    expect(machineCreationBlocked()).toBe(false);
  });

  it('a late failure closes creation after the pending screen was continued', async () => {
    const pending = deferred<MachineSnapshot>();
    installBridge({ machineCheck: () => pending.promise });
    const run = refreshMachineChecks();
    expect(machineCreationBlocked()).toBe(false);
    pending.settle({ ...passed, checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }] });
    await run;
    expect(machineCreationBlocked()).toBe(true);
  });

  it('ignores a stale response and never gates inconclusive results', async () => {
    const first = deferred<MachineSnapshot>();
    const second = deferred<MachineSnapshot>();
    let calls = 0;
    installBridge({ machineCheck: () => ++calls === 1 ? first.promise : second.promise });
    const old = refreshMachineChecks();
    const latest = refreshMachineChecks();
    second.settle({ ...passed, checks: [{ id: 'git', status: 'inconclusive' }] });
    await latest;
    first.settle({ ...passed, checks: [{ id: 'git', status: 'failed', cause: 'git_not_found' }] });
    await old;
    expect(machineCreationBlocked()).toBe(false);
    expect(useMachineStore.getState().checking).toBe(false);
  });

  it('asks for no attention while the checks run or once they all pass', async () => {
    const pending = deferred<MachineSnapshot>();
    installBridge({ machineCheck: () => pending.promise });
    const run = refreshMachineChecks();
    expect(machineNeedsAttention(useMachineStore.getState())).toBe(false);
    pending.settle(passed);
    await run;
    expect(machineNeedsAttention(useMachineStore.getState())).toBe(false);
  });

  it.each([
    ['a failed check', { ...passed, checks: [{ id: 'git', status: 'failed', cause: 'git_not_found' }] } as MachineSnapshot],
    ['a check that could not finish', { ...passed, checks: [{ id: 'port', status: 'inconclusive' }] } as MachineSnapshot],
  ])('asks for attention on %s', async (_name, snapshot) => {
    installBridge({ machineCheck: async () => snapshot });
    await refreshMachineChecks();
    expect(machineNeedsAttention(useMachineStore.getState())).toBe(true);
  });

  it('asks for attention when the checks themselves cannot be run', async () => {
    installBridge({ machineCheck: async () => { throw new Error('IPC unavailable'); } });
    await refreshMachineChecks();
    expect(machineNeedsAttention(useMachineStore.getState())).toBe(true);
  });

  it('lets an unanswered bridge check continue with a visible recovery', async () => {
    installBridge({ machineCheck: async () => { throw new Error('IPC unavailable'); } });
    await refreshMachineChecks();
    expect(machineCreationBlocked()).toBe(false);
    expect(useMachineStore.getState().notice).toBe('machine.unavailable');
  });
});

describe('one owner per running action', () => {
  it('hands the row back to the person when the install finishes without the tools', async () => {
    useMachineStore.setState({ snapshot: gitFailed });
    installBridge({ machineInstallTools: async () => 'failed', machineCheck: async () => gitFailed });
    await installMachineTools();
    expect(useMachineStore.getState().stalled).toBe('git');
    expect(useMachineStore.getState().action).toBeUndefined();
  });

  it('clears the row when the install really installed them', async () => {
    useMachineStore.setState({ snapshot: gitFailed, stalled: 'git' });
    installBridge({ machineInstallTools: async () => 'installed', machineCheck: async () => passed });
    await installMachineTools();
    expect(useMachineStore.getState().stalled).toBeUndefined();
    expect(machineCreationBlocked()).toBe(false);
  });

  it('drops a re-check whose owner was replaced, and keeps the newer answer', async () => {
    useMachineStore.setState({ snapshot: gitFailed });
    const stale = deferred<MachineSnapshot>();
    let calls = 0;
    installBridge({
      machineInstallTools: async () => 'installed',
      machineChooseFolder: async () => 'chosen',
      machineCheck: () => ++calls === 1 ? stale.promise : Promise.resolve(passed),
    });
    const abandoned = installMachineTools();
    // Let the install reach its own verification, which is the result that must be dropped.
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    expect(calls).toBe(1);
    // The person gives up on the install and chooses a folder instead: that press takes the floor.
    await chooseMachineFolder();
    expect(machineCreationBlocked()).toBe(false);
    stale.settle(gitFailed);
    await abandoned;
    expect(machineCreationBlocked()).toBe(false);
    expect(useMachineStore.getState().stalled).toBeUndefined();
  });

  it('keeps the detail view open and says so when Check again finds the same problem', async () => {
    const portFailed: MachineSnapshot = { ...passed, checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }] };
    useMachineStore.setState({ snapshot: portFailed, detail: 'port' });
    installBridge({ machineCheck: async () => portFailed });
    await recheckMachineCheck('port', 'machine.detail.port.again');
    expect(useMachineStore.getState().detail).toBe('port');
    expect(useMachineStore.getState().notice).toBe('machine.detail.port.again');
  });

  it('returns to the list when Check again finds the problem gone', async () => {
    useMachineStore.setState({ snapshot: { ...passed, checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }] }, detail: 'port' });
    installBridge({ machineCheck: async () => passed });
    await recheckMachineCheck('port', 'machine.detail.port.again');
    expect(useMachineStore.getState().detail).toBeUndefined();
    expect(useMachineStore.getState().notice).toBeUndefined();
  });

  it('leaving the detail view mid-check abandons nothing: the answer lands on the list', async () => {
    const portFailed: MachineSnapshot = { ...passed, checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }] };
    useMachineStore.setState({ snapshot: portFailed });
    openMachineDetail('port');
    const pending = deferred<MachineSnapshot>();
    installBridge({ machineCheck: () => pending.promise });
    const run = recheckMachineCheck('port', 'machine.detail.port.again');
    closeMachineDetail();
    expect(useMachineStore.getState().detail).toBeUndefined();
    pending.settle(passed);
    await run;
    expect(machineCreationBlocked()).toBe(false);
    expect(useMachineStore.getState().action).toBeUndefined();
    // Back did not reopen the check it had left.
    expect(useMachineStore.getState().detail).toBeUndefined();
  });

  it('a check still failing when the person has already left does not drag them back in', async () => {
    const portFailed: MachineSnapshot = { ...passed, checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }] };
    useMachineStore.setState({ snapshot: portFailed });
    openMachineDetail('port');
    const pending = deferred<MachineSnapshot>();
    installBridge({ machineCheck: () => pending.promise });
    const run = recheckMachineCheck('port', 'machine.detail.port.again');
    closeMachineDetail();
    pending.settle(portFailed);
    await run;
    expect(useMachineStore.getState().detail).toBeUndefined();
    // The line that belongs to the detail view does not follow it onto the list.
    expect(useMachineStore.getState().notice).toBeUndefined();
  });

  it('a re-check of another row leaves a failed install where it was', async () => {
    const bothFailed: MachineSnapshot = { ...passed, checks: [
      { id: 'git', status: 'failed', cause: 'developer_tools_missing' },
      { id: 'port', status: 'failed', cause: 'no_free_port' },
    ] };
    useMachineStore.setState({ snapshot: bothFailed, stalled: 'git', detail: 'port' });
    installBridge({ machineCheck: async () => ({ ...bothFailed, checks: [bothFailed.checks[0]!] }) });
    await recheckMachineCheck('port', 'machine.detail.port.again');
    expect(useMachineStore.getState().stalled).toBe('git');
  });

  it('a Check again the bridge refused says so, instead of blaming the check', async () => {
    const portFailed: MachineSnapshot = { ...passed, checks: [{ id: 'port', status: 'failed', cause: 'no_free_port' }] };
    useMachineStore.setState({ snapshot: portFailed, detail: 'port' });
    installBridge({ machineCheck: async () => { throw new Error('IPC unavailable'); } });
    await recheckMachineCheck('port', 'machine.detail.port.again');
    expect(useMachineStore.getState().notice).toBe('machine.unavailable');
    expect(useMachineStore.getState().detail).toBe('port');
  });
});
