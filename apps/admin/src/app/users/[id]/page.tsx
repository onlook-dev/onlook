import { Breadcrumb } from '@/components/layout/breadcrumb';

export default function UserDetailPage({ params }: { params: { id: string } }) {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-6">
                <Breadcrumb
                    items={[
                        { label: 'Users', href: '/users' },
                        { label: params.id },
                    ]}
                />
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        User Details
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Hello World - User ID: {params.id}
                    </p>
                </div>
            </div>
        </div>
    );
}
