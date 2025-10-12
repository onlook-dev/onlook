'use client';

import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@onlook/ui/dialog';
import { Label } from '@onlook/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@onlook/ui/select';
import { Plus } from 'lucide-react';
import { useState, useMemo } from 'react';

interface AddSubscriptionProps {
    userId: string;
}

export function AddSubscription({ userId }: AddSubscriptionProps) {
    const [open, setOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedPriceId, setSelectedPriceId] = useState<string>('');
    const utils = api.useUtils();

    const { data: products, isLoading: productsLoading } = api.subscriptions.listProducts.useQuery();

    const addMutation = api.users.addSubscription.useMutation({
        onSuccess: () => {
            utils.users.getById.invalidate(userId);
            setOpen(false);
            setSelectedProductId('');
            setSelectedPriceId('');
            alert('Successfully added subscription');
        },
        onError: (error) => {
            alert(`Error: ${error.message}`);
        },
    });

    const selectedProduct = useMemo(() => {
        return products?.find(p => p.id === selectedProductId);
    }, [products, selectedProductId]);

    const availablePrices = useMemo(() => {
        return selectedProduct?.prices || [];
    }, [selectedProduct]);

    const selectedPrice = useMemo(() => {
        return availablePrices.find(p => p.id === selectedPriceId);
    }, [availablePrices, selectedPriceId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProductId || !selectedPriceId) {
            alert('Please select both product and price');
            return;
        }
        addMutation.mutate({
            userId,
            productId: selectedProductId,
            priceId: selectedPriceId,
        });
    };

    const handleProductChange = (value: string) => {
        setSelectedProductId(value);
        setSelectedPriceId(''); // Reset price when product changes
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="size-4 mr-1" />
                    Add Subscription
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Subscription</DialogTitle>
                        <DialogDescription>
                            Create a new subscription for this user
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="product">Product</Label>
                            <Select
                                value={selectedProductId}
                                onValueChange={handleProductChange}
                                disabled={productsLoading}
                            >
                                <SelectTrigger id="product">
                                    <SelectValue placeholder="Select a product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products?.map((product) => (
                                        <SelectItem key={product.id} value={product.id}>
                                            {product.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price Tier</Label>
                            <Select
                                value={selectedPriceId}
                                onValueChange={setSelectedPriceId}
                                disabled={!selectedProductId || availablePrices.length === 0}
                            >
                                <SelectTrigger id="price">
                                    <SelectValue placeholder="Select a price" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePrices.map((price) => (
                                        <SelectItem key={price.id} value={price.id}>
                                            {price.key} - {price.monthlyMessageLimit.toLocaleString()} messages/month
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedProductId && availablePrices.length === 0 && (
                                <p className="text-xs text-destructive">
                                    No prices available for this product
                                </p>
                            )}
                        </div>
                        {selectedPrice && (
                            <div className="rounded-lg bg-muted p-3 space-y-1">
                                <p className="text-sm font-medium">Preview</p>
                                <p className="text-sm text-muted-foreground">
                                    Product: <span className="font-semibold text-foreground">{selectedProduct?.name}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Price: <span className="font-semibold text-foreground">{selectedPrice.key}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Monthly Limit: <span className="font-mono font-semibold text-foreground">{selectedPrice.monthlyMessageLimit.toLocaleString()}</span> messages
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={addMutation.isPending || !selectedProductId || !selectedPriceId}
                        >
                            {addMutation.isPending ? 'Adding...' : 'Add Subscription'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
