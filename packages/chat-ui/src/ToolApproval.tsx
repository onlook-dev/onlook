import type { ReactNode } from 'react';
import type { IconType } from '@astryxdesign/core/Icon';
import { Button } from '@astryxdesign/core/Button';
import { VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { asksQuestion } from '@studio/events';
import type { PermissionOption, QuestionAnswers, QuestionAnswerInput, ToolCallView } from '@studio/events';
import { baseName, classifyToolCalls, type ToolLineContext } from './tool-rows/classify.js';
import { ToolRow, type ToolRowProps } from './tool-rows/ToolRow.js';
import type { ChatStrings } from './strings.js';

type Permission = NonNullable<ToolCallView['permission']>;
export type RespondToPermission = (requestId: string, optionId: string, answers?: QuestionAnswers, input?: QuestionAnswerInput, wentBack?: boolean) => void | Promise<boolean>;

export function legendFor(permission: Permission): 'toolAwaitingAnswer' | 'toolAwaitingApproval' {
  return asksQuestion(permission.questions) ? 'toolAwaitingAnswer' : 'toolAwaitingApproval';
}

/** A call that is genuinely actionable right now — `stale` requests are not. */
export function isAwaitingApproval(call: ToolCallView): boolean {
  return (
    call.displayStatus === 'awaiting_approval' &&
    call.permission != null &&
    !call.permission.stale
  );
}

/** Kinds whose target is a path, so a basename is the informative half. */
const PATH_KINDS = new Set(['read', 'edit', 'delete', 'move']);

/** A real `<fieldset>`/`<legend>`: the legend notches the border natively at any label length, font and zoom. */
export function ApprovalRequest({
  call,
  strings,
  chevronIcon,
  onRespond,
  lines,
}: {
  call: ToolCallView;
  strings: ChatStrings;
  chevronIcon: IconType;
  onRespond: RespondToPermission;
  lines?: ToolLineContext;
}): ReactNode {
  const permission = call.permission;
  if (!permission) return null;

  return (
    <VStack
      as="fieldset"
      gap={2}
      padding={3}
      data-testid="permission-request"
      data-request-id={permission.requestId}
      style={{
        border: 'var(--border-width) solid var(--color-border)',
        borderRadius: 'var(--radius-container)',
        /* A fieldset's `min-inline-size: min-content` would push a long path out through the panel's clip. */
        margin: 0,
        minInlineSize: 0,
      }}
    >
      <legend
        style={{
          paddingInline: 'var(--spacing-1)',
          /* A legend is not a flex child: `alignSelf` does nothing, `auto` margins centre it. */
          marginInline: 'auto',
          /* Seats the ink on the stroke; `text-box: trim-both` would shear the descender. */
          lineHeight: 1,
        }}
      >
        <Text type="supporting" size="xsm">
          {strings[legendFor(permission)]}
        </Text>
      </legend>
      {/* The product's words for the class, above the command: consent is not read off model-written text (ONL-2190). */}
      {permission.destructiveClass !== undefined && (
        <Text type="body" style={{ textWrap: 'pretty' }} data-testid="permission-destructive">
          {strings.destructiveClasses[permission.destructiveClass]}
        </Text>
      )}
      {/* An empty `questions` array degrades to approve/deny, and that shape still needs its subject. */}
      {!asksQuestion(permission.questions) && (
        <ToolRow
          {...subjectRowFor(call, lines ?? { strings: strings.toolLines, nameOf: () => undefined }, strings.toolVerbs)}
          chevronIcon={chevronIcon}
          strings={strings.toolRows}
        />
      )}
      {call.name.startsWith('mcp__') && permission.description && (
        <Text type="body" style={{ textWrap: 'pretty' }}>
          {permission.description}
        </Text>
      )}
      <PermissionActions call={call} onRespond={onRespond} />
    </VStack>
  );
}

export type SubjectRow = Pick<ToolRowProps, 'verb' | 'target' | 'status' | 'detail' | 'defaultOpen'>;

/** Verb over basename, `completed` rather than `running`: the request is parked on the user, not underway. */
export function subjectRowFor(call: ToolCallView, lines: ToolLineContext, verbs: ChatStrings['toolVerbs']): SubjectRow {
  const shell = shellSubject(call);
  const said = spokenSubject(call, lines, verbs);
  if (shell) {
    return {
      verb: said.verb,
      ...(shell.description ? { target: shell.description } : {}),
      status: 'completed',
      detail: { kind: 'shell', command: shell.command },
      defaultOpen: true,
    };
  }

  const target = call.target;
  if (call.name.startsWith('mcp__')) {
    const input = call.input as { arguments?: unknown } | undefined;
    return {
      verb: said.verb,
      ...(said.target !== undefined ? { target: said.target } : {}),
      status: 'completed',
      detail: { kind: 'raw', text: JSON.stringify(input?.arguments ?? call.input ?? {}, null, 2) },
      defaultOpen: true,
    };
  }
  const isPath = target != null && PATH_KINDS.has(call.kind) && target.includes('/');
  if (!isPath) {
    return { verb: said.verb, ...(said.target !== undefined ? { target: said.target } : {}), status: 'completed' };
  }

  return {
    verb: said.verb,
    ...(target != null && target !== '' ? { target: isPath ? baseName(target) : target } : {}),
    status: 'completed',
    ...(isPath ? { detail: { kind: 'file' as const, path: target } } : {}),
  };
}

/** The call's own line as it would read once approved and running; the card is where it parks, so the row above it is gone. */
function spokenSubject(call: ToolCallView, lines: ToolLineContext, verbs: ChatStrings['toolVerbs']): { verb: string; target?: string } {
  const running: ToolCallView = { ...call, displayStatus: 'in_progress' };
  const node = classifyToolCalls([running], lines)[0];
  if (node === undefined || node.kind === 'answered' || node.kind === 'dismissed') return { verb: lines.strings.other.running };
  if (node.kind === 'row') {
    const verb = node.sentence ?? verbs[node.verb].running;
    return node.target === undefined || node.target === '' ? { verb } : { verb, target: node.target };
  }
  if (node.kind === 'file') return { verb: verbs[node.verb].running, target: node.fileName };
  return { verb: verbs[node.verb].running };
}

/** A command is approved by what it would run, so the card shows all of it, open (ONL-2285). */
function shellSubject(call: ToolCallView): { command: string; description?: string } | undefined {
  if (call.name !== 'Bash') return undefined;
  const input = (call.input ?? {}) as { command?: unknown; description?: unknown };
  const command = typeof input.command === 'string' && input.command !== '' ? input.command : call.target;
  if (command == null || command === '') return undefined;
  const description = typeof input.description === 'string' && input.description !== '' ? input.description : undefined;
  return { command, ...(description ? { description } : {}) };
}

function PermissionActions({
  call,
  onRespond,
}: {
  call: ToolCallView;
  onRespond: RespondToPermission;
}): ReactNode {
  const permission = call.permission;
  if (!permission) return null;

  /* By position, not `kind`: the SDK's kinds are not a closed set. */
  const [lead, ...rest] = permission.options;
  if (!lead) return null;

  return (
    <VStack gap={1}>
      <Button
        style={WRAPPING_LABEL}
        label={lead.label}
        size="sm"
        variant="primary"
        onClick={() => onRespond(permission.requestId, lead.optionId)}
        data-testid={handleFor(lead)}
      />
      {/* A row each, sized by the column's own stretch: a persistent row names the rule it writes, and needs the width to read it (ONL-2562). */}
      {rest.map((option) => (
        <Button
          key={option.optionId}
          style={WRAPPING_LABEL}
          label={option.label}
          size="sm"
          variant="secondary"
          onClick={() => onRespond(permission.requestId, option.optionId)}
          data-testid={handleFor(option)}
        />
      ))}
    </VStack>
  );
}

/** Astryx sizes a button to one clipped line; a label the model or a rule wrote can run to several. */
const WRAPPING_LABEL = {
  height: 'auto',
  minHeight: 'var(--size-element-sm, 28px)',
  paddingBlock: 'var(--spacing-1)',
  whiteSpace: 'normal',
  textAlign: 'start',
  overflowWrap: 'anywhere',
} as const;

/** The persistent row carries its own handle; two buttons under one is a strict-mode trap. */
export function handleFor(option: PermissionOption): string {
  if (option.kind === 'reject_once') return 'permission-deny';
  return option.kind === 'allow_always' ? 'permission-allow-always' : 'permission-allow';
}
