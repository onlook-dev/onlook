import { test } from 'bun:test';
import { exerciseLaunchSession } from './launch-session.test-support.js';

test('launch expiry clears identity and emits one bounded event and sign-in notice', () => exerciseLaunchSession('ended', () => import('./index.js')));
