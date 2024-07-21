import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';

import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import BrowserControls from './BrowserControl';
import GestureScreen from './GestureScreen';
import ResizeHandles from './ResizeHandles';

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
            messageBridge.register(webview, metadata);
            setBrowserEventListeners(webview);

            return () => {
                editorEngine.webviews.deregister(webview);
                messageBridge.deregister(webview);
                webview.removeEventListener('did-navigate', handleUrlChange);
            };
        }

        function setBrowserEventListeners(webview: Electron.WebviewTag) {
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
                <div className="relative">
                    <ResizeHandles
                        webviewRef={webviewRef}
                        webviewSize={webviewSize}
                        setWebviewSize={setWebviewSize}
                    />
                    <webview
                        id={metadata.id}
                        ref={webviewRef}
                        className="w-[96rem] h-[60rem] bg-black/10 backdrop-blur-sm transition"
                        src={metadata.src}
                        preload={`file://${window.env.WEBVIEW_PRELOAD_PATH}`}
                        allowpopups={'true' as any}
                        style={{ width: webviewSize.width, height: webviewSize.height }}
                    ></webview>
                    <GestureScreen webviewRef={webviewRef} setHovered={setHovered} />
                </div>
            </div>
        );
    },
);

export default Webview;
