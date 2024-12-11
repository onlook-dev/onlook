import type { RequirementsResponse } from '@onlook/models/requirements';
import { execSync } from 'child_process';

export function checkSystemRequirements(): RequirementsResponse {
    return {
        git: checkGitInstallation(),
        node: checkNodeInstallation(),
    };
}

// Note: Test by passing empty PATH
// execSync('git --version', { stdio: 'ignore', env: { ...process.env, PATH: '' }});

function checkGitInstallation(): boolean {
    try {
        execSync('git --version', { stdio: 'ignore', env: process.env });
        return true;
    } catch (error) {
        console.error('Git check failed:', error);
        return false;
    }
}

function checkNodeInstallation(): boolean {
    try {
        // Try common locations for Node installations
        const commonPaths = [
            // Default paths
            process.env.PATH,
            process.env.Path,
            // NodeJS official installer paths
            '/usr/local/bin',
            '/usr/local/nodejs/bin',
            'C:\\Program Files\\nodejs',
            'C:\\Program Files (x86)\\nodejs',

            // Node version managers

            // Nvm
            `${process.env.HOME}/.nvm/versions/node`,
            // Fnm
            `${process.env.HOME}/.fnm/node-versions`,
            // N
            `${process.env.N_PREFIX}/bin`,
            '/usr/local/n/versions/node',
            // Volta
            `${process.env.VOLTA_HOME}/bin`,
            `${process.env.HOME}/.volta/bin`,
            // ASDF
            `${process.env.HOME}/.asdf/installs/nodejs`,
        ]
            .filter(Boolean)
            .join(process.platform === 'win32' ? ';' : ':');

        execSync('npm --version', { stdio: 'ignore', env: { ...process.env, PATH: commonPaths } });
        return true;
    } catch (error) {
        console.error('Npm check failed:', error);
        return false;
    }
}
