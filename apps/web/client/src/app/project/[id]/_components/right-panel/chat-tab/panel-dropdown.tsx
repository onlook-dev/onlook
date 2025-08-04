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
import { Dialog, DialogContent, DialogTrigger } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { ChimeNotification } from './chime-notification'
import type { ChimeSound } from './chime-notification'
import { useState } from 'react'
import { useChimeNotification } from '@/app/project/[id]/_hooks/use-chime-notification';

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
    const [isChimeModalOpen, setIsChimeModalOpen] = useState(false);
    const { selectedSound, isEnabled, volume, setSelectedSound, setIsEnabled, setVolume } = useChimeNotification();

    const updateChatSettings = (e: React.MouseEvent, settings: Partial<ChatSettings>) => {
        e.preventDefault();
        updateSettings({
            ...settings,
        });
    };

    const handleChimeToggle = () => {
        setIsEnabled(!isEnabled);
        setIsChimeModalOpen(false);
    };

    const handleChimeNoThanks = () => {
        setIsEnabled(false);
        setIsChimeModalOpen(false);
    };

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild disabled={selectedTab !== EditorTabValue.CHAT}>
                    <div className="flex items-center">{children}</div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[220px]">
                    <Dialog open={isChimeModalOpen} onOpenChange={setIsChimeModalOpen}>
                        <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                </svg>
                                Chime Notification
                            </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <ChimeNotification
                                selectedAudio={selectedSound}
                                onAudioSelect={setSelectedSound}
                                volume={volume}
                                onVolumeChange={setVolume}
                                onChooseAudio={handleChimeToggle}
                                onNoThanks={handleChimeNoThanks}
                                isEnabled={isEnabled}
                            />
                        </DialogContent>
                    </Dialog>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsChatHistoryOpen(!isChatHistoryOpen)}>
                        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Chat History
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
});
