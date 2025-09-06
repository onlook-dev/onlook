'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { GithubExportModal } from './modal';

export const GithubExportButton = observer(() => {
    const editorEngine = useEditorEngine();

    return (
        <Popover
            open={editorEngine.state.githubExportOpen}
            onOpenChange={(open: boolean) => {
                editorEngine.state.setGithubExportOpen(open);
            }}
        >
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button 
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-full cursor-pointer hover:opacity-80 bg-gray-100 dark:bg-gray-800"
                        >
                            <Icons.GitHubLogo className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    Export project to GitHub
                </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-96 p-0">
                <GithubExportModal />
            </PopoverContent>
        </Popover>
    );
});