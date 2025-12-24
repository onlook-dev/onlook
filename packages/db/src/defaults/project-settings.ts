import { DefaultSettings } from '@onlook/constants';
import type { ProjectSettings as DbProjectSettings } from '@onlook/db';

export const createDefaultProjectSettings = (projectId: string): DbProjectSettings => {
    return {
        projectId,
        buildCommand: DefaultSettings.COMMANDS.build,
        runCommand: DefaultSettings.COMMANDS.run,
        installCommand: DefaultSettings.COMMANDS.install,
    };
};
