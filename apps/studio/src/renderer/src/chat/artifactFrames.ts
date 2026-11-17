import { isArtifactNode, type CanvasNode } from '@studio/events';
import { canvasNodeLabeller, type Translate } from '../nodeLabel.js';
import { canvasNodeLabelFacts } from '../canvas/selection.js';

/** The resolved label, not `name`, which is blank until the user renames the node (ONL-2568). */
export function artifactFrameNames(nodes: readonly CanvasNode[], translate: Translate, artifactTitles?: ReadonlyMap<string, string>): string {
  const labelOf = canvasNodeLabeller(nodes.map(canvasNodeLabelFacts), translate, artifactTitles);
  const labels: string[] = [];
  for (const node of nodes) {
    if (!isArtifactNode(node)) continue;
    const label = labelOf(canvasNodeLabelFacts(node));
    // An empty label names nothing, so it would make every unnamed chip an artifact.
    if (label !== '') labels.push(label);
  }
  return labels.join('\n');
}
