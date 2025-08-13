import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { transKeys } from '@/i18n/keys';
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
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';
import { useTranslations } from 'next-intl';

export const ChatPanelDropdown = observer(({
    children,
    isChatHistoryOpen,
    setIsChatHistoryOpen,
}: {
    children: React.ReactNode;
    isChatHistoryOpen: boolean;
    setIsChatHistoryOpen: (isOpen: boolean) => void;
}) => {
    const t = useTranslations();
    const { mutate: updateSettings } = api.user.settings.upsert.useMutation({
        onSuccess: () => {
            void apiUtils.user.settings.get.invalidate();
        },
    });
    const { data: userSettings } = api.user.settings.get.useQuery();
    const apiUtils = api.useUtils();
    const editorEngine = useEditorEngine();
    const selectedTab = editorEngine.state.rightPanelTab;

    const debouncedUpdateSettings = useMemo(
        () => debounce((settings: Partial<ChatSettings>) => {
            updateSettings({
                ...settings,
            });
        }, 300),
        [updateSettings]
    );

    useEffect(() => {
        return () => {
            debouncedUpdateSettings.cancel();
        };
    }, [debouncedUpdateSettings]);

    const updateChatSettings = useCallback((e: React.MouseEvent, settings: Partial<ChatSettings>) => {
        e.preventDefault();

        apiUtils.user.settings.get.setData(undefined, (oldData) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                chat: {
                    ...oldData.chat,
                    ...settings,
                },
            };
        });
        
        debouncedUpdateSettings(settings);
    }, [apiUtils.user.settings.get, debouncedUpdateSettings]);

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
                    {t(transKeys.editor.panels.edit.tabs.chat.settings.autoApplyCode)}
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
                    {t(transKeys.editor.panels.edit.tabs.chat.settings.expandCodeBlocks)}
                </DropdownMenuItem> */}
                <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            showSuggestions: !userSettings?.chat.showSuggestions,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            userSettings?.chat.showSuggestions ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    {t(transKeys.editor.panels.edit.tabs.chat.settings.showSuggestions)}
                </DropdownMenuItem>

                <DropdownMenuItem
                    className="flex items-center py-1.5"
                    onClick={(e) => {
                        updateChatSettings(e, {
                            showMiniChat: !userSettings?.chat.showMiniChat,
                        });
                    }}
                >
                    <Icons.Check
                        className={cn(
                            'mr-2 h-4 w-4',
                            userSettings?.chat.showMiniChat ? 'opacity-100' : 'opacity-0',
                        )}
                    />
                    {t(transKeys.editor.panels.edit.tabs.chat.settings.showMiniChat)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}>
                    <Icons.CounterClockwiseClock className="mr-2 h-4 w-4" />
                    {t(transKeys.editor.panels.edit.tabs.chat.controls.history)}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
