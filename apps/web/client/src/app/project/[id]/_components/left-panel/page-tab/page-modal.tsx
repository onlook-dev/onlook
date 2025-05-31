import { useEditorEngine } from '@/components/store/editor';
import {
    doesRouteExist,
    normalizeRoute,
    validateNextJsRoute,
} from '@/components/store/editor/pages/helper';
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
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { useEffect, useMemo, useState } from 'react';

interface PageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'create' | 'rename';
    baseRoute?: string;
    initialName?: string;
}

export function PageModal({
    open,
    onOpenChange,
    mode = 'create',
    baseRoute = '/',
    initialName = '',
}: PageModalProps) {
    const editorEngine = useEditorEngine();
    const [pageName, setPageName] = useState('');
    const [warning, setWarning] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const fullPath = useMemo(() => {
        if (mode === 'rename') {
            const parentPath = baseRoute.split('/').slice(0, -1).join('/');
            return normalizeRoute(parentPath ? `${parentPath}/${pageName}` : pageName);
        }
        return normalizeRoute(`${baseRoute}/${pageName}`);
    }, [baseRoute, pageName, mode]);
    const [isComposing, setIsComposing] = useState(false);

    const title = mode === 'create' ? 'Create a New Page' : 'Rename Page';
    const buttonText = mode === 'create' ? 'Create Page' : 'Rename Page';
    const loadingText = mode === 'create' ? 'Creating...' : 'Renaming...';

    // Reset page name when modal opens
    useEffect(() => {
        if (open) {
            setPageName(initialName);
        }
    }, [open, initialName]);

    useEffect(() => {
        if (!pageName) {
            setWarning('');
            return;
        }

        const { valid, error } = validateNextJsRoute(pageName);
        if (!valid) {
            setWarning(error ?? 'Invalid page name');
            return;
        }

        if (doesRouteExist(editorEngine.pages.tree, fullPath)) {
            setWarning('This page already exists');
            return;
        }

        setWarning('');
    }, [pageName, fullPath, editorEngine.pages.tree]);

    const handleSubmit = async () => {
        try {
            setIsLoading(true);

            if (mode === 'create') {
                await editorEngine.pages.createPage(baseRoute, pageName);
                toast('Page created!');
            } else {
                await editorEngine.pages.renamePage(baseRoute, pageName);
                toast('Page renamed!');
            }

            setPageName('');
            onOpenChange(false);
        } catch (error) {
            console.error(`Failed to ${mode} page:`, error);
            setWarning(`Failed to ${mode} page. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isComposing) {
                                    handleSubmit();
                                }
                            }}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
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
                        onClick={handleSubmit}
                        disabled={isLoading || !!warning || !pageName}
                    >
                        {isLoading ? <>{loadingText}</> : buttonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
