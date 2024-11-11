import { execSync } from 'child_process';

export function checkSystemRequirements() {
    const requirements = {
        git: checkGitInstallation(),
        node: checkNodeInstallation(),
    };
    return requirements;
}

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
