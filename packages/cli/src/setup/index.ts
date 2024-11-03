import { type SetupCallback, setupProject, SetupStage } from '@onlook/foundation';
import ora from 'ora';

export const setup = async (): Promise<void> => {
    const targetPath = process.cwd();
    const spinner = ora('Initializing project...').start();

    const progressCallback: SetupCallback = (stage: SetupStage, message: string) => {
        switch (stage) {
            case SetupStage.INSTALLING:
                spinner.text = 'Cloning template...';
                break;
            case SetupStage.CONFIGURING:
                spinner.text = 'Installing dependencies...';
                break;
            case SetupStage.COMPLETE:
                spinner.succeed('Project created successfully!');
                console.log('\nTo get started:');
                console.log(`  cd ${targetPath}`);
                console.log('  npm run dev');
                break;
            case SetupStage.ERROR:
                spinner.fail(message);
                break;
        }
    }

    try {
        await setupProject(targetPath, progressCallback);
    } catch (error) {
        spinner.fail('An error occurred');
        console.error('Error details:', error);
        process.exit(1);
    }
};


