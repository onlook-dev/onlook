import { useEditorEngine } from '@/components/Context';
import { WebviewState } from '@/lib/editor/engine/webview';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { assertNever } from '/common/helpers';

const EnabledButton = observer(({ webviewId }: { webviewId: string }) => {
    const editorEngine = useEditorEngine();
    const state = editorEngine.webviews.getState(webviewId);

    if (state === WebviewState.NOT_RUNNING || state === WebviewState.RUNNING_NO_DOM) {
        return null;
    }

    let buttonIcon;
    switch (state) {
        case WebviewState.DOM_ONLOOK_ENABLED:
            buttonIcon = <Icons.CheckCircled />;
            break;
        case WebviewState.DOM_NO_ONLOOK:
            buttonIcon = <Icons.ExclamationTriangle />;
            break;
        default:
            assertNever(state);
    }

    const button = (
        <Button
            variant="outline"
            className={cn(
                'bg-background-secondary/60 px-3',
                state === WebviewState.DOM_NO_ONLOOK && 'bg-red-500 hover:bg-red-700',
            )}
        >
            {buttonIcon}
        </Button>
    );

    let popoverContent;
    switch (state) {
        case WebviewState.DOM_ONLOOK_ENABLED:
            popoverContent = (
                <div className="space-y-2 flex flex-col">
                    <div className="flex gap-2 w-full justify-center">
                        <p className="text-active text-regularPlus">Onlook is enabled</p>
                        <Icons.CheckCircled className="mt-[3px] text-foreground-positive" />
                    </div>
                    <p className="text-foreground-onlook text-small w-80 text-wrap">
                        Your codebase is now linked to the editor, giving you advanced features like
                        write-to-code, component detection, code inspect, and more
                    </p>
                </div>
            );
            break;
        case WebviewState.DOM_NO_ONLOOK:
            popoverContent = (
                <div className="space-y-2 flex flex-col w-80 items-center">
                    <div className="flex gap-2 justify-center">
                        <p className="text-active text-regularPlus">
                            {"Onlook won't work on this page"}
                        </p>
                        <Icons.CircleBackslash className="mt-[3px] text-red-500" />
                    </div>
                    <p className="text-foreground-onlook text-small text-left">
                        {
                            "This url is not linked to Onlook's editor. Please navigate to a url that is linked to Onlook's editor."
                        }
                    </p>
                </div>
            );
            break;
        default:
            assertNever(state);
    }

    return (
        <Popover>
            <PopoverTrigger asChild>{button}</PopoverTrigger>
            <PopoverContent>{popoverContent}</PopoverContent>
        </Popover>
    );
});

export default EnabledButton;
