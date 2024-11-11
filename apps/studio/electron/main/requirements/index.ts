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
        execSync('node --version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}
