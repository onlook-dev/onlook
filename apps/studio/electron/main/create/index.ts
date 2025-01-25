import type { ImageMessageContext } from '@onlook/models/chat';

export async function createProjectPrompt(prompt: string, images: ImageMessageContext[]) {
    try {
        const [generatedPage, projectSetup] = await Promise.all([
            generatePage(prompt, images),
            setupProject(),
        ]);

        // Apply the generated page to the project
        await applyGeneratedPage(projectSetup.projectPath, generatedPage);

        return {
            success: true,
            projectPath: projectSetup.projectPath,
        };
    } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
    }
}

async function generatePage(prompt: string, images: ImageMessageContext[]) {
    // Mock AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
        name: '/* Generated styles here */',
        code: '// Generated code here',
    };
}

async function setupProject() {
    // Mock project setup steps
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const projectPath = '/path/to/project';

    return {
        projectPath,
        success: true,
    };
}

async function applyGeneratedPage(projectPath: string, generatedPage: any) {
    // Mock applying the generated code
    await new Promise((resolve) => setTimeout(resolve, 500));
    return true;
}
