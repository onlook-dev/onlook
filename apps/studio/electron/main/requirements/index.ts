import type { RequirementsResponse } from '@onlook/models/requirements';
import { execSync } from 'child_process';

export function checkSystemRequirements(): RequirementsResponse {
    return {
        git: checkGitInstallation(),
        node: checkNodeVersion(),
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

function checkNodeVersion(): boolean {
    try {
        const versionManagerPaths = [
            `${process.env.HOME}/.nvm/versions/node`, // Nvm
            `${process.env.HOME}/.fnm/node-versions`, // Fnm
            `${process.env.N_PREFIX}/bin`, // N
            '/usr/local/n/versions/node', // N
            `${process.env.VOLTA_HOME}/bin`, // Volta
            `${process.env.HOME}/.volta/bin`, // Volta
            `${process.env.HOME}/.asdf/installs/nodejs`, // ASDF
        ].filter(Boolean);

        const existingPath = process.env.PATH || '';
        const pathSeparator = process.platform === 'win32' ? ';' : ':';
        const enhancedPath = [...versionManagerPaths, existingPath].join(pathSeparator);

        // Check if node is installed and get its version
        const nodeVersionOutput = execSync('node --version', {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, PATH: enhancedPath },
        })
            .toString()
            .trim();

        // Parse version string (e.g., "v18.17.0" -> [18, 17, 0])
        const versionMatch = nodeVersionOutput.match(/v(\d+)\.(\d+)\.(\d+)/);
        if (!versionMatch) {
            console.error('Failed to parse Node.js version:', nodeVersionOutput);
            return false;
        }

        const [, majorStr, minorStr, patchStr] = versionMatch;
        const major = parseInt(majorStr, 10);
        const minor = parseInt(minorStr, 10);
        const patch = parseInt(patchStr, 10);

        // Check if version is >= 18.17.0
        if (major > 18 || (major === 18 && minor >= 17)) {
            return true;
        }

        console.error(`Node.js version ${nodeVersionOutput} is below the required v18.17.0`);
        return false;
    } catch (error) {
        console.error('Node.js check failed:', error);
        return false;
    }
}
