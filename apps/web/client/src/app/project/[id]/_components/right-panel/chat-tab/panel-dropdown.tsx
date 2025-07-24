import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import type { ChatSettings } from '@onlook/models';
import { EditorTabValue } from '@onlook/models';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';

export const ChatPanelDropdown = observer(({
    children,
    isChatHistoryOpen,
    setIsChatHistoryOpen,
}: {
    children: React.ReactNode;
    isChatHistoryOpen: boolean;
    setIsChatHistoryOpen: (isOpen: boolean) => void;
}) => {
    const { mutate: updateSettings } = api.user.settings.upsert.useMutation();
    const editorEngine = useEditorEngine();
    const selectedTab = editorEngine.state.rightPanelTab;

    const updateChatSettings = (e: React.MouseEvent, settings: Partial<ChatSettings>) => {
        e.preventDefault();
        updateSettings({
            ...settings,
        });
    };

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild disabled={selectedTab !== EditorTabValue.CHAT}>
                <div className="flex items-center">{children}</div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[220px]">
                {/* <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            autoApplyCode: !chatSettings.autoApplyCode,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            chatSettings.autoApplyCode ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    Auto - apply results
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            expandCodeBlocks: !chatSettings.expandCodeBlocks,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            chatSettings.expandCodeBlocks ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    Show code while rendering
                </DropdownMenuItem> */}

                {/* TODO: Reenable */}
                {/* <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            showSuggestions: !chatSettings.showSuggestions,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            chatSettings.showSuggestions ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    Show suggestions
                </DropdownMenuItem> */}

                {/* TODO: Reenable */}
                {/* <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            showMiniChat: !chatSettings.showMiniChat,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            chatSettings.showMiniChat ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    Show mini chat
                </DropdownMenuItem> */}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}>
                    <Icons.CounterClockwiseClock className="mr-2 h-4 w-4" />
                    Chat History
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
