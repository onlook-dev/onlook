import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import BrowserControls from './BrowserControl';
import GestureScreen from './GestureScreen';

const Webview = observer(
    ({
        messageBridge,
        metadata,
    }: {
        messageBridge: WebviewMessageBridge;
        metadata: WebviewMetadata;
    }) => {
        const webviewRef = useRef<Electron.WebviewTag>(null);
        const editorEngine = useEditorEngine();
        const [webviewSrc, setWebviewSrc] = useState<string>(metadata.src);
        const [selected, setSelected] = useState<boolean>(false);
        const [hovered, setHovered] = useState<boolean>(false);
        const webviewPreloadPath = window.env.WEBVIEW_PRELOAD_PATH;
        const resizeHandleRef = useRef(null);
        const [webviewSize, setWebviewSize] = useState({ width: 960, height: 600 });

        useEffect(setupFrame, [webviewRef]);
        useEffect(
            () => setSelected(editorEngine.webviews.isSelected(metadata.id)),
            [editorEngine.webviews.webviews],
        );

        function setupFrame() {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }

            editorEngine.webviews.register(webview);
            setWebviewListeners(webview);

            return () => {
                editorEngine.webviews.deregister(webview);
                messageBridge.deregister(webview);
                webview.removeEventListener('did-navigate', handleUrlChange);
            };
        }

        function setWebviewListeners(webview: Electron.WebviewTag) {
            messageBridge.register(webview, metadata);
            webview.addEventListener('did-navigate', handleUrlChange);
            webview.addEventListener('dom-ready', handleDomReady);
        }


        function handleUrlChange(e: any) {
            setWebviewSrc(e.url);
            editorEngine.clear();
        }

        async function handleDomReady() {
            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview) {
                return;
            }

            const htmlString = await webview.executeJavaScript(
                'document.documentElement.outerHTML',
            );
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');
            const rootNode = doc.body;
            editorEngine.webviews.setDom(metadata.id, rootNode);
        }


        const startResize: React.MouseEventHandler<HTMLDivElement> = (e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = webviewSize.width;
            const startHeight = webviewSize.height;
    
            const doResize = (e: MouseEvent) => {
                const currentWidth = startWidth + (e.clientX - startX);
                const currentHeight = startHeight + (e.clientY - startY);
                setWebviewSize({ width: currentWidth, height: currentHeight });
            };
    
            const stopResize = () => {
                window.removeEventListener('mousemove', doResize);
                window.removeEventListener('mouseup', stopResize);
            };
    
            window.addEventListener('mousemove', doResize);
            window.addEventListener('mouseup', stopResize);
        };

        return (
            <div className="flex flex-col space-y-4">
                <BrowserControls
                    webviewRef={webviewRef}
                    webviewSrc={webviewSrc}
                    setWebviewSrc={setWebviewSrc}
                    selected={selected}
                    hovered={hovered}
                    setHovered={setHovered}
                />
                {webviewPreloadPath && (
                    <div className="relative">
                        <webview
                            id={metadata.id}
                            // ref={webviewRef}
                            className="w-[96rem] h-[60rem] bg-black/10 backdrop-blur-sm transition"
                            src={metadata.src}
                            preload={`file://${webviewPreloadPath}`}
                            allowpopups={'true' as any}
                            style={{ width: webviewSize.width, height: webviewSize.height }}
                        ></webview>
                        <div
                            ref={resizeHandleRef}
                            className="absolute -bottom-10 -right-10 cursor-se-resize"
                            style={{ width: '20px', height: '20px', backgroundColor: 'gray' }}
                            onMouseDown={startResize}
                        ></div>
                        <GestureScreen webviewRef={webviewRef} setHovered={setHovered} />
                    </div>
                )}
            </div>
        );
    },
);

export default Webview;
