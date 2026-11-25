import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'bun:test';

const MAIN_MAP = readFileSync(fileURLToPath(new URL('./events.ts', import.meta.url)), 'utf8');
const RENDERER_MAP = readFileSync(
  fileURLToPath(new URL('../../../../../packages/events/src/telemetry.ts', import.meta.url)),
  'utf8',
);

/** The property names an event declares, in order; a nested union spanning lines declares none of its own. */
function declaredProperties(source: string, event: string): string[] {
  const start = source.indexOf(`\n  ${event}: {`);
  if (start === -1) throw new Error(`no declaration for ${event}`);
  const end = source.indexOf('\n  };', start);
  if (end === -1) throw new Error(`unterminated declaration for ${event}`);
  return [...source.slice(start, end).matchAll(/^ {4}(\w+)\??:/gm)].map((match) => match[1]!);
}

/** Every property a map declares, with the type declared on its own line; a `$`-prefixed name counts, a type spanning lines reads as none. */
function declaredPropertyTypes(
  source: string,
  map: string,
): Array<{ event: string; property: string; type: string }> {
  const start = source.indexOf(`export interface ${map} {`);
  if (start === -1) throw new Error(`no map named ${map}`);
  const end = source.indexOf('\n}', start);
  if (end === -1) throw new Error(`unterminated map ${map}`);
  const rows: Array<{ event: string; property: string; type: string }> = [];
  let event = '';
  for (const line of source.slice(start, end).split('\n')) {
    const declared = /^ {2}([\w$]+)\??:/.exec(line);
    if (declared) {
      event = declared[1]!;
      continue;
    }
    const property = /^ {4}([\w$]+)\??: *(.*?);?$/.exec(line);
    if (property) rows.push({ event, property: property[1]!, type: property[2]! });
  }
  return rows;
}

/** Every property a registered event may declare, and what each one is. */
const PERMITTED: Record<string, string> = {
  'touched_file_opened.during_turn': 'whether the file was opened during a running turn',
  action: 'an enumerated message action',
  role: 'an enumerated message role',
  steps_back: 'history steps',
  had_attachments: 'a flag',
  next_action: 'an enumerated recall outcome',
  project_id: 'the hashed source repo',
  worktreePath: "main's to swap for the hash, or drop the event",
  agent_session_id: "the host's session id",
  turn_id: "the session's turn id",
  origin: 'an enumerated prompt origin',
  harness: 'an enumerated id',
  from_harness: 'an enumerated id',
  to_harness: 'an enumerated id',
  silent_ms: 'elapsed milliseconds',
  attempted_frame_inspection: 'whether a Studio frame inspection tool was attempted',
  had_provider_stall: 'whether the turn crossed the provider silence threshold',
  dev_server_source: 'an enumerated id',
  source: 'an enumerated id',
  tip_id: 'an enumerated id: a built-in Tips prompt (ONL-2468)',
  method: 'an enumerated id',
  target: 'an enumerated id: which verb opened the code, never what it opened (ONL-2563)',
  confidence: 'an enumerated id: the mapper grade, or that it declined (ONL-2563)',
  reason: 'an enumerated id',
  size: 'an enumerated id',
  count: 'objects',
  node_count: 'objects',
  text_node_count: 'objects',
  image_node_count: 'objects',
  artifact_node_count: 'objects',
  artifact_cover_held_count: 'objects',
  artifact_snapshot_held_count: 'objects',
  outcome: 'an enumerated id',
  oldest_text_node_days: 'whole days',
  page_count: 'pages',
  non_divider_page_count: 'pages',
  oldest_page_days: 'whole days',
  ms_since_open: 'a duration',
  ms_to_lift: 'a duration',
  had_nodes: 'a flag',
  confirmed: 'a flag',
  'tour_closed.step': 'an enumerated id',
  'tour_closed.completed': 'a flag',
  became_divider: 'a flag',
  lane: 'an enumerated id',
  entry_point: 'an enumerated id',
  filed_by: 'an enumerated report transport',
  'frame_quote_placed.by': 'an enumerated placer, agent or studio',
  'frame_quote_placed.node': 'an enumerated node kind, frame or artifact',
  'frame_quote_placed.onto': 'an enumerated placement, new or existing',
  'frame_quote_lifted.node': 'an enumerated node kind, frame or artifact',
  'frame_quote_lifted.trigger': 'an enumerated lift trigger: a look, the turn ending, or a page load',
  'artifact_edited.first_write': 'a flag',
  install_id: 'the anonymous install id',
  message: "the user's own words, which they asked to send",
  'report_submitted.email': 'the reply address on explicitly submitted feedback (ONL-2618)',
  'report_submitted.account_id': 'the verified account on explicitly submitted feedback (ONL-2618)',
  'onboarding_screen_shown.screen': 'an enumerated onboarding screen (ONL-3259)',
  'onboarding_screen_shown.visit': 'showings of one screen in one walk',
  'onboarding_screen_passed.screen': 'an enumerated onboarding screen (ONL-3259)',
  'onboarding_screen_passed.choice': 'an enumerated import choice',
  is_first_launch: 'a flag',
  'onboarding_survey_answered.question': 'an enumerated survey question key',
  'onboarding_survey_answered.answer': 'an enumerated survey option key, never the words typed for other (ONL-3259)',
  has_detail: 'a flag: words were typed for other, which never ride',
};

// A property whose name carries any of these is content or a measure of it.
const CONTENT_SHAPES = ['name', 'file', 'chars', 'bytes', 'label', 'alt', 'words', 'value'];

// A property whose name carries any of these denotes prose, not a measure of it.
const PROSE_SHAPES = [
  'message',
  'text',
  'body',
  'content',
  'prompt',
  'description',
  'summary',
  'note',
  'comment',
  'detail',
  'title',
  'snippet',
  'transcript',
  'stack',
  'words',
  'query',
];

/** Every property that may carry prose, and why; a bare key exempts the name in any event. */
const PROSE_PERMITTED: Record<string, string> = {
  error_message: 'a diagnostic, through `scrubMessage`',
  'report_submitted.message': 'the report the user asked to send (ONL-2350)',
  'app_opened_from_link.utm_content': 'a standard UTM tag, capped at 200 printable ASCII chars (ONL-3364)',
};

// Measures and enumerated ids, spelled out: anything else a prose-shaped name declares could be prose, an alias of `string` included.
const SCALAR = /^(number|boolean|null|undefined|true|false|'[^']*'|-?\d+(\.\d+)?)$/;

const couldCarryProse = (type: string) =>
  !type
    .replace(/[()]/g, '')
    .split('|')
    .every((part) => SCALAR.test(part.trim()));

/** Every `event.property` that declares prose without a permission. */
function proseOffenders(rows: Array<{ event: string; property: string; type: string }>): string[] {
  return rows
    .filter(
      (row) =>
        couldCarryProse(row.type) &&
        PROSE_SHAPES.some((shape) => row.property.toLowerCase().includes(shape)),
    )
    .filter((row) => !Object.hasOwn(PROSE_PERMITTED, row.property))
    .filter((row) => !Object.hasOwn(PROSE_PERMITTED, `${row.event}.${row.property}`))
    .map((row) => `${row.event}.${row.property}`);
}

// Events main declares itself; one the renderer sends unchanged is `Forwarded` in main's map and listed under RENDERER_EVENTS alone.
const MAIN_EVENTS: Record<string, readonly string[]> = {
  agent_turn_started: ['project_id', 'agent_session_id', 'harness', 'turn_id', 'origin'],
  agent_turn_stalled: ['project_id', 'agent_session_id', 'harness', 'turn_id', 'silent_ms'],
  text_node_created: ['project_id', 'method', 'count'],
  section_created: ['project_id', 'method', 'count'],
  artifact_created: ['project_id', 'method'],
  artifact_placed: ['project_id', 'method', 'count'],
  artifact_integrity: ['outcome', 'count'],
  artifact_export_result: ['outcome', 'count'],
  artifact_edited: ['page_count', 'first_write'],
  artifact_imported: ['page_count'],
  artifact_codebase_target: ['count'],
  image_node_created: ['project_id', 'method', 'count'],
  project_opened: [
    'project_id',
    'dev_server_source',
    'source',
    'text_node_count',
    'image_node_count',
    'artifact_node_count',
    'oldest_text_node_days',
    'page_count',
    'non_divider_page_count',
    'oldest_page_days',
  ],
  chat_agent_switched: ['project_id', 'from_harness', 'to_harness', 'entry_point'],
  frame_quote_placed: ['project_id', 'by', 'node', 'onto'],
  frame_quote_lifted: ['project_id', 'ms_to_lift', 'node', 'trigger'],
  page_created: ['project_id', 'method'],
  page_renamed: ['project_id', 'method', 'became_divider'],
  page_deleted: ['project_id', 'method', 'had_nodes', 'confirmed'],
  page_nodes_moved: ['project_id', 'method', 'node_count'],
  report_submitted: ['filed_by', 'lane', 'entry_point', 'install_id', 'message', 'email', 'account_id'],
  onboarding_screen_shown: ['screen', 'visit', 'is_first_launch'],
  onboarding_screen_passed: ['screen', 'choice', 'is_first_launch'],
  onboarding_survey_answered: ['question', 'answer', 'has_detail'],
};

const RENDERER_EVENTS: Record<string, readonly string[]> = {
  touched_file_opened: ['during_turn'],
  message_action: ['action', 'role', 'harness'],
  prompt_recall: ['steps_back', 'had_attachments', 'next_action', 'harness'],
  artifact_handoff_requested: ['count'],
  text_node_created: ['worktreePath', 'method', 'count'],
  section_created: ['worktreePath', 'method', 'count'],
  canvas_menu_used: ['action'],
  artifact_created: ['worktreePath', 'method'],
  artifact_placed: ['worktreePath', 'method', 'count'],
  image_node_created: ['worktreePath', 'method', 'count'],
  image_refused: ['worktreePath', 'method', 'reason', 'count'],
  text_size_changed: ['worktreePath', 'size', 'node_count'],
  image_resized: ['worktreePath', 'method'],
  text_resized: ['worktreePath', 'method'],
  agent_silence_shown: ['worktreePath', 'agent_session_id', 'harness', 'silent_ms'],
  page_created: ['worktreePath', 'method'],
  page_switched: ['worktreePath', 'method', 'node_count', 'artifact_node_count', 'artifact_cover_held_count', 'artifact_snapshot_held_count', 'ms_since_open'],
  page_renamed: ['worktreePath', 'method', 'became_divider'],
  page_deleted: ['worktreePath', 'method', 'had_nodes', 'confirmed'],
  page_nodes_moved: ['worktreePath', 'method', 'node_count'],
  tips_opened: ['worktreePath', 'source'],
  tips_pill_dismissed: ['worktreePath', 'source'],
  tour_opened: ['worktreePath', 'source'],
  tour_closed: ['worktreePath', 'step', 'completed'],
  tips_prompt_chosen: ['worktreePath', 'tip_id'],
  code_opened: ['worktreePath', 'method', 'target', 'confidence'],
};

describe('what a registered event is allowed to declare (ONL-2486, ONL-2488, ONL-2491)', () => {
  it('declares exactly the properties each event is expected to carry, in main and in the renderer', () => {
    for (const [event, properties] of Object.entries(MAIN_EVENTS)) {
      expect(declaredProperties(MAIN_MAP, event)).toEqual([...properties]);
    }
    for (const [event, properties] of Object.entries(RENDERER_EVENTS)) {
      expect(declaredProperties(RENDERER_MAP, event)).toEqual([...properties]);
    }
  });

  it('carries no property that is content, or a measure of content', () => {
    const declared = [
      ...Object.keys(MAIN_EVENTS).flatMap((event) =>
        declaredProperties(MAIN_MAP, event).map((property) => ({ event, property }))),
      ...Object.keys(RENDERER_EVENTS).flatMap((event) =>
        declaredProperties(RENDERER_MAP, event).map((property) => ({ event, property }))),
    ];
    expect(declared.length).toBeGreaterThan(0);
    for (const { event, property } of declared) {
      // `in` would permit any name Object.prototype already owns.
      expect(Object.hasOwn(PERMITTED, property) || Object.hasOwn(PERMITTED, `${event}.${property}`)).toBe(true);
      for (const shape of CONTENT_SHAPES) {
        if (property === 'filed_by' && shape === 'file') continue;
        expect(property.toLowerCase()).not.toContain(shape);
      }
    }
  });

  it('carries no prose in either map, bar the two permitted properties (ONL-2350)', () => {
    const rows = [
      ...declaredPropertyTypes(MAIN_MAP, 'TelemetryEventMap'),
      ...declaredPropertyTypes(RENDERER_MAP, 'RendererTelemetryEventMap'),
    ];
    expect(rows.length).toBeGreaterThan(100);
    expect(proseOffenders(rows)).toEqual([]);
  });

  it('fires on a prose-named string property in an event no opted-in list covers (ONL-2350)', () => {
    const fixture = [
      'export interface TelemetryEventMap {',
      '  tab_selected: {',
      '    open_count: number;',
      '    body: string;',
      '  };',
      '}',
      '',
    ].join('\n');
    expect(proseOffenders(declaredPropertyTypes(fixture, 'TelemetryEventMap'))).toEqual([
      'tab_selected.body',
    ]);
  });

  it('fires on prose hidden behind an alias, an array or a widened union (ONL-2350)', () => {
    const fixture = [
      'export interface TelemetryEventMap {',
      '  tab_selected: {',
      '    note: ReportText;',
      '    summary: string[];',
      '    detail: string | null;',
      "    title: 'short' | 'long';",
      '    comment_chars: number;',
      '  };',
      '}',
      '',
    ].join('\n');
    expect(proseOffenders(declaredPropertyTypes(fixture, 'TelemetryEventMap'))).toEqual([
      'tab_selected.note',
      'tab_selected.summary',
      'tab_selected.detail',
    ]);
  });

  it('does not fire on a count of content, nor on an identifier typed string (ONL-2350)', () => {
    const rows = declaredPropertyTypes(MAIN_MAP, 'TelemetryEventMap');
    const typeOf = (event: string, property: string) =>
      rows.find((row) => row.event === event && row.property === property)?.type;
    expect(typeOf('agent_turn_ended', 'prompt_chars')).toBe('number | null');
    expect(typeOf('agent_turn_ended', 'response_chars')).toBe('number');
    expect(typeOf('agent_turn_ended', 'files_changed')).toBe('number');
    expect(typeOf('agent_turn_ended', 'turn_id')).toBe('string');
    expect(typeOf('prompt_submitted', 'has_frame_context')).toBe('boolean');
    expect(proseOffenders(rows.filter((row) => row.event === 'agent_turn_ended'))).toEqual([]);
  });

  it('declares the report its geolocation suppression and address override, invisible to the order scan (ONL-2350)', () => {
    const rows = declaredPropertyTypes(MAIN_MAP, 'TelemetryEventMap').filter(
      (row) => row.event === 'report_submitted',
    );
    expect(rows.map((row) => `${row.property}: ${row.type}`)).toEqual([
      "filed_by: 'cloud'",
      "lane: 'bug' | 'feature'",
      "entry_point: 'menu' | 'canvas' | 'rail'",
      'install_id: string',
      'message: string',
      'email: string',
      'account_id: string',
      '$geoip_disable: true',
      '$ip: null',
    ]);
  });

  it('permits prose in exactly three properties, so a fourth carve-out cannot be added silently (ONL-2350)', () => {
    expect(Object.keys(PROSE_PERMITTED)).toEqual(['error_message', 'report_submitted.message', 'app_opened_from_link.utm_content']);
  });

  it('moves the two maps together: each event declares the same properties on both sides, bar the id main derives', () => {
    for (const event of Object.keys(RENDERER_EVENTS)) {
      if (!Object.hasOwn(MAIN_EVENTS, event)) {
        expect(MAIN_MAP).toContain(`\n  ${event}: Forwarded<'${event}'>;\n`);
        continue;
      }
      const main = declaredProperties(MAIN_MAP, event).map((property) =>
        property === 'project_id' ? 'worktreePath' : property,
      );
      expect(main).toEqual(declaredProperties(RENDERER_MAP, event));
    }
  });
});

describe('what a waiting prompt is allowed to report (ONL-2294)', () => {
  it('declares the outcome, the length and the wait, and no field a prompt could ride in', () => {
    expect(declaredProperties(MAIN_MAP, 'held_prompt_resolved')).toEqual([
      'project_id',
      'harness',
      'outcome',
      'prompt_chars',
      'waited_ms',
    ]);
  });
});

it('external MCP telemetry declares counts and join identifiers without server metadata', () => {
  expect(declaredProperties(MAIN_MAP, 'agent_mcp_tools_used')).toEqual([
    'project_id',
    'agent_session_id',
    'harness',
    'turn_id',
    'mcp_tool_call_count',
    'origin',
    'outcome',
  ]);
});

it('per-turn tool and attention telemetry declare counts, observed facts and join ids, nothing a codebase could ride in', () => {
  const join = ['project_id', 'agent_session_id', 'harness', 'turn_id', 'origin', 'outcome'];
  expect(declaredProperties(MAIN_MAP, 'agent_turn_tools')).toEqual([
    ...join,
    ...['read', 'search', 'file_edit', 'file_delete', 'shell', 'canvas_edit', 'canvas_navigate', 'frame_check', 'fetch', 'plan', 'question', 'subagent', 'other', 'external_mcp', 'failed', 'denied', 'canceled', 'in_subagent'].map((kind) => `${kind}_calls`),
    ...['read', 'search', 'file_edit', 'file_delete', 'shell', 'canvas_edit', 'canvas_navigate', 'frame_check', 'fetch', 'plan', 'question', 'subagent', 'other', 'external_mcp'].flatMap((kind) => ['failed', 'denied', 'canceled'].map((outcome) => `${kind}_${outcome}_calls`)),
  ]);
  expect(declaredProperties(MAIN_MAP, 'agent_turn_seen')).toEqual([
    ...join,
    'resolution', 'waited_ms', 'window_focused_at_end', 'project_tab_active_at_end', 'system_idle_ms_at_end', 'screen_locked_at_end', 'shown_by', 'system_idle_ms_at_shown',
  ]);
});
