import { exec } from 'child_process';
import degit from 'degit';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { NEXT_TEMPLATE_REPO } from './constant';

const execAsync = promisify(exec);

export enum ProjectCreationStage {
    CLONING = 'cloning',
    INSTALLING = 'installing',
    COMPLETE = 'complete',
    ERROR = 'error'
}

type ProgressCallback = (stage: ProjectCreationStage, message: string) => void;

export async function createProject(
    projectName: string,
    targetPath: string,
    onProgress: ProgressCallback
): Promise<void> {
    const fullPath = path.join(targetPath, projectName);

    // Check if the directory already exists
    if (fs.existsSync(fullPath)) {
        throw new Error(`Directory ${fullPath} already exists.`);
    }

    try {
        // Clone the template using degit
        onProgress(ProjectCreationStage.CLONING, `Cloning template to ${fullPath}`);
        const emitter = degit(NEXT_TEMPLATE_REPO, {
            cache: false,
            force: true,
            verbose: true,
        });

        await emitter.clone(fullPath);

        // Change to the project directory
        process.chdir(fullPath);

        // Install dependencies
        onProgress(ProjectCreationStage.INSTALLING, 'Installing dependencies');
        await execAsync('npm install');

        onProgress(ProjectCreationStage.COMPLETE, 'Project created successfully');
    } catch (error) {
        onProgress(ProjectCreationStage.ERROR, `Project creation failed: ${error}`);
        throw error;
    }
}


// TODO: Move to CLI
export async function create(projectName: string, targetPath: string): Promise<void> {
    console.log(`Creating a new Onlook project: ${projectName}`);
    console.log(`Target path: ${targetPath}`);

    try {
        await createProject(projectName, targetPath, (stage, message) => {
            switch (stage) {
                case ProjectCreationStage.CLONING:
                case ProjectCreationStage.INSTALLING:
                    console.log(message);
                    break;
                case ProjectCreationStage.COMPLETE:
                    console.log(message);
                    console.log('\nTo get started:');
                    console.log(`  cd ${path.join(targetPath, projectName)}`);
                    console.log('  npm run dev');
                    break;
                case ProjectCreationStage.ERROR:
                    console.error(message);
                    break;
            }
        });
    } catch (error) {
        console.error('An error occurred:', error);
        process.exit(1);
    }
}