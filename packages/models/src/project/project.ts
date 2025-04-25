import type { CanvasSettings } from './canvas';
import type { DomainSettings } from './domain';

export interface Project {
    id: string;
    name: string;
    canvas: CanvasSettings | null;
    domains: {
        base: DomainSettings | null;
        custom: DomainSettings | null;
    } | null;
    previewUrl: string;
    metadata: {
        createdAt: string;
        updatedAt: string;
        previewImg: string | null;
    }
    sandbox: {
        id: string;
        url: string;
    } | null;
}
