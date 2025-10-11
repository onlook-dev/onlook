import { UsersList } from '@/components/users/users-list';

export default function UsersPage() {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Users
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        View and manage all users in the system
                    </p>
                </div>
                <UsersList />
            </div>
        </div>
    );
}
