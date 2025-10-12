import { ProductsList } from '@/components/subscriptions/products-list';

export default function ProductsPage() {
    return (
        <div className="bg-background">
            <div className="container mx-auto px-4 py-8 space-y-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight">
                        Products & Pricing
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage products and pricing tiers
                    </p>
                </div>
                <ProductsList />
            </div>
        </div>
    );
}
