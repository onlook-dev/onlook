import { Breadcrumb } from '@/components/layout/breadcrumb';
import { UserDetail } from '@/components/users/user-detail';

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
                <UserDetail userId={params.id} />
            </div>
        </div>
    );
}
