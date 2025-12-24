import type { Commands } from './command';

export interface ProjectSettings {
    commands: Commands;
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
    commands: {
        build: '',
        run: '',
        install: '',
    },
};
