import { createProject, ProjectCreationStage } from '@onlook/utils';
import ora from 'ora';
import * as path from 'path';

export async function create(projectName: string, targetPath: string): Promise<void> {
    console.log(`Creating a new Onlook project: ${projectName}`);
    console.log(`Target path: ${targetPath}`);

    const spinner = ora('Initializing project...').start();

    try {
        await createProject(projectName, targetPath, (stage, message) => {
            switch (stage) {
                case ProjectCreationStage.CLONING:
                    spinner.text = 'Cloning template...';
                    break;
                case ProjectCreationStage.INSTALLING:
                    spinner.text = 'Installing dependencies...';
                    break;
                case ProjectCreationStage.COMPLETE:
                    spinner.succeed('Project created successfully!');
                    console.log('\nTo get started:');
                    console.log(`  cd ${path.join(targetPath, projectName)}`);
                    console.log('  npm run dev');
                    break;
                case ProjectCreationStage.ERROR:
                    spinner.fail(message);
                    break;
            }
        });
    } catch (error) {
        spinner.fail('An error occurred');
        console.error('Error details:', error);
        process.exit(1);
    }
}