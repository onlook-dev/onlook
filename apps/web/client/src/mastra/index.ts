import { Mastra } from '@mastra/core';
import { onlookAgent } from './agents';
import { storage } from './storage';

export const mastra = new Mastra({
    agents: {
        onlookAgent,
    },
    storage,
})