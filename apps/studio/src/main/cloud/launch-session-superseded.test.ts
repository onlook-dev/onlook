import { test } from 'bun:test';
import { exerciseLaunchSession } from './launch-session.test-support.js';

test('launch expiry arriving after a fresh sign-in cannot clear the new identity', () => exerciseLaunchSession('superseded', () => import('./index.js')));
