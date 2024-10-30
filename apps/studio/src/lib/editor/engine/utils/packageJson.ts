import * as fs from 'fs';
import * as path from 'path';

export async function writePackageJson(projectPath: string, dependencies: Record<string, string>) {
    try {
        const packagePath = path.join(projectPath, 'package.json');

        // Read existing package.json
        const packageJson = JSON.parse(await fs.promises.readFile(packagePath, 'utf8'));

        // Merge new dependencies
        packageJson.dependencies = {
            ...packageJson.dependencies,
            ...dependencies,
        };

        // Write updated package.json
        await fs.promises.writeFile(packagePath, JSON.stringify(packageJson, null, 2));
    } catch (error) {
        console.error('Error updating package.json:', error);
        throw error;
    }
}
