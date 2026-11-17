import { describe, expect, it } from 'bun:test';
import { APPSERVER_APPROVAL_TOOLS } from './appserver/tools.js';
import { STUDIO_AUTO_APPROVED_TOOLS, STUDIO_MCP_SERVER, STUDIO_TOOL_NAMES, STUDIO_TOOLS } from './tool-names.js';

const RUNS_WITHOUT_A_CARD = [
  'capture_frame',
  'clear_frame_quote',
  'create_artifact',
  'create_frame',
  'create_image',
  'create_page',
  'create_project_tab',
  'create_section',
  'create_text',
  'duplicate_frames',
  'evaluate_in_frame',
  'fork_artifact',
  'frame_working',
  'get_project_setup',
  'import_artifact',
  'list_frames',
  'list_pages',
  'move_frame',
  'move_frames',
  'move_nodes_to_page',
  'place_artifact',
  'read_artifact',
  'read_frame',
  'remove_frame',
  'remove_frames',
  'rename_frame',
  'rename_page',
  'rename_project',
  'reorder_frame',
  'reorder_page',
  'server_running',
  'set_artifact',
  'set_frame_url',
  'set_text',
  'suggest_next_tasks',
  'waiting_on',
];

const ASKS_FIRST = ['delete_page', 'delete_project_file', 'redo_canvas', 'save_attachment', 'undo_canvas'];

const ASKS_ONCE_SETUP_IS_VERIFIED = ['run_project_setup', 'save_project_setup'];

const namesAsking = (approval: string): string[] =>
  STUDIO_TOOL_NAMES.filter((name) => STUDIO_TOOLS[name].approval === approval).sort();

describe('which Studio tools run without an approval card', () => {
  it('auto-approves exactly these tools on Claude', () => {
    expect([...STUDIO_AUTO_APPROVED_TOOLS].sort()).toEqual(RUNS_WITHOUT_A_CARD.map((name) => `mcp__${STUDIO_MCP_SERVER}__${name}`));
  });

  it('asks on codex for every other tool, and for no tool Claude auto-approves', () => {
    expect([...APPSERVER_APPROVAL_TOOLS].sort()).toEqual([...ASKS_FIRST, ...ASKS_ONCE_SETUP_IS_VERIFIED].sort());
  });

  it('gives each tool one approval class', () => {
    expect(namesAsking('auto')).toEqual(RUNS_WITHOUT_A_CARD);
    expect(namesAsking('card')).toEqual(ASKS_FIRST);
    expect(namesAsking('card-once-setup-verified')).toEqual(ASKS_ONCE_SETUP_IS_VERIFIED);
  });
});
