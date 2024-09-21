import { createProject, ProjectCreationStage, type ProgressCallback } from '@onlook/utils';
import ora from 'ora';

export async function create(projectName: string): Promise<void> {
    console.log(`Creating a new Onlook project: ${projectName}`);
    const targetPath = process.cwd();
    const spinner = ora('Initializing project...').start();

    const progressCallback: ProgressCallback = (stage, message) => {
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
                console.log(`  cd ${projectName}`);
                console.log('  npm run dev');
                break;
            case ProjectCreationStage.ERROR:
                spinner.fail(message);
                break;
        }
    }

    try {
        await createProject(projectName, targetPath, progressCallback);
    } catch (error) {
        spinner.fail('An error occurred');
        console.error('Error details:', error);
        process.exit(1);
    }
}