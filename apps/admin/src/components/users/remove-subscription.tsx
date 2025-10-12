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
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

interface RemoveSubscriptionProps {
    subscriptionId: string;
    userId: string;
    productName: string;
    priceKey: string;
}

export function RemoveSubscription({
    subscriptionId,
    userId,
    productName,
    priceKey,
}: RemoveSubscriptionProps) {
    const [open, setOpen] = useState(false);
    const utils = api.useUtils();

    const removeMutation = api.users.removeSubscription.useMutation({
        onSuccess: () => {
            utils.users.getById.invalidate(userId);
            setOpen(false);
            alert('Successfully removed subscription');
        },
        onError: (error) => {
            alert(`Error: ${error.message}`);
        },
    });

    const handleRemove = () => {
        removeMutation.mutate({
            subscriptionId,
            userId,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Trash2 className="size-4 text-destructive" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Remove Subscription</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove this subscription? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Product</p>
                            <p className="text-sm font-semibold">{productName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Price Tier</p>
                            <p className="text-sm font-semibold">{priceKey}</p>
                        </div>
                    </div>
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
                        type="button"
                        variant="destructive"
                        onClick={handleRemove}
                        disabled={removeMutation.isPending}
                    >
                        {removeMutation.isPending ? 'Removing...' : 'Remove Subscription'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
