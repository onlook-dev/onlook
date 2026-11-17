import { expect, test } from 'bun:test';
import { recordingNotifier } from './recording-presenter.js';

test('the recording seam captures shown options and runs the registered click once', () => {
  const recording = recordingNotifier();
  const presenter = recording.factory({ id: 'event', title: 'Onlook', body: 'Project finished', silent: true });
  let clicked = 0;
  presenter.once('click', () => { clicked += 1; });
  expect(recording.snapshot()).toEqual([]);
  presenter.show();
  expect(recording.snapshot()).toEqual([{ id: 'event', title: 'Onlook', body: 'Project finished', silent: true }]);
  recording.snapshot()[0]!.body = 'changed';
  expect(recording.snapshot()[0]!.body).toBe('Project finished');
  recording.click('event');
  recording.click('event');
  expect(clicked).toBe(1);
});
