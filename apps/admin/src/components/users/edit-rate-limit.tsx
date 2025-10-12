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
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface EditRateLimitProps {
    rateLimitId: string;
    currentLeft: number;
    max: number;
    userId: string;
}

export function EditRateLimit({ rateLimitId, currentLeft, max, userId }: EditRateLimitProps) {
    const [open, setOpen] = useState(false);
    const [creditsToAdd, setCreditsToAdd] = useState<number>(100);
    const utils = api.useUtils();

    const updateMutation = api.users.updateRateLimit.useMutation({
        onSuccess: (data) => {
            utils.users.getById.invalidate(userId);
            setOpen(false);
            setCreditsToAdd(100);
            alert(`Successfully added ${data.creditsAdded} credits. New balance: ${data.newLeft}/${max}`);
        },
        onError: (error) => {
            alert(`Error: ${error.message}`);
        },
    });

    const maxCreditsCanAdd = max - currentLeft;
    const newBalance = Math.min(currentLeft + creditsToAdd, max);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (creditsToAdd < 1 || creditsToAdd > maxCreditsCanAdd) {
            alert(`Please enter a value between 1 and ${maxCreditsCanAdd}`);
            return;
        }
        updateMutation.mutate({
            rateLimitId,
            creditsToAdd,
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus className="size-4 mr-1" />
                    Add Credits
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Credits to Rate Limit</DialogTitle>
                        <DialogDescription>
                            Current balance: {currentLeft} / {max} requests
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="credits">Credits to Add</Label>
                            <Input
                                id="credits"
                                type="number"
                                min={1}
                                max={maxCreditsCanAdd}
                                value={creditsToAdd}
                                onChange={(e) => setCreditsToAdd(parseInt(e.target.value) || 0)}
                                placeholder="Enter amount"
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum you can add: {maxCreditsCanAdd} credits
                            </p>
                        </div>
                        <div className="rounded-lg bg-muted p-3 space-y-1">
                            <p className="text-sm font-medium">Preview</p>
                            <p className="text-sm text-muted-foreground">
                                New balance: <span className="font-mono font-semibold text-foreground">{newBalance}</span> / {max}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {creditsToAdd > maxCreditsCanAdd ?
                                    `Will be capped at maximum (${max})` :
                                    `Adding ${creditsToAdd} credits`
                                }
                            </p>
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
                            type="submit"
                            disabled={updateMutation.isPending || creditsToAdd < 1 || currentLeft >= max}
                        >
                            {updateMutation.isPending ? 'Adding...' : 'Add Credits'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
