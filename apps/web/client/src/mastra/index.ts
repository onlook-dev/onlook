import { Mastra } from '@mastra/core';
import { onlookAgent } from './agents';

export const mastra = new Mastra({
    agents: {
        onlookAgent,
    },
})