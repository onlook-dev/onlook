
import { Button } from '@onlook/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';

interface PageModalProps {
    open: boolean;
    isLoading: boolean;
    onOpenChange: (open: boolean) => void;
    handleSubmit: (url: string) => void;
}

export function GithubImportModal({
    open,
    isLoading,
    onOpenChange,
    handleSubmit
}: PageModalProps) {
    const [repoUrl, setRepoUrl] = useState<string>('');
    const [warning, setWarning] = useState<string>('');

    const isValidGithubUrl = (url: string): boolean => {
        const pattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/i;
        return pattern.test(url.trim());
    };

    const handleInputChange = (value: string) => {
        const trimmed = value.trim();
        setRepoUrl(trimmed);

        if (!trimmed) {
            setWarning('');
        } else if (!isValidGithubUrl(trimmed)) {
            setWarning('Please enter a valid GitHub repository URL (e.g., https://github.com/user/repo)');
        } else {
            setWarning('');
        }
    };

    const handleImport = async () => {
        handleSubmit(repoUrl);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import from Github</DialogTitle>
                    <DialogDescription>
                        Enter a public GitHub repository URL to start your project.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="col-span-3 space-y-2">
                        <Input
                            id="githubRepo"
                            value={repoUrl}
                            onChange={(e) => handleInputChange(e.target.value)}
                            className={cn(
                                warning && 'border-yellow-300 focus-visible:ring-yellow-300',
                            )}
                            placeholder="Enter repository URL"
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !repoUrl) {
                                    handleImport();
                                }
                            }}
                        />
                        {warning && (
                            <p className="text-sm text-yellow-300 flex items-center gap-2">
                                {warning}
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleImport}
                        disabled={isLoading || !!warning || !repoUrl}
                    >
                        {isLoading ? <>{'Importing...'}</> : 'Import'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
