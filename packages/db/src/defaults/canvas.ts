import type { Canvas as DbCanvas } from '../schema';
import { v4 as uuidv4 } from 'uuid';

export const createDefaultCanvas = (projectId: string): DbCanvas => {
    return {
        id: uuidv4(),
        projectId: projectId,
    };
};
