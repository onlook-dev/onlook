import type { ProjectSettings } from '@onlook/models';
import type { ProjectSettings as DbProjectSettings } from '../../schema';

export const fromDbProjectSettings = (dbProjectSettings: DbProjectSettings): ProjectSettings => {
    return {
        commands: {
            build: dbProjectSettings.buildCommand,
            run: dbProjectSettings.runCommand,
            install: dbProjectSettings.installCommand,
        }
    };
};

export const toDbProjectSettings = (projectId: string, projectSettings: ProjectSettings): DbProjectSettings => {
    return {
        projectId,
        buildCommand: projectSettings.commands.build ?? '',
        runCommand: projectSettings.commands.run ?? '',
        installCommand: projectSettings.commands.install ?? ''
    };
};