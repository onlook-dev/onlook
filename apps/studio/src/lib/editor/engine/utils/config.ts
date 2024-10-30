import * as fs from 'fs';
import * as path from 'path';

export async function writeMuiConfig(projectPath: string, config: any): Promise<void> {
    const configPath = path.join(projectPath, 'src/theme/mui.ts');
    const configDir = path.dirname(configPath);

    // Create directories if they don't exist
    await fs.promises.mkdir(configDir, { recursive: true });

    // Generate the config file content
    const configContent = `
import { createTheme } from '@mui/material/styles';

const theme = createTheme(${JSON.stringify(config, null, 2)});

export default theme;
`;

    // Write the config file
    await fs.promises.writeFile(configPath, configContent, 'utf8');
}
