import type { Canvas } from './canvas';
import type { ProjectDomain } from './domain';

export interface Project {
    id: string;
    name: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        previewImg: string | null;
    }
    sandbox: {
        id: string;
        url: string;
    };
    canvas: Canvas;
    domains: ProjectDomain;
}
