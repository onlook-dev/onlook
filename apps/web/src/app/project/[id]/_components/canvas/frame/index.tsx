import { FrameType, type Frame, type WebFrame } from "@onlook/models";
import { observer } from "mobx-react-lite";
import { GestureScreen } from './gesture';
import { ResizeHandles } from './resize-handles';
import { TopBar } from "./top-bar";
import { WebFrameComponent } from "./web-frame";

export const FrameView = observer(
    ({
        frame,
    }: {
        frame: Frame;
    }) => {
        return (
            <div
                className="flex flex-col fixed"
                style={{ transform: `translate(${frame.position.x}px, ${frame.position.y}px)` }}
            >
                <TopBar frame={frame}>
                </TopBar>
                <div className="relative">
                    <ResizeHandles frame={frame} />
                    {frame.type === FrameType.WEB && <WebFrameComponent frame={frame as WebFrame} />}
                    <GestureScreen />
                    {/* {domFailed && shouldShowDomFailed && renderNotRunning()} */}
                </div>

            </div>
        );
    });