import { Breadcrumb } from '@/components/layout/breadcrumb';

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-6">
                <Breadcrumb
                    items={[
                        { label: 'Projects', href: '/' },
                        { label: params.id },
                    ]}
                />
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Project Details
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Hello World - Project ID: {params.id}
                    </p>
                </div>
            </div>
        </div>
    );
}
