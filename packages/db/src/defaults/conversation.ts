import { v4 as uuidv4 } from 'uuid';

import { type Conversation as DbConversation } from '@onlook/db';

export const createDefaultConversation = (projectId: string): DbConversation => {
    return {
        id: uuidv4(),
        projectId,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: 'New Conversation',
        suggestions: [],
    };
};
