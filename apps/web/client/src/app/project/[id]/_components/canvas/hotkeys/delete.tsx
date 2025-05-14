import { Hotkey } from '@/components/hotkey';
import { useEditorEngine } from '@/components/store/editor';
import { useUserManager } from '@/components/store/user';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Checkbox } from '@onlook/ui/checkbox';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

export const DeleteKey = () => {
    const editorEngine = useEditorEngine();
    const userManager = useUserManager();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [shouldWarnDelete, setShouldWarnDelete] = useState(
        userManager.settings.settings?.editor?.shouldWarnDelete ?? true,
    );

    useHotkeys([Hotkey.BACKSPACE.command, Hotkey.DELETE.command], () => {
        if (shouldWarnDelete) {
            setShowDeleteDialog(true);
        } else {
            editorEngine.elements.delete();
        }
        // TODO: Handle deleting frames
    });

    function disableWarning(disable: boolean) {
        userManager.settings.updateEditor({ shouldWarnDelete: disable });
        setShouldWarnDelete(disable);
    }

    const handleDelete = async () => {
        await editorEngine.elements.delete();
        setShowDeleteDialog(false);
    };

    return (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{'Delete this element?'}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {'This will delete the element in code. You can undo this action.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="disable-warning"
                        onCheckedChange={(checked) => disableWarning(checked !== true)}
                    />
                    <label
                        htmlFor="disable-warning"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                        {"Don't show this warning again"}
                    </label>
                </div>
                <AlertDialogFooter>
                    <Button variant={'ghost'} onClick={() => setShowDeleteDialog(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant={'destructive'}
                        className="rounded-md text-sm"
                        onClick={handleDelete}
                    >
                        Delete
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
