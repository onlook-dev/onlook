import type { IconType } from '@astryxdesign/core/Icon';

import {
  ARTIFACT_NODE_TYPE,
  SECTION_NODE_TYPE,
  FRAME_NODE_TYPE,
  IMAGE_NODE_TYPE,
  TEXT_NODE_TYPE,
  type CanvasFlowNode,
} from '../canvas/model.js';
import type { CanvasNodeLabelFacts } from '../nodeLabel.js';
import { ImageGlyph, PlaygroundGlyph, SectionGlyph, TextGlyph, WindowGlyph } from '../icons/glyphs.js';

/** The label half is shared with the composer chip; only the glyph is the list's own. */
export type DesignRowFacts = CanvasNodeLabelFacts & { currentUrl?: string };

/** An explicit dispatch: a kind this build does not know must not be read as a browser node. */
export function designRowFacts(node: CanvasFlowNode): DesignRowFacts {
  switch (node.type) {
    case SECTION_NODE_TYPE:
      return { kind: 'section', name: node.data.name };
    case TEXT_NODE_TYPE:
      return { kind: 'text', name: node.data.name, text: node.data.text };
    case IMAGE_NODE_TYPE:
      return { kind: 'image', name: node.data.name };
    case ARTIFACT_NODE_TYPE:
      return {
        kind: 'artifact',
        name: node.data.name,
        title: node.data.title,
        artifactId: node.data.artifactId,
      };
    case FRAME_NODE_TYPE:
      return { kind: 'browser', name: node.data.name, currentUrl: node.data.currentUrl };
  }
}

/** An artifact draws the playground; anything served draws the window. */
export function designRowGlyph(facts: DesignRowFacts): IconType {
  switch (facts.kind) {
    case 'section':
      return SectionGlyph;
    case 'text':
      return TextGlyph;
    case 'image':
      return ImageGlyph;
    case 'artifact':
      return PlaygroundGlyph;
    case 'browser':
      return WindowGlyph;
  }
}
