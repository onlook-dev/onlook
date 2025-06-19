import type { ProjectSettings } from '@onlook/models';
import type { ProjectSettings as DbProjectSettings } from '../schema';

export const toProjectSettings = (dbProjectSettings: DbProjectSettings): ProjectSettings => {
    return {
        commands: {
            build: dbProjectSettings.buildCommand,
            run: dbProjectSettings.runCommand,
            install: dbProjectSettings.installCommand,
        }
    };
};

export const fromProjectSettings = (projectId: string, projectSettings: ProjectSettings): DbProjectSettings => {
    return {
        projectId,
        buildCommand: projectSettings.commands.build ?? '',
        runCommand: projectSettings.commands.run ?? '',
        installCommand: projectSettings.commands.install ?? ''
    };
};