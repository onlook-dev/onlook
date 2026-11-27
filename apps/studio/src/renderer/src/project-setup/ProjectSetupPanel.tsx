import { projectSetupAskKind, type ProjectSetupAskKind, type ProjectSetupFailure, type ProjectSetupSnapshot, type TabStatus } from '@studio/events';
import { Button } from '@astryxdesign/core/Button';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Token } from '@astryxdesign/core/Token';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { StatusDot } from '../chrome/StatusDot.js';
import { STATUS_DOT_SIZE } from '../chrome/tabs/geometry.js';
import { t, type StringKey } from '@studio/i18n';
import { setupFailure, setupHeader, setupRunAction, setupSteps, type SetupHeader, type SetupStep } from './state.js';
import type { AskState } from './store.js';

const ASK: Record<ProjectSetupAskKind, { label: StringKey; status: Record<Exclude<AskState, 'idle'>, StringKey> }> = {
  setup: {
    label: 'projectSetup.ask.setup',
    status: {
      sending: 'projectSetup.ask.setup.sending', sent: 'projectSetup.ask.setup.sent',
      busy: 'projectSetup.ask.setup.busy', unavailable: 'projectSetup.ask.setup.unavailable',
    },
  },
  repair: {
    label: 'projectSetup.ask.repair',
    status: {
      sending: 'projectSetup.ask.repair.sending', sent: 'projectSetup.ask.repair.sent',
      busy: 'projectSetup.ask.repair.busy', unavailable: 'projectSetup.ask.repair.unavailable',
    },
  },
};

const STAGE: Record<ProjectSetupFailure['stage'], StringKey> = {
  prepare: 'projectSetup.stage.prepare', install: 'projectSetup.stage.install',
  start: 'projectSetup.stage.start', ready: 'projectSetup.stage.ready', stop: 'projectSetup.stage.stop',
};

const STEP_STATUS: Record<TabStatus, StringKey> = {
  working: 'projectSetup.step.working', done: 'projectSetup.step.done', waiting: 'projectSetup.step.waiting',
};

/** Above the longest script a step is expected to carry, so the toggle appears only on a genuinely long one. */
const SCRIPT_COLLAPSE_LINES = 14;

/** Drops the dot onto the baseline of the line beside it, which the header and a step row set differently. */
const HEADER_DOT_TOP = 15;
const STEP_DOT_TOP = 11;

function stepLabel(step: SetupStep): string {
  if (step.kind === 'prepare') return t('projectSetup.preparation');
  if (step.kind === 'install') return t('projectSetup.installation');
  return t('projectSetup.server', { name: step.id });
}

function stepTestId(step: SetupStep): string {
  if (step.kind === 'prepare') return 'project-setup-preparation';
  if (step.kind === 'install') return 'project-setup-install';
  return `project-setup-server-${step.id}`;
}

function Script({ label, code, testId }: { label: string; code: string; testId: string }): React.JSX.Element {
  return <CodeBlock code={code} title={label} width="100%" isWrapped isCollapsible
    collapsibleThreshold={SCRIPT_COLLAPSE_LINES} data-testid={testId} />;
}

function ScriptBlock({ label, script, testId }: { label: string; script: string; testId: string }): React.JSX.Element {
  if (script === '') {
    return <VStack gap={1} style={{ minWidth: 0 }}>
      <Text size="sm" weight="medium">{label}</Text>
      <Text size="xsm" color="secondary" data-testid={testId}>{t('projectSetup.noCommand')}</Text>
    </VStack>;
  }
  return <Script label={label} code={script} testId={testId} />;
}

function ChipRow({ label, paths, testId }: { label: string; paths: readonly string[]; testId: string }): React.JSX.Element {
  return <VStack gap={1} style={{ minWidth: 0 }} data-testid={testId}>
    <Text size="xsm" color="secondary">{label}</Text>
    {paths.length === 0
      ? <Text size="xsm" color="secondary">{t('projectSetup.none')}</Text>
      : <HStack gap={1} wrap="wrap" style={{ minWidth: 0 }}>
        {paths.map((path) => <Token key={path} label={path} size="sm" />)}
      </HStack>}
  </VStack>;
}

/** A step main has not reached yet: the rail's own ink, so the sequence keeps its spine without a fourth status ink. */
function StepNode({ step }: { step: SetupStep }): React.JSX.Element {
  const testId = `${stepTestId(step)}-status`;
  if (step.tone === null) {
    return <span data-testid={testId} style={{
      width: STATUS_DOT_SIZE, height: STATUS_DOT_SIZE, borderRadius: '50%',
      background: 'var(--color-border-emphasized)',
    }} />;
  }
  return <StatusDot testId={testId} gap={0} status={step.tone} label={t(STEP_STATUS[step.tone])} />;
}

/** The rail's column and the content column, so anything below the sequence keeps the steps' left edge. */
const STEP_GRID: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: `${String(STATUS_DOT_SIZE)}px 1fr`,
  columnGap: 'var(--spacing-3)', minWidth: 0,
};

function StepRow({ step, isFirst, isLast, children }: {
  step: SetupStep; isFirst: boolean; isLast: boolean; children: React.ReactNode;
}): React.JSX.Element {
  const rail = 'var(--color-border)';
  return <div style={STEP_GRID}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 1, height: STEP_DOT_TOP, background: isFirst ? 'transparent' : rail }} />
      <StepNode step={step} />
      <div style={{ flex: 1, width: 1, background: isLast ? 'transparent' : rail }} />
    </div>
    <VStack gap={2} style={{ minWidth: 0, paddingBottom: isLast ? 0 : 'var(--spacing-4)' }}>{children}</VStack>
  </div>;
}

function FailureBlock({ failure }: { failure: ProjectSetupFailure }): React.JSX.Element {
  return <VStack gap={2} data-testid="project-setup-failure" style={{ minWidth: 0 }}>
    <Text weight="medium" size="sm">{t('projectSetup.failure', { stage: t(STAGE[failure.stage]) })}</Text>
    {failure.serverId === undefined ? null
      : <Text size="xsm" color="secondary">{t('projectSetup.failedServer', { name: failure.serverId })}</Text>}
    <Text size="sm" style={{ overflowWrap: 'anywhere', userSelect: 'text' }}>{failure.reason}</Text>
    <Text size="xsm" color="secondary">{t('projectSetup.failureDetails', {
      exit: failure.exitCode === undefined ? t('projectSetup.noExit') : String(failure.exitCode),
      signal: failure.signal ?? t('projectSetup.noSignal'), elapsed: String(failure.elapsedMs),
    })}</Text>
    <Script label={t('projectSetup.failedCommand')} code={failure.command} testId="project-setup-failed-command" />
    {failure.outputTail === '' ? null
      : <Script label={t('projectSetup.output')} code={failure.outputTail} testId="project-setup-output" />}
  </VStack>;
}

function HeaderDot({ header }: { header: SetupHeader }): React.JSX.Element {
  return <span style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    /* `start`: a stretched grid cell would centre the dot down the whole header, not on its first line. */
    alignSelf: 'start', width: STATUS_DOT_SIZE, paddingTop: HEADER_DOT_TOP,
  }}>
    <StatusDot testId="project-setup-status" gap={0} label={t(header.headline)}
      {...(header.tone === null ? {} : { status: header.tone })} />
  </span>;
}

export interface ProjectSetupPanelProps {
  snapshot: ProjectSetupSnapshot | null;
  readFailed?: boolean;
  ask?: AskState;
  /** The canvas run control's own fact, so the two surfaces cannot offer opposite presses (ONL-2499). */
  isServerLive?: boolean;
  onRun: (press: 'start' | 'stop') => void;
  onAsk: () => void;
}

/** A plain heading, never `DialogHeader`: that one stamps the enclosing modal's title id onto a section (ONL-2499). */
function SectionHeader({ header }: { header: SetupHeader }): React.JSX.Element {
  return <div style={STEP_GRID}>
    <HeaderDot header={header} />
    <VStack gap={0} style={{ minWidth: 0 }}>
      <Heading level={2}>{t(header.headline)}</Heading>
      {header.detail === null ? null
        : <Text type="body" size="sm" color="secondary">{t(header.detail)}</Text>}
    </VStack>
  </div>;
}

export function ProjectSetupBody({ snapshot, readFailed = false, ask = 'idle', isServerLive = false, onRun, onAsk }: ProjectSetupPanelProps): React.JSX.Element {
  const header = setupHeader(snapshot, readFailed);
  const steps = snapshot === null ? [] : setupSteps(snapshot);
  const install = snapshot?.saved?.definition.install;
  const failure = setupFailure(snapshot);
  const run = setupRunAction(snapshot, isServerLive);
  const askKind = snapshot === null ? null : projectSetupAskKind(snapshot);
  return <VStack gap={4} style={{ minWidth: 0 }} data-testid="project-setup-panel" data-setup-state={header.state}>
    <SectionHeader header={header} />
    {(snapshot?.portMoves ?? []).map((move) => <div key={move.from} style={STEP_GRID}>
      <div />
      <Text size="sm" color="secondary" role="status" data-testid="project-setup-port-moved">{t('projectSetup.portMoved', move)}</Text>
    </div>)}
    {/* A changed heading is not announced; this line is. */}
    <VisuallyHidden><Text role="status" data-testid="project-setup-status-text">{t(header.headline)}</Text></VisuallyHidden>
    {steps.map((step, index) => <StepRow key={`${step.kind}-${step.id}`} step={step}
      isFirst={index === 0} isLast={index === steps.length - 1}>
      <ScriptBlock label={stepLabel(step)} script={step.script} testId={stepTestId(step)} />
      {step.kind === 'install' && install !== undefined ? <>
        <ChipRow label={t('projectSetup.installInputs')} paths={install.inputs} testId="project-setup-install-inputs" />
        <ChipRow label={t('projectSetup.installOutputs')} paths={install.outputs} testId="project-setup-install-outputs" />
      </> : null}
      {step.server === undefined ? null : <Text size="xsm" color="secondary" style={{ overflowWrap: 'anywhere' }}>
        {t('projectSetup.serverDetails', { cwd: step.server.cwd, port: String(step.server.port) })}
      </Text>}
    </StepRow>)}
    {failure === null ? null : <div style={STEP_GRID}>
      <div />
      <FailureBlock failure={failure} />
    </div>}
    {run === null && askKind === null ? null : <div style={STEP_GRID}>
      <div />
      <VStack gap={2}>
        <HStack hAlign="end" gap={2}>
          {run === null ? null : <Button label={t(run.label)} variant={askKind === null ? 'primary' : 'secondary'}
            isDisabled={run.isDisabled} onClick={() => { onRun(run.press); }} data-testid="project-setup-run" />}
          {askKind === null ? null : <Button label={t(ASK[askKind].label)} variant="primary"
            isDisabled={ask === 'sending'} onClick={onAsk} data-testid="project-setup-ask" />}
        </HStack>
        {askKind !== null && ask !== 'idle'
          ? <Text size="xsm" color="secondary" role="status" data-testid="project-setup-ask-status">{t(ASK[askKind].status[ask])}</Text>
          : null}
      </VStack>
    </div>}
  </VStack>;
}
