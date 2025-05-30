import chalk from 'chalk';
import { Command } from 'commander';
import path from 'node:path';
import { promptAndWriteApiKeys } from './api-keys';
import { promptAndWriteBackendKeys } from './backend';

const program = new Command();

// Determine root and .env paths
const cwd = process.cwd();
const isInPackagesScripts = cwd.includes('packages/scripts');
export const rootDir = path.resolve(cwd, isInPackagesScripts ? '../..' : '.');
const clientEnvPath = path.join(rootDir, 'apps', 'web', 'client', '.env');
const dbEnvPath = path.join(rootDir, 'packages', 'db', '.env');

program
    .name('setup:env')
    .description('Automate environment setup for Onlook development')
    .version('0.0.1')
    .action(async () => {
        console.log(
            chalk.bold.blue(
                '🔑 Onlook Environment Setup Script\n==================================',
            ),
        );
        try {
            await promptAndWriteBackendKeys(clientEnvPath, dbEnvPath);
            await promptAndWriteApiKeys(clientEnvPath);

            console.log(chalk.green('✅ Environment files created successfully!'));
            console.log(chalk.cyan('Next steps: https://docs.onlook.com'));
        } catch (err) {
            console.error(chalk.red('Error creating .env files:'), err);
            process.exit(1);
        }
    });

program.parse(process.argv);
