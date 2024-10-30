import { writePackageJson } from '../utils/packageJson';
import { writeMuiConfig } from '../utils/config';

export async function initializeMaterialUI(projectPath: string) {
    // Add Material UI dependencies to package.json
    const dependencies = {
        '@mui/material': '^5.15.0',
        '@mui/system': '^5.15.0',
        '@emotion/react': '^11.11.0',
        '@emotion/styled': '^11.11.0',
    };

    // Add Material UI configuration
    const muiConfig = {
        theme: {
            palette: {
                primary: {
                    main: '#1976d2',
                },
                secondary: {
                    main: '#dc004e',
                },
            },
        },
    };

    // Write configuration files
    await Promise.all([
        writePackageJson(projectPath, dependencies),
        writeMuiConfig(projectPath, muiConfig),
    ]);
}
