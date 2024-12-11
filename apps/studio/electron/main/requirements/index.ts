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
        execSync('git --version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        console.error('Git check failed:', error);
        return false;
    }
}

function checkNodeInstallation(): boolean {
    try {
        const versionManagerPaths = [
            `${process.env.HOME}/.nvm/versions/node`, // Nvm
            `${process.env.HOME}/.fnm/node-versions`, // Fnm
            `${process.env.N_PREFIX}/bin`, // N
            '/usr/local/n/versions/node', // N
            `${process.env.VOLTA_HOME}/bin`, // Volta
            `${process.env.HOME}/.volta/bin`, // Volta
            `${process.env.HOME}/.asdf/installs/nodejs`, // ASDF
        ]
            .filter(Boolean);

        const existingPath = process.env.PATH || '';
        const pathSeparator = process.platform === 'win32' ? ';' : ':';
        const enhancedPath = [...versionManagerPaths, existingPath].join(pathSeparator);

        execSync('npm --version', { stdio: 'ignore', env: { ...process.env, PATH: enhancedPath } });
        return true;
    } catch (error) {
        console.error('Npm check failed:', error);
        return false;
    }
}
