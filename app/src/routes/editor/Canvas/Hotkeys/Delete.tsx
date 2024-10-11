import { useEditorEngine } from '@/components/Context';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { MainChannels } from '/common/constants';
import { Hotkey } from '/common/hotkeys';
import { UserSettings } from '/common/models/settings';

const DeleteKey = () => {
    const editorEngine = useEditorEngine();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [shouldWarnDelete, setShouldWarnDelete] = useState(true);

    window.api.invoke(MainChannels.GET_USER_SETTINGS).then((res) => {
        const settings: UserSettings = res as UserSettings;
        setShouldWarnDelete(settings.shouldWarnDelete ?? true);
    });

    useHotkeys([Hotkey.BACKSPACE.command, Hotkey.DELETE.command], () => {
        if (shouldWarnDelete) {
            setShowDeleteDialog(true);
        } else {
            editorEngine.elements.delete();
        }
    });

    function disableWarning(disable: boolean) {
        window.api.invoke(MainChannels.UPDATE_USER_SETTINGS, { shouldWarnDelete: disable });
        setShouldWarnDelete(disable);
    }

    const handleDelete = () => {
        editorEngine.elements.delete();
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

export default DeleteKey;
