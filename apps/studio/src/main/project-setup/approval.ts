import { STUDIO_MCP_SERVER, STUDIO_TOOL_NAMES, STUDIO_TOOLS, type StudioToolName } from '../agent-host/tool-names.js';
import { projectSetupService } from './service.js';
import { INVALID_RECORD_REVISION } from './state.js';

export type WithheldSetupTool = {
  [Name in StudioToolName]: (typeof STUDIO_TOOLS)[Name]['approval'] extends 'card-once-setup-verified' ? Name : never;
}[StudioToolName];

const SETUP_TOOLS: readonly WithheldSetupTool[] = STUDIO_TOOL_NAMES.filter(
  (name): name is WithheldSetupTool => STUDIO_TOOLS[name].approval === 'card-once-setup-verified',
);

const MCP_PREFIX = `mcp__${STUDIO_MCP_SERVER}__`;

/**
 * A project with no verified setup gets its first one saved and run without a card (ONL-2499).
 * Accepted with the card gone, no reason left that names it safe: `prepare`, `install.script` and `servers[].start` are POSIX shell constrained by path, length, count and port and never by command content, and they run as the user.
 */
export function withheldSetupTool(cwd: string, toolName: string): WithheldSetupTool | undefined {
  const bare = toolName.startsWith(MCP_PREFIX) ? toolName.slice(MCP_PREFIX.length) : toolName;
  const tool = SETUP_TOOLS.find((name) => name === bare);
  if (tool === undefined) return undefined;
  try {
    const snapshot = projectSetupService().readStored(cwd);
    if (snapshot.verified !== null) return undefined;
    return snapshot.failure?.revision === INVALID_RECORD_REVISION ? undefined : tool;
  } catch {
    return undefined;
  }
}
