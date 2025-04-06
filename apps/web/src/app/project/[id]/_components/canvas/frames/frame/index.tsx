import { FrameType, type Frame, type WebFrame } from "@onlook/models";
import { observer } from "mobx-react-lite";
import { GestureScreen } from '../gesture';
import { ResizeHandles } from '../resize-handles';
import { WebFrameComponent } from "./web";

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
                {/* <BrowserControls
                    webviewRef={domReady ? webviewRef : null}
                    webviewSrc={webviewSrc}
                    setWebviewSrc={setWebviewSrc}
                    selected={selected}
                    hovered={hovered}
                    setHovered={setHovered}
                    setDarkmode={setDarkmode}
                    settings={settings}
                    startMove={startMove}
                    domState={domState}
                    webviewSize={webviewSize}
                /> */}
                <div className="relative">
                    <ResizeHandles frame={frame} />
                    {frame.type === FrameType.WEB && <WebFrameComponent frame={frame as WebFrame} />}
                    <GestureScreen />
                    {/* {domFailed && shouldShowDomFailed && renderNotRunning()} */}
                </div>

            </div>
        );
    });