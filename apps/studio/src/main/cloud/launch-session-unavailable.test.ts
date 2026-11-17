import { test } from 'bun:test';
import { exerciseLaunchSession } from './launch-session.test-support.js';

test('an unreachable provider at launch keeps the account signed in and identity unchanged', () => exerciseLaunchSession('unavailable', () => import('./index.js')));
