'use client';

import { useEditorEngine } from '@/components/store/editor';
import { useCreateBlankProject } from '@/hooks/use-create-blank-project';
import { transKeys } from '@/i18n/keys';
import { Routes } from '@/utils/constants';
import {
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface NewProjectMenuProps {
    onShowCloneDialog: (open: boolean) => void;
}

export const NewProjectMenu = observer(({ onShowCloneDialog }: NewProjectMenuProps) => {
    const editorEngine = useEditorEngine();
    const { handleStartBlankProject, isCreatingProject } = useCreateBlankProject();
    const t = useTranslations();
    const router = useRouter();

    const handleStartBlankWithScreenshot = async () => {
        // Capture screenshot of current project before cleanup
        try {
            editorEngine.screenshot.captureScreenshot();
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
        }

        await handleStartBlankProject();
    };

    return (
        <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
                <div className="flex flex-row center items-center">
                    <Icons.Plus className="mr-2" />
                    {t(transKeys.projects.actions.newProject)}
                </div>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-48 ml-2">
                <DropdownMenuItem
                    onClick={handleStartBlankWithScreenshot}
                    disabled={isCreatingProject}
                    className="cursor-pointer"
                >
                    <div className="flex flex-row center items-center group">
                        {isCreatingProject ? (
                            <Icons.LoadingSpinner className="mr-2 animate-spin" />
                        ) : (
                            <Icons.FilePlus className="mr-2" />
                        )}
                        {t(transKeys.projects.actions.blankProject)}
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(Routes.IMPORT_PROJECT)}>
                    <div className="flex flex-row center items-center group">
                        <Icons.Upload className="mr-2" />
                        {t(transKeys.projects.actions.import)}
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onShowCloneDialog(true)}
                    className="cursor-pointer"
                >
                    <div className="flex flex-row center items-center group">
                        <Icons.Copy className="mr-2" />
                        Clone this project
                    </div>
                </DropdownMenuItem>
            </DropdownMenuSubContent>
        </DropdownMenuSub>
    );
});
