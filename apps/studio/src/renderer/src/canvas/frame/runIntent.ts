import { createContext } from 'react';
import type { RunIntent } from '@studio/events';

export const FrameRunIntentContext = createContext<((intent: RunIntent) => void) | null>(null);
