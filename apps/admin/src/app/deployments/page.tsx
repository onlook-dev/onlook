import { DeploymentsList } from '@/components/deployments/deployments-list';

export default function DeploymentsPage() {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Deployments
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        View and manage all project deployments
                    </p>
                </div>
                <DeploymentsList />
            </div>
        </div>
    );
}
