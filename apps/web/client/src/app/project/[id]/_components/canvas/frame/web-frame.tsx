import type { WebFrame } from "@onlook/models";
import { cn } from "@onlook/ui-v4/utils";
import { observer } from "mobx-react-lite";

export const WebFrameComponent = observer(({
    frame,
}: { frame: WebFrame }) => {
    return (
        <iframe
            id={frame.id}
            className={cn(
                'backdrop-blur-sm transition outline outline-4',
                // shouldShowDomFailed ? 'bg-transparent' : 'bg-white',
                // selected ? getSelectedOutlineColor() : 'outline-transparent',
            )}
            src={frame.url}
            sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
            allow="geolocation; microphone; camera; midi; encrypted-media"
            style={{
                width: frame.dimension.width,
                height: frame.dimension.height,
            }}
        />
    );
});