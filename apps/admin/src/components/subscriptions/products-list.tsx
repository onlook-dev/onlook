'use client';

import { api } from '@/trpc/react';
import { Badge } from '@onlook/ui/badge';
import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@onlook/ui/card';
import { Skeleton } from '@onlook/ui/skeleton';
import { ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function ProductsList() {
    const router = useRouter();
    const { data: products, isLoading, error } = api.subscriptions.listProducts.useQuery();

    if (error) {
        return (
            <Card className="border-destructive/50">
                <CardHeader>
                    <CardTitle className="text-destructive">Error Loading Products</CardTitle>
                    <CardDescription>{error.message}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32 mt-2" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Products & Pricing</CardTitle>
                <CardDescription>
                    {products?.length || 0} product{products?.length !== 1 ? 's' : ''} available
                </CardDescription>
            </CardHeader>
            <CardContent>
                {products && products.length > 0 ? (
                    <div className="space-y-4">
                        {products.map((product) => (
                            <div key={product.id} className="border rounded-lg p-4 space-y-3">
                                <div>
                                    <h3 className="font-semibold text-lg">{product.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">Stripe Product ID:</span>
                                        <Button
                                            variant="link"
                                            className="h-auto p-0 text-xs font-mono"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`https://dashboard.stripe.com/products/${product.stripeProductId}`, '_blank');
                                            }}
                                        >
                                            {product.stripeProductId}
                                            <ExternalLink className="ml-1 size-3" />
                                        </Button>
                                    </div>
                                </div>
                                {product.prices.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium">Available Prices:</p>
                                        <div className="grid gap-2">
                                            {product.prices.map((price) => (
                                                <div
                                                    key={price.id}
                                                    className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                                                    onClick={() => router.push(`/products/prices/${price.id}`)}
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">{price.key}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {price.monthlyMessageLimit.toLocaleString()} messages/month
                                                            {' • '}
                                                            {price.subscriberCount} {price.subscriberCount === 1 ? 'subscriber' : 'subscribers'}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="link"
                                                        className="h-auto p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`https://dashboard.stripe.com/prices/${price.stripePriceId}`, '_blank');
                                                        }}
                                                    >
                                                        <Badge variant="outline" className="font-mono text-xs">
                                                            {price.stripePriceId}
                                                            <ExternalLink className="ml-1 size-3" />
                                                        </Badge>
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No products found</p>
                )}
            </CardContent>
        </Card>
    );
}
