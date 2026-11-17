import { MACHINE_CHECK_IDS, type HarnessId, type MachineCheck, type MachineCheckId, type MachineFailureCause, type MachineSnapshot } from '@studio/events';
import { MachineStepView } from '../../onboarding/MachineStep.js';
import type { MachineRecovery } from '../../onboarding/machine-rows.js';
import type { StringKey } from '@studio/i18n';
import { Focused, noop, type Gallery } from './Showroom.js';

const passed: MachineCheck[] = MACHINE_CHECK_IDS.map((id) => ({ id, status: 'passed' }));
const copy = async (): Promise<boolean> => true;

/** The window the prototype's frames were captured at, so a still lays over one without rescaling (ONL-3111). */
const PROTOTYPE_FRAME = { width: 1233, height: 730 };

function Still({ cause, failures, platform = 'mac', pending = false, unanswered = false, inconclusive = false, acting, answered, unconfirmedIds, stalled, detail, fixedFolder = false, notice, focus = false, split = false, proto = false, agents }: {
  cause?: MachineFailureCause;
  failures?: Partial<Record<MachineCheckId, MachineFailureCause>>;
  platform?: MachineSnapshot['platform'];
  pending?: boolean;
  unanswered?: boolean;
  inconclusive?: boolean;
  acting?: { id: MachineCheckId; kind: MachineRecovery };
  /** Only these checks have answered yet; the rest are still running. */
  answered?: MachineCheckId[];
  unconfirmedIds?: MachineCheckId[];
  stalled?: MachineCheckId;
  detail?: MachineCheckId;
  fixedFolder?: boolean;
  notice?: StringKey;
  focus?: boolean;
  split?: boolean;
  /** The prototype's own window, for a still that sits beside its frames. */
  proto?: boolean;
  agents?: readonly HarnessId[];
}): React.JSX.Element {
  const id = cause === 'workspace_not_writable' || cause === 'permission_denied' || cause === 'disk_full' ? 'workspace' : cause === 'no_free_port' ? 'port' : cause === 'helper_failed' ? 'helper' : 'git';
  const failed = failures ?? (cause === undefined ? {} : { [id]: cause });
  const settled: MachineCheck[] = inconclusive ? MACHINE_CHECK_IDS.map((checkId) => ({ id: checkId, status: 'inconclusive' }))
    : passed.map((check) => {
      const failure = failed[check.id];
      if (failure !== undefined) return { id: check.id, status: 'failed', cause: failure };
      return unconfirmedIds?.includes(check.id) === true ? { id: check.id, status: 'inconclusive' } : check;
    });
  const checks: MachineCheck[] = unanswered ? []
    : answered !== undefined ? settled.filter((check) => answered.includes(check.id))
    : pending ? [] : settled;
  // The split still is the window's floor plus what the compact rules drop there — the shell's column padding and this screen's header drop, step and row padding — since no viewport query reaches inside a story (ONL-3111).
  return <Focused selector={focus ? '[data-testid="machine-check-again"]' : undefined}>
    <div style={{ width: proto ? PROTOTYPE_FRAME.width : split ? 960 : 900, height: proto ? PROTOTYPE_FRAME.height : split ? 713 : 600, background: 'var(--studio-ground)' }}>
      <MachineStepView
        snapshot={{ checks, platform, canChooseFolder: !fixedFolder }}
        checking={pending}
        action={acting === undefined ? undefined : { ...acting, token: 1 }}
        stalled={stalled}
        detail={detail}
        notice={notice}
        aside={split || proto ? <div /> : undefined}
        onContinue={noop} onBack={noop} onInstall={noop} onChoose={noop} onFix={noop} onCheckAgain={noop} onCloseDetail={noop} onCopy={copy} onHelp={noop} onOpenAgent={noop} {...(agents === undefined ? {} : { agents })} />
    </div>
  </Focused>;
}

export const MACHINE_GALLERY: Gallery = {
  id: 'machine', title: 'Check your computer', categories: [
    { id: 'list', title: 'The four checks', stories: [
      { id: 'pending', title: 'Every check starts at once', wide: true, render: () => <Still pending /> },
      { id: 'landing', title: 'Checks land one by one', wide: true, render: () => <Still pending answered={['git', 'workspace']} /> },
      { id: 'passed', title: 'All four ready, Continue lights up', wide: true, render: () => <Still /> },
      { id: 'two-failures', title: 'Onlook installs, you choose the folder', wide: true, render: () => <Still failures={{ git: 'developer_tools_missing', workspace: 'workspace_not_writable' }} /> },
      { id: 'installing', title: 'The row spins while it installs', wide: true, render: () => <Still failures={{ git: 'developer_tools_missing', workspace: 'workspace_not_writable' }} acting={{ id: 'git', kind: 'install' }} /> },
      { id: 'one-fixed', title: 'Installed, the folder still to choose', wide: true, render: () => <Still failures={{ workspace: 'workspace_not_writable' }} /> },
      { id: 'choosing', title: 'Checking the folder you chose', wide: true, render: () => <Still failures={{ workspace: 'workspace_not_writable' }} acting={{ id: 'workspace', kind: 'choose' }} /> },
      { id: 'install-failed', title: 'The install didn’t finish, the button becomes Fix', wide: true, render: () => <Still cause="developer_tools_missing" stalled="git" /> },
      { id: 'ports-busy', title: 'Onlook can’t close another app, so Fix', wide: true, render: () => <Still cause="no_free_port" /> },
      { id: 'helper-failed', title: 'The helper didn’t start', wide: true, render: () => <Still cause="helper_failed" /> },
      { id: 'unconfirmed', title: 'A check can’t answer, Continue stays on', wide: true, render: () => <Still unconfirmedIds={['port']} /> },
      { id: 'inconclusive', title: 'Every check inconclusive', wide: true, render: () => <Still inconclusive /> },
      { id: 'unanswered', title: 'The checks could not be run', wide: true, render: () => <Still unanswered notice="machine.unavailable" /> },
      { id: 'folder-fixed', title: 'Existing Projects keep their folder', wide: true, render: () => <Still cause="workspace_not_writable" fixedFolder /> },
      { id: 'git-not-found', title: 'Git missing where Onlook has no installer', wide: true, render: () => <Still cause="git_not_found" platform="linux" /> },
      { id: 'folder-error', title: 'Folder could not be changed', wide: true, render: () => <Still cause="workspace_not_writable" notice="machine.folderUnavailable" /> },
      { id: 'compact-split', title: 'Split onboarding at the window’s floor', wide: true, render: () => <Still failures={{ git: 'developer_tools_missing', workspace: 'workspace_not_writable' }} split /> },
    ] },
    { id: 'detail', title: 'One check on its own', stories: [
      { id: 'detail-tools', title: 'Developer tools didn’t install', wide: true, render: () => <Still cause="developer_tools_missing" stalled="git" detail="git" /> },
      { id: 'detail-ports', title: 'Another app is using the preview ports', wide: true, render: () => <Still cause="no_free_port" detail="port" /> },
      { id: 'detail-checking', title: 'Check again, checking', wide: true, render: () => <Still cause="no_free_port" detail="port" acting={{ id: 'port', kind: 'fix' }} /> },
      { id: 'detail-again', title: 'Check again too early: still in use', wide: true, render: () => <Still cause="no_free_port" detail="port" notice="machine.detail.port.again" /> },
      { id: 'detail-helper', title: 'The helper didn’t start', wide: true, render: () => <Still cause="helper_failed" detail="helper" /> },
      { id: 'detail-license', title: 'Git needs the Xcode license', wide: true, render: () => <Still cause="git_license_unaccepted" detail="git" /> },
      { id: 'detail-config', title: 'Onlook can’t read your Git settings', wide: true, render: () => <Still cause="git_config_invalid" detail="git" /> },
      { id: 'detail-git-failed', title: 'Git couldn’t create a project', wide: true, render: () => <Still cause="git_failed" detail="git" /> },
      { id: 'detail-folder', title: 'Onlook can’t save to this folder', wide: true, render: () => <Still cause="workspace_not_writable" fixedFolder detail="workspace" /> },
      { id: 'detail-permission', title: 'Onlook isn’t allowed to save files here', wide: true, render: () => <Still cause="permission_denied" fixedFolder detail="workspace" /> },
      { id: 'detail-disk', title: 'Your disk is full', wide: true, render: () => <Still cause="disk_full" fixedFolder detail="workspace" /> },
      { id: 'detail-git-not-found', title: 'Git isn’t installed', wide: true, render: () => <Still cause="git_not_found" platform="linux" detail="git" /> },
      { id: 'detail-focus', title: 'Check again focused', wide: true, render: () => <Still cause="no_free_port" detail="port" focus /> },
      { id: 'detail-agents', title: 'The prompt, and both agents to paste it into', wide: true, render: () => <Still cause="developer_tools_missing" stalled="git" detail="git" agents={['claude', 'codex']} /> },
      { id: 'detail-one-agent', title: 'The prompt, and the one agent connected', wide: true, render: () => <Still cause="developer_tools_missing" stalled="git" detail="git" agents={['claude']} /> },
    ] },
    { id: 'prototype', title: 'In the prototype’s own window', stories: [
      { id: 'proto-two-failures', title: 'Two checks need something', wide: true, render: () => <Still proto failures={{ git: 'developer_tools_missing', workspace: 'workspace_not_writable' }} /> },
      { id: 'proto-installing', title: 'The row spins while it installs', wide: true, render: () => <Still proto failures={{ git: 'developer_tools_missing', workspace: 'workspace_not_writable' }} acting={{ id: 'git', kind: 'install' }} /> },
      { id: 'proto-all-ready', title: 'All four ready', wide: true, render: () => <Still proto /> },
      { id: 'proto-detail-tools', title: 'Developer tools didn’t install', wide: true, render: () => <Still proto cause="developer_tools_missing" stalled="git" detail="git" agents={['claude', 'codex']} /> },
      { id: 'proto-detail-ports', title: 'Another app is using the preview ports', wide: true, render: () => <Still proto cause="no_free_port" detail="port" /> },
      { id: 'proto-detail-again', title: 'Check again too early', wide: true, render: () => <Still proto cause="no_free_port" detail="port" notice="machine.detail.port.again" /> },
      { id: 'proto-unconfirmed', title: 'A check can’t answer', wide: true, render: () => <Still proto unconfirmedIds={['port']} /> },
    ] },
  ],
};
