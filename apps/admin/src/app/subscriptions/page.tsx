import { ProductsList } from '@/components/subscriptions/products-list';
import { SubscriptionsList } from '@/components/subscriptions/subscriptions-list';

export default function SubscriptionsPage() {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Subscriptions
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage products, pricing, and user subscriptions
                    </p>
                </div>
                <ProductsList />
                <SubscriptionsList />
            </div>
        </div>
    );
}
