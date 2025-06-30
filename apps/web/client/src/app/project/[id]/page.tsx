import { Main } from './_components/main';
import { ProjectProviders } from './providers';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const projectId = (await params).id;
    if (!projectId) {
        return <div>Invalid project ID</div>;
    }

    return (
        <ProjectProviders projectId={projectId}>
            <Main />
        </ProjectProviders>
    );
}
