import { api } from '@/trpc/server';
import { Main } from './_components/main';
import { ProjectProviders } from './providers';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const projectId = (await params).id;
    if (!projectId) {
        return <div>Invalid project ID</div>;
    }

    try {
        // Fetch required project data before initializing providers
        const [project, branches] = await Promise.all([
            api.project.get({ projectId }),
            api.branch.getByProjectId({ projectId }),
        ]);

        if (!project) {
            return <div>Project not found</div>;
        }

        return (
            <ProjectProviders project={project} branches={branches}>
                <Main />
            </ProjectProviders>
        );
    } catch (error) {
        console.error('Failed to load project data:', error);
        return (
            <div className="h-screen w-screen flex items-center justify-center">
                <div>Failed to load project: {error instanceof Error ? error.message : 'Unknown error'}</div>
            </div>
        );
    }
}
