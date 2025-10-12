import { Breadcrumb } from '@/components/layout/breadcrumb';
import { ProjectDetail } from '@/components/projects/project-detail';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-6">
                <Breadcrumb
                    items={[
                        { label: 'Projects', href: '/projects' },
                        { label: params.id },
                    ]}
                />
                <ProjectDetail projectId={params.id} />
            </div>
        </div>
    );
}
