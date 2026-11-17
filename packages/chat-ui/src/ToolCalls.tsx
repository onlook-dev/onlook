import { Fragment, type ReactNode } from 'react';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import type { IconType } from '@astryxdesign/core/Icon';
import type { ToolCallView } from '@studio/events';
import { ApprovalRequest, isAwaitingApproval, type RespondToPermission } from './ToolApproval.js';
import { classifyToolCalls, type ToolLineContext } from './tool-rows/classify.js';
import { isHiddenLine, type CanvasNameOf } from './tool-rows/lines.js';
import { ToolFileRow } from './tool-rows/ToolFileRow.js';
import { ToolGroupedCommands } from './tool-rows/ToolGroupedCommands.js';
import { ToolGroupedFiles } from './tool-rows/ToolGroupedFiles.js';
import { ToolRow } from './tool-rows/ToolRow.js';
import { ImageThumbnail, type ResolveImage } from './ImageThumbnail.js';
import { AnsweredQuestions } from './AnsweredQuestions.js';
import { DismissedQuestions } from './DismissedQuestions.js';
import { asksQuestion } from '@studio/events';
import type { ChatStrings } from './strings.js';
import type { ToolFrameLinks } from './tool-rows/types.js';

export interface ToolCallsProps {
  calls: ToolCallView[];
  strings: ChatStrings;
  chevronIcon: IconType;
  onRespond: RespondToPermission;
  resolveImage?: ResolveImage;
  canvasNameOf?: CanvasNameOf;
  frameLinks?: ToolFrameLinks;
}

const NO_NAMES: CanvasNameOf = () => undefined;

/** A call that leaves nothing in the column at all: no row, no card, no answer, no picture. */
export function leavesNoTrace(call: ToolCallView, lines: ToolLineContext): boolean {
  return isHiddenLine(call, lines.nameOf) && !isAwaitingApproval(call) && call.answeredQuestions === undefined && call.dismissedQuestions === undefined && (call.images?.length ?? 0) === 0;
}

export function toolLineContext(strings: ChatStrings, canvasNameOf: CanvasNameOf | undefined): ToolLineContext {
  return { strings: strings.toolLines, nameOf: canvasNameOf ?? NO_NAMES };
}

export function ToolCalls({
  calls,
  strings,
  chevronIcon,
  onRespond,
  resolveImage,
  canvasNameOf,
  frameLinks,
}: ToolCallsProps): ReactNode {
  const pending = calls.filter((call) => isAwaitingApproval(call) && !asksQuestion(call.permission?.questions));
  const lines = toolLineContext(strings, canvasNameOf);
  const nodes = classifyToolCalls(calls, lines);
  const rowStrings = strings.toolRows;

  const say = (verb: keyof typeof strings.toolVerbs, running: boolean): string =>
    running ? strings.toolVerbs[verb].running : strings.toolVerbs[verb].done;

  const imagesByCall = new Map(
    calls.filter((c) => c.images && c.images.length > 0).map((c) => [c.toolCallId, c.images ?? []]),
  );
  const thumbnails = (images: NonNullable<ToolCallView['images']>): ReactNode =>
    resolveImage ? (
      <HStack gap={2} style={{ flexWrap: 'wrap' }}>
        {images.map((image) => (
          <ImageThumbnail
            key={image.id}
            image={image}
            resolve={resolveImage}
            alt={strings.imageAlt}
            unavailableLabel={strings.imageUnavailable}
          />
        ))}
      </HStack>
    ) : null;

  return (
    /* Astryx's message wrapper is `align-items: flex-start`; without the width
       the approval box ends at its longest label. */
    <VStack gap={2} width="100%">
      {nodes.map((node) => {
        if (node.kind === 'answered') {
          return <AnsweredQuestions key={node.key} toolCallId={node.key} questions={node.questions} answers={node.answers} />;
        }
        if (node.kind === 'dismissed') {
          return <DismissedQuestions key={node.key} toolCallId={node.key} questions={node.questions} strings={strings.questionSheet} />;
        }
        const running = node.status === 'running';
        let row: ReactNode;
        if (node.kind === 'file') {
          row = (
            <ToolFileRow
              verb={say(node.verb, running)}
              fileName={node.fileName}
              status={node.status}
              strings={rowStrings}
            />
          );
        } else if (node.kind === 'grouped-files') {
          row = (
            <ToolGroupedFiles
              verb={say(node.verb, running)}
              fileNames={node.fileNames}
              overflow={node.overflow}
              status={node.status}
              strings={rowStrings}
            />
          );
        } else if (node.kind === 'grouped-commands') {
          row = (
            <ToolGroupedCommands
              verb={say(node.verb, running)}
              items={node.items}
              status={node.status}
              chevronIcon={chevronIcon}
              strings={rowStrings}
            />
          );
        } else {
          row = (
            <ToolRow
              verb={node.sentence ?? say(node.verb, running)}
              verbId={node.line ?? node.verb}
              {...(node.target != null && (node.sentence == null || node.line != null) ? { target: node.target } : {})}
              status={node.status}
              {...(node.detail != null ? { detail: node.detail } : {})}
              chevronIcon={chevronIcon}
              strings={rowStrings}
              {...(node.frameLink !== undefined && frameLinks !== undefined ? { frameLink: node.frameLink, frameLinks } : {})}
              {...(node.held !== undefined ? { held: node.held } : {})}
            />
          );
        }
        const images = imagesByCall.get(node.key);
        const strip = images ? thumbnails(images) : null;
        return strip ? (
          <VStack key={node.key} gap={2}>
            {row}
            {strip}
          </VStack>
        ) : (
          <Fragment key={node.key}>{row}</Fragment>
        );
      })}
      {(() => {
        const rendered = new Set(nodes.map((n) => n.key));
        const leftover = calls
          .filter((c) => imagesByCall.has(c.toolCallId) && !rendered.has(c.toolCallId))
          .flatMap((c) => c.images ?? []);
        return leftover.length > 0 ? thumbnails(leftover) : null;
      })()}
      {pending.map((call) => (
        <ApprovalRequest
          key={call.toolCallId}
          call={call}
          strings={strings}
          chevronIcon={chevronIcon}
          onRespond={onRespond}
          lines={lines}
        />
      ))}
    </VStack>
  );
}
