import { useEditorEngine } from '@/components/store/editor';
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
import { observer } from 'mobx-react-lite';
import path from 'path';
import { useMemo, useState } from 'react';
import {
    createFileInSandbox
} from '../shared/file-operations';
import { getFileTemplate } from '../shared/file-templates';

interface FileModalProps {
    basePath: string;
    show: boolean;
    setShow: (show: boolean) => void;
    onSuccess?: () => void;
}

export const FileModal = observer(({
    basePath,
    show,
    setShow,
    onSuccess,
}: FileModalProps) => {
    const editorEngine = useEditorEngine();

    const [name, setName] = useState('');
    const [warning, setWarning] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isComposing, setIsComposing] = useState(false);

    const fullPath = useMemo(() => {
        if (!name) return '';
        return path.join(basePath, name).replace(/\\/g, '/');
    }, [basePath, name]);

    const title = 'Create New File';
    const buttonText = 'Create File';
    const loadingText = 'Creating file...';
    const placeholder = 'component.tsx';

    const handleSubmit = async () => {
        if (!name || warning) return;

        try {
            setIsLoading(true);

            const content = getFileTemplate(name);
            await createFileInSandbox(editorEngine.activeSandbox.session.provider, fullPath, content, editorEngine.activeSandbox);
            toast(`File "${name}" created successfully!`);

            setName('');
            setShow(false);
            onSuccess?.();
        } catch (error) {
            console.error('Failed to create file:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create file';
            setWarning(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const displayPath = basePath === '' ? '/' : `/${basePath}`;

    return (
        <Dialog open={show} onOpenChange={(isOpen) => setShow(isOpen)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Create a new file in{' '}
                        <code className="bg-background-secondary px-1 py-0.5 rounded text-xs">
                            {displayPath}
                        </code>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                                warning && 'border-yellow-300 focus-visible:ring-yellow-300',
                            )}
                            placeholder={placeholder}
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isComposing && !warning && name) {
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
                        {fullPath && !warning && (
                            <p className="text-sm text-muted-foreground">
                                Full path: <code className="bg-background-secondary px-1 py-0.5 rounded text-xs">{fullPath}</code>
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setShow(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleSubmit}
                        disabled={isLoading || !!warning || !name}
                    >
                        {isLoading ? loadingText : buttonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}); 