'use client';

import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import { Label } from '@onlook/ui/label';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';

interface ForkBranchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
    defaultName: string;
    isLoading?: boolean;
}

export function ForkBranchDialog({
    isOpen,
    onClose,
    onConfirm,
    defaultName,
    isLoading = false,
}: ForkBranchDialogProps) {
    const [name, setName] = useState(defaultName);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setName(defaultName);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px] border-0">
                <DialogHeader>
                    <DialogTitle>Name Your Fork</DialogTitle>
                    <DialogDescription className="">
                        Choose a name for your forked branch. You can change this later.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid py-2">
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="col-span-3 focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border border-border w-full ring-0 mb-2"
                            placeholder="Enter branch name"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || isLoading}
                        >
                            {isLoading ? (
                                <Icons.LoadingSpinner className="mr-0 h-4 w-4 animate-spin" />
                            ) : (
                                <Icons.Branch className="mr-0 h-4 w-4" />
                            )}
                            {isLoading ? 'Creating...' : 'Create Fork'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
