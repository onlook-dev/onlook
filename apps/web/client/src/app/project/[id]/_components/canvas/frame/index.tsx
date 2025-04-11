import { FrameType, type Frame, type WebFrame } from "@onlook/models";
import { observer } from "mobx-react-lite";
import { useRef } from "react";
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { TopBar } from "./top-bar";
import { WebFrameComponent, type WebFrameView } from "./web-frame";

export const FrameView = observer(
    ({
        frame,
    }: {
        frame: Frame;
    }) => {
        const webFrameRef = useRef<WebFrameView>(null);
        return (
            <div
                className="flex flex-col fixed"
                style={{ transform: `translate(${frame.position.x}px, ${frame.position.y}px)` }}
            >
                <TopBar frame={frame}>
                </TopBar>
                <div className="relative">
                    <ResizeHandles frame={frame} />
                    {frame.type === FrameType.WEB && <WebFrameComponent frame={frame as WebFrame} ref={webFrameRef} />}
                    <GestureScreen frame={frame as WebFrame} webFrameRef={webFrameRef} />
                    {/* {domFailed && shouldShowDomFailed && renderNotRunning()} */}
                </div>

            </div>
        );
    });