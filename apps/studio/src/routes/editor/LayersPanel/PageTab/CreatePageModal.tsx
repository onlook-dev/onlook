import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@onlook/ui/dialog';
import { Button } from '@onlook/ui/button';
import { Input } from '@onlook/ui/input';
import { cn } from '@onlook/ui/utils';
import { useEffect, useMemo, useState } from 'react';
import {
    doesRouteExist,
    normalizeRoute,
    validateNextJsRoute,
} from '@/lib/editor/engine/pages/helper';
import { useEditorEngine } from '@/components/Context';

interface CreatePageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    baseRoute?: string;
}

export function CreatePageModal({ open, onOpenChange, baseRoute = '/' }: CreatePageModalProps) {
    const editorEngine = useEditorEngine();
    const [pageName, setPageName] = useState('');
    const [warning, setWarning] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fullPath = useMemo(
        () => normalizeRoute(`${baseRoute}/${pageName}`),
        [baseRoute, pageName],
    );

    useEffect(() => {
        if (!pageName) {
            setWarning('');
            return;
        }

        const { valid, error } = validateNextJsRoute(pageName);
        if (!valid) {
            setWarning(error || 'Invalid page name');
            return;
        }

        if (doesRouteExist(editorEngine.pages.tree, fullPath)) {
            setWarning('This page already exists');
            return;
        }

        setWarning('');
    }, [pageName, fullPath, editorEngine.pages.tree]);

    const handleCreate = async () => {
        try {
            setIsLoading(true);
            await editorEngine.pages.createPage(baseRoute, pageName);
            setPageName('');
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to create page:', error);
            setWarning('Failed to create page. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Page</DialogTitle>
                    <DialogDescription>
                        This page will be /{fullPath} on your site
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="col-span-3 space-y-2">
                        <Input
                            id="pageName"
                            value={pageName}
                            onChange={(e) => {
                                setPageName(e.target.value.toLowerCase());
                            }}
                            className={cn(
                                warning && 'border-yellow-300 focus-visible:ring-yellow-300',
                            )}
                            placeholder="about-us or [blog] for a dynamic page"
                            disabled={isLoading}
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
                    <Button onClick={handleCreate} disabled={isLoading || !!warning || !pageName}>
                        {isLoading ? <>Creating...</> : 'Create Page'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
