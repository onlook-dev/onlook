import { v4 as uuidv4 } from 'uuid';

import { type Canvas as DbCanvas } from '@onlook/db';

export const createDefaultCanvas = (projectId: string): DbCanvas => {
    return {
        id: uuidv4(),
        projectId: projectId,
    };
};
