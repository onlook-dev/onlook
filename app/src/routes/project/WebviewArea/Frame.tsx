import { WebviewMessageBridge } from '@/lib/editor/messageBridge';
import { WebviewMetadata } from '@/lib/models';

import { Button } from '@/components/ui/button';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { useEditorEngine } from '..';
import BrowserControls from './BrowserControl';
import GestureScreen from './GestureScreen';
import ResizeHandles from './ResizeHandles';
import { Links } from '/common/constants';

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
        const [webviewSize, setWebviewSize] = useState({ width: 1536, height: 960 });
        const [domFailed, setDomFailed] = useState(false);
        const RETRY_TIMEOUT = 3000;

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
            webview.addEventListener('did-fail-load', handleDomFailed);
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
            editorEngine.dom.setDom(metadata.id, rootNode);

            setDomFailed(rootNode.children.length === 0);
        }

        function handleDomFailed() {
            setDomFailed(true);
            setTimeout(() => {
                const webview = webviewRef?.current as Electron.WebviewTag | null;
                if (webview) {
                    webview.reload();
                }
            }, RETRY_TIMEOUT);
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
                    <GestureScreen
                        webviewRef={webviewRef}
                        setHovered={setHovered}
                        metadata={metadata}
                    />
                    {domFailed && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black border">
                            <p className="text-white">No projects found</p>
                            <Button
                                variant={'link'}
                                onClick={() => {
                                    window.open(Links.USAGE_DOCS, '_blank');
                                }}
                            >
                                See usage instructions <ExternalLinkIcon className="ml-2" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    },
);

export default Webview;
