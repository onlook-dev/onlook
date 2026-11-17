import { expect, test } from 'bun:test';
import { moveRecordedPorts, recordedPorts } from './replay-ports.js';

const saved = JSON.stringify({
  type: 'assistant',
  message: {
    content: [
      {
        type: 'tool_use',
        name: 'mcp__studio__save_project_setup',
        input: { servers: [{ id: 'web', start: 'PORT=4321 exec node server.js', port: 4321 }] },
      },
    ],
    usage: { input_tokens: 4321, output_tokens: 43210 },
  },
});
const said = JSON.stringify({ type: 'result', result: 'The site is up at http://localhost:4321/.' });
const untouched = JSON.stringify({ type: 'system', note: 'nothing listens here' });

test('every port a recording binds moves to this run’s port, and numbers that only look alike stay', () => {
  expect(recordedPorts([saved, said, untouched])).toEqual([4321]);
  const [movedSave, movedSaid, same] = moveRecordedPorts([saved, said, untouched], new Map([[4321, 51234]]));
  const server = JSON.parse(movedSave!).message.content[0].input.servers[0];
  expect(server).toEqual({ id: 'web', start: 'PORT=51234 exec node server.js', port: 51234 });
  expect(JSON.parse(movedSave!).message.usage).toEqual({ input_tokens: 4321, output_tokens: 43210 });
  expect(JSON.parse(movedSaid!).result).toBe('The site is up at http://localhost:51234/.');
  expect(same).toBe(untouched);
});
