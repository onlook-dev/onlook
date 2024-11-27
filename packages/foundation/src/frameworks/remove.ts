import fs from 'fs';
import path from 'path';
import { CONFIG_BASE_NAME } from "src/constants";

export const removeNextConfig = async (targetPath: string): Promise<void> => {
    const configPath = path.join(targetPath, `${CONFIG_BASE_NAME.NEXTJS}*`);
    const files = await fs.promises.readdir(path.dirname(configPath));
    const configFile = files.find(file => file.startsWith(CONFIG_BASE_NAME.NEXTJS));

    if (configFile) {
        const fullPath = path.join(targetPath, configFile);
        let content = await fs.promises.readFile(fullPath, 'utf8');

        // Remove the Onlook plugin configuration with any object
        content = content.replace(/swcPlugins:\s*\[\s*\[\s*"@onlook\/nextjs"(,\s*\{[^}]*\})?\s*\]\s*\]/, '');

        // Remove empty swcPlugins array if it exists
        content = content.replace(/swcPlugins:\s*\[\s*\],?\s*/g, '');

        // Remove empty experimental object if it exists
        content = content.replace(/experimental:\s*{\s*},?/, '');

        // Remove trailing commas if any
        content = content.replace(/,(\s*[}\]])/g, '$1');

        await fs.promises.writeFile(fullPath, content, 'utf8');
        console.log(`Onlook plugin configuration removed from ${fullPath}`);
    } else {
        console.log(`No Next.js config file found in ${targetPath}`);
    }
};

export const removeViteConfig = async (targetPath: string): Promise<void> => {
    const configPath = path.join(targetPath, `${CONFIG_BASE_NAME.VITEJS}*`);
    const files = await fs.promises.readdir(path.dirname(configPath));
    const configFile = files.find(file => file.startsWith(CONFIG_BASE_NAME.VITEJS));

    if (configFile) {
        const fullPath = path.join(targetPath, configFile);
        let content = await fs.promises.readFile(fullPath, 'utf8');

        // Remove the Onlook babel plugin from the plugins array
        content = content.replace(/,?\s*"@onlook\/babel-plugin-react"(?=\s*[\],])/g, '');

        // Remove empty babel plugins array if it exists
        content = content.replace(/plugins:\s*\[\s*\],?\s*/g, '');

        // Remove empty babel object if it exists
        content = content.replace(/babel:\s*{\s*},?\s*/g, '');

        // Remove trailing commas if any
        content = content.replace(/,(\s*[}\]])/g, '$1');

        await fs.promises.writeFile(fullPath, content, 'utf8');
        console.log(`Onlook babel plugin removed from ${fullPath}`);
    } else {
        console.log(`No Vite config file found in ${targetPath}`);
    }
};

export const removeDependencies = async (targetPath: string, dependencies: string[]): Promise<void> => {
    const packageJsonPath = path.join(targetPath, 'package.json');

    try {
        const content = await fs.promises.readFile(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(content);
        let modified = false;

        // Check and remove from dependencies
        if (packageJson.dependencies) {
            dependencies.forEach(dep => {
                if (packageJson.dependencies[dep]) {
                    delete packageJson.dependencies[dep];
                    modified = true;
                }
            });
        }

        // Check and remove from devDependencies
        if (packageJson.devDependencies) {
            dependencies.forEach(dep => {
                if (packageJson.devDependencies[dep]) {
                    delete packageJson.devDependencies[dep];
                    modified = true;
                }
            });
        }

        if (modified) {
            await fs.promises.writeFile(
                packageJsonPath,
                JSON.stringify(packageJson, null, 2) + '\n',
                'utf8'
            );
            console.log(`Removed dependencies from ${packageJsonPath}`);
        } else {
            console.log('No matching dependencies found to remove');
        }
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.log(`No package.json found in ${targetPath}`);
        } else {
            throw error;
        }
    }
};

