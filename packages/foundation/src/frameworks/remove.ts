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

