import { DomainsList } from '@/components/domains/domains-list';

export default function DomainsPage() {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Domains
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage custom domains and their verification status
                    </p>
                </div>
                <DomainsList />
            </div>
        </div>
    );
}
