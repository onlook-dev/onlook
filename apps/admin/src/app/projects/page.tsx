import { ProjectsList } from '@/components/projects/projects-list';

export default function ProjectsPage() {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Projects
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage all projects in the system
                    </p>
                </div>
                <ProjectsList />
            </div>
        </div>
    );
}
