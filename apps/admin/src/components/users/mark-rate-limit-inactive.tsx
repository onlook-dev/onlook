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
import { Ban } from 'lucide-react';
import { useState } from 'react';

interface MarkRateLimitInactiveProps {
    rateLimitId: string;
    userId: string;
    max: number;
    left: number;
}

export function MarkRateLimitInactive({
    rateLimitId,
    userId,
    max,
    left,
}: MarkRateLimitInactiveProps) {
    const [open, setOpen] = useState(false);
    const utils = api.useUtils();

    const markInactiveMutation = api.users.markRateLimitInactive.useMutation({
        onSuccess: () => {
            utils.users.getById.invalidate(userId);
            setOpen(false);
            alert('Successfully marked rate limit as inactive');
        },
        onError: (error) => {
            alert(`Error: ${error.message}`);
        },
    });

    const handleMarkInactive = () => {
        markInactiveMutation.mutate({
            rateLimitId,
            userId,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Ban className="size-4 mr-1" />
                    Mark Inactive
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mark Rate Limit Inactive</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to mark this rate limit as inactive? This will set the end date to now.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="rounded-lg bg-muted p-4 space-y-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                            <p className="text-sm font-semibold">
                                {max - left} / {max} used ({left} remaining)
                            </p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Action</p>
                            <p className="text-sm">
                                This rate limit will be marked as ended and will no longer be active.
                            </p>
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
                        onClick={handleMarkInactive}
                        disabled={markInactiveMutation.isPending}
                    >
                        {markInactiveMutation.isPending ? 'Marking...' : 'Mark Inactive'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
