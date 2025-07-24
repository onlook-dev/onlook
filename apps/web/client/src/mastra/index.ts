import { Mastra } from '@mastra/core';
import type { MastraStorage } from '@mastra/core/storage';
import { onlookAgent } from './agents';
import { storage } from './storage';

export const mastra = new Mastra({
    agents: {
        onlookAgent,
    },
    storage: storage as MastraStorage,
})