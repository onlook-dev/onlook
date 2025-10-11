import { ProjectsList } from '@/components/projects/projects-list';

export default function HomePage() {
    return (
        <main className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Onlook <span className="text-primary">Admin</span>
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage projects and resources
                    </p>
                </div>
                <ProjectsList />
            </div>
        </main>
    );
}
