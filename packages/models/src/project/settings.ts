import type { Commands } from './command';

export interface ProjectSettings {
    commands: Commands;
    env: Record<string, string> | null;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
    commands: {
        build: '',
        run: '',
        install: '',
    },
    env: null,
};
