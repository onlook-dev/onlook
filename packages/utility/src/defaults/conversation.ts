import type { Conversation as DbConversation } from '@onlook/db';
import { v4 as uuidv4 } from 'uuid';

export const createDefaultConversation = (projectId: string): DbConversation => {
    return {
        id: uuidv4(),
        projectId,
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: 'New Conversation',
    };
};
