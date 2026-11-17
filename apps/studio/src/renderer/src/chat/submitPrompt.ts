import type {
  AgentCommandAcceptance,
  ArtifactAttachment,
  ElementEvidence,
  FrameAttachment,
  ImageRef,
  ChatFileRef,
  SkillAttachment,
  PromptAttachment,
} from '@studio/events';
import {
  selectedObjects,
  selectionEvidence,
  selectionFrameIdentity,
  type ElementSelection,
  type SelectedNodeFacts,
  type SelectedObject,
} from '../canvas/selection.js';

export interface PromptFrameContext {
  selectedFrameIds: readonly string[];
  frameName: (frameNodeId: string) => string | undefined;
  /** Kind-aware; absent, every selected id is a frame, which is all the element-picked flow selects (ONL-2486). */
  nodeAt?: (nodeId: string) => SelectedNodeFacts | undefined;
}

export interface PromptAssemblyInput {
  text: string;
  images: readonly ChatFileRef[];
  skills?: readonly SkillAttachment[];
  elementSelections: readonly ElementSelection[];
  frames: PromptFrameContext;
  /** The selected pictures, already resolved to references that carry bytes (ONL-2486). */
  canvasImages?: readonly ImageRef[];
  artifacts?: readonly ArtifactAttachment[];
  /** Reaches the model after the frame identity; the chat never renders it (ONL-2960). */
  context?: string;
}

function promptSelectedObjects(frames: PromptFrameContext): SelectedObject[] {
  const nodeAt =
    frames.nodeAt ??
    ((id: string): SelectedNodeFacts | undefined => {
      const name = frames.frameName(id);
      return name === undefined ? undefined : { kind: 'browser', name, label: name };
    });
  return selectedObjects(frames.selectedFrameIds, nodeAt);
}

export interface AssembledPrompt {
  text: string;
  attachments: PromptAttachment[];
  context: string;
  /** The snapshot this send owns, so a caller clears exactly what went out and nothing admitted while it was pending. */
  images: ChatFileRef[];
  skills?: SkillAttachment[];
  evidence: ElementEvidence[];
  artifacts?: ArtifactAttachment[];
}

export function assemblePrompt(input: PromptAssemblyInput): AssembledPrompt | null {
  const text = input.text.trim();
  const images = [...input.images];
  const evidence = selectionEvidence(input.elementSelections);
  const objects = promptSelectedObjects(input.frames);
  const artifacts = [...new Map([...(input.artifacts ?? []), ...objects.flatMap((object) => object.kind === 'artifact' && object.artifactId !== undefined ? [{ kind: 'artifact' as const, artifactId: object.artifactId, title: object.name, ...(object.pagePath === undefined ? {} : { pagePath: object.pagePath }) }] : [])].map((artifact) => [`${artifact.artifactId}:${artifact.pagePath ?? ''}`, artifact])).values()];
  const skills = [...(input.skills ?? [])];
  if (!text && images.length === 0 && skills.length === 0 && evidence.length === 0 && artifacts.length === 0) return null;
  const context = [selectionFrameIdentity(input.elementSelections, input.frames.frameName, objects), input.context?.trim() ?? '']
    .filter((part) => part !== '')
    .join('\n\n');
  // Display data only; main never forwards frame attachments to the SDK. A picture is not one: its reference carries bytes (ONL-2486).
  const frameRefs: FrameAttachment[] = objects.flatMap((object) =>
    object.kind === 'image' || object.kind === 'artifact'
      ? []
      : [{ kind: 'frame', name: object.label, ...(object.kind === 'text' ? { object: 'text' } : {}) }],
  );
  const canvasImages = [...(input.canvasImages ?? [])];

  return {
    text,
    attachments: [...images, ...canvasImages, ...evidence, ...frameRefs, ...artifacts, ...skills],
    context,
    images,
    ...(skills.length > 0 ? { skills } : {}),
    evidence,
    ...(artifacts.length === 0 ? {} : { artifacts }),
  };
}

export interface PromptSubmitDeps {
  send: (
    text: string,
    attachments: PromptAttachment[],
    context: string,
  ) => Promise<AgentCommandAcceptance>;
  /** Held by the caller across renders; only `submitPrompt` sets and clears it. */
  inFlight: { current: boolean };
  /** Reads a selected picture's stored bytes for their media type; nothing selected asks nothing (ONL-2486). */
  canvasImage?: (imageId: string) => Promise<ImageRef | null>;
}

export type PromptSubmitResult =
  /** `held` is main's pen taking it rather than the agent, so nothing was delivered (ONL-2294). */
  | { outcome: 'accepted'; submitted: AssembledPrompt; held: boolean }
  | { outcome: 'rejected' | 'failed' | 'empty' | 'in-flight' };

/** The bytes are read at send time, for the selected pictures only: an unselected one reaches no prompt (ONL-2486). */
async function canvasImageRefs(
  input: PromptAssemblyInput,
  deps: PromptSubmitDeps,
): Promise<ImageRef[]> {
  const resolve = deps.canvasImage;
  if (resolve === undefined) return [];
  const imageIds = promptSelectedObjects(input.frames).flatMap((object) =>
    object.kind === 'image' && object.imageId !== undefined ? [object.imageId] : [],
  );
  if (imageIds.length === 0) return [];
  const resolved = await Promise.all(imageIds.map((imageId) => resolve(imageId)));
  return resolved.filter((ref): ref is ImageRef => ref !== null);
}

export async function submitPrompt(
  input: PromptAssemblyInput,
  deps: PromptSubmitDeps,
): Promise<PromptSubmitResult> {
  if (deps.inFlight.current) return { outcome: 'in-flight' };
  // Raised before the first await: reading a picture's bytes is one, and a second submit across it would send twice (ONL-2455).
  deps.inFlight.current = true;
  try {
    const assembled = assemblePrompt({ ...input, canvasImages: await canvasImageRefs(input, deps) });
    if (assembled === null) return { outcome: 'empty' };
    const result = await deps.send(assembled.text, assembled.attachments, assembled.context);
    return result.accepted
      ? { outcome: 'accepted', submitted: assembled, held: result.held === true }
      : { outcome: 'rejected' };
  } catch {
    return { outcome: 'failed' };
  } finally {
    deps.inFlight.current = false;
  }
}
