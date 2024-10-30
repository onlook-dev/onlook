import { initializeMaterialUI } from '../../src/lib/editor/engine/init/materialUI';
import { initializeTailwind } from '../../src/lib/editor/engine/init/tailwind';

export async function createNewProject(projectPath: string) {
    try {
        // Existing initialization code...

        // Initialize Tailwind
        await initializeTailwind(projectPath);

        // Initialize Material UI
        await initializeMaterialUI(projectPath);

        return true;
    } catch (error) {
        console.error('Failed to create project:', error);
        return false;
    }
}
