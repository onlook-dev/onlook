'use client';

import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';

interface SubscriptionCancelModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirmCancel: () => void;
}

export const SubscriptionCancelModal = ({ open, onOpenChange, onConfirmCancel }: SubscriptionCancelModalProps) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Cancel Subscription</DialogTitle>
                    <DialogDescription className="pt-2">
                        Are you sure you want to cancel your subscription? You'll lose access to all premium features at the end of your current billing period.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex-col sm:flex-row gap-3 sm:gap-2">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="order-2 sm:order-1"
                    >
                        Keep Subscription
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onConfirmCancel}
                        className="order-1 sm:order-2 text-red-200 hover:text-red-100 hover:bg-red-500/10 border-red-200 hover:border-red-100"
                    >
                        Cancel Subscription
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};