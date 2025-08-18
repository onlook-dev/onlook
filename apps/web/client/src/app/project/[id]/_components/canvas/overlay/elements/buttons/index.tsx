import { useChatContext } from '@/app/project/[id]/_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { EditorMode } from '@onlook/models';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { OverlayChatInput } from './chat';
import { OverlayOpenCode } from './code';
import { DEFAULT_INPUT_STATE } from './helpers';

export const OverlayButtons = observer(() => {
    const editorEngine = useEditorEngine();
    const { data: settings } = api.user.settings.get.useQuery();
    const { isWaiting } = useChatContext();
    const [inputState, setInputState] = useState(DEFAULT_INPUT_STATE);
    const prevChatPositionRef = useRef<{ x: number; y: number } | null>(null);

    const selectedRect = editorEngine.overlay.state.clickRects[0] ?? null;
    const domId = editorEngine.elements.selected[0]?.domId;

    const isPreviewMode = editorEngine.state.editorMode === EditorMode.PREVIEW;
    const shouldHideButton =
        !selectedRect ||
        isPreviewMode ||
        isWaiting ||
        !settings?.chat?.showMiniChat;

    useEffect(() => {
        setInputState(DEFAULT_INPUT_STATE);
    }, [domId]);

    const chatPosition = {
        x: domId
            ? (document.getElementById(domId)?.getBoundingClientRect().left ?? 0)
            : 0,
        y: domId
            ? (document.getElementById(domId)?.getBoundingClientRect().bottom ?? 0)
            : 0,
    };

    useEffect(() => {
        prevChatPositionRef.current = chatPosition;
    }, [chatPosition.x, chatPosition.y]);

    const animationClass =
        'origin-center scale-[0.2] opacity-0 -translate-y-2 transition-all duration-200';

    useEffect(() => {
        if (domId) {
            requestAnimationFrame(() => {
                const element = document.querySelector(`[data-element-id="${domId}"]`);
                if (element) {
                    element.classList.remove('scale-[0.2]', 'opacity-0', '-translate-y-2');
                    element.classList.add('scale-100', 'opacity-100', 'translate-y-0');
                }
            });
        }
    }, [domId]);

    if (shouldHideButton) {
        return null;
    }

    const EDITOR_HEADER_HEIGHT = 86;
    const MARGIN = 8;
    const CHAT_BUTTON_HEIGHT = 42;

    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        top: Math.max(EDITOR_HEADER_HEIGHT + MARGIN, selectedRect.top - (CHAT_BUTTON_HEIGHT + MARGIN)),
        left: selectedRect.left + selectedRect.width / 2,
        transform: 'translate(-50%, 0)',
        transformOrigin: 'center center',
        pointerEvents: 'auto',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    return (
        <div
            style={containerStyle}
            onClick={(e) => e.stopPropagation()}
            className={animationClass}
            data-element-id={domId}
        >
            <div className="flex flex-row items-center gap-2">
                <OverlayChatInput inputState={inputState} setInputState={setInputState} />
                <OverlayOpenCode isInputting={inputState.isInputting} />
            </div>
        </div>
    );
});
