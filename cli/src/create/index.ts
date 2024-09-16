import { exec } from 'child_process';
import * as fs from 'fs';
import ora from 'ora';
import * as path from 'path';
import { promisify } from 'util';
import { NEXT_TEMPLATE_REPO } from './constant';

// @ts-ignore
import degit from 'degit';

const execAsync = promisify(exec);

export async function create(projectName: string) {
    const targetPath = path.join(process.cwd(), projectName);

    console.log(`Creating a new Onlook project: ${projectName}`);

    // Check if the directory already exists
    if (fs.existsSync(targetPath)) {
        console.error(`Error: Directory ${projectName} already exists.`);
        process.exit(1);
    }

    const spinner = ora('Initializing project').start();

    try {
        // Clone the template using degit
        spinner.text = 'Cloning template';
        const emitter = degit(NEXT_TEMPLATE_REPO, {
            cache: false,
            force: true,
            verbose: true,
        });

        await emitter.clone(targetPath);

        // Change to the project directory
        process.chdir(targetPath);

        // Install dependencies
        spinner.text = 'Installing dependencies';
        await execAsync('npm install');

        spinner.succeed('Project created successfully');

        console.log('\nTo get started:');
        console.log(`  cd ${projectName}`);
        console.log('  npm run dev');
    } catch (error) {
        spinner.fail('Project creation failed');
        console.error('An error occurred:', error);
        process.exit(1);
    }
}