import { createProject, CreateStage, type CreateCallback } from '@onlook/utils';
import ora from 'ora';

export async function create(projectName: string): Promise<void> {
    console.log(`Creating a new Onlook project: ${projectName}`);
    const targetPath = process.cwd();
    const spinner = ora('Initializing project...').start();

    const progressCallback: CreateCallback = (stage: CreateStage, message: string) => {
        switch (stage) {
            case CreateStage.CLONING:
                spinner.text = 'Cloning template...';
                break;
            case CreateStage.INSTALLING:
                spinner.text = 'Installing dependencies...';
                break;
            case CreateStage.COMPLETE:
                spinner.succeed('Project created successfully!');
                console.log('\nTo get started:');
                console.log(`  cd ${projectName}`);
                console.log('  npm run dev');
                break;
            case CreateStage.ERROR:
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