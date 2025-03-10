import type { EditorEngine } from './engine';
import { WebviewEventHandler } from './eventHandler';

interface IframeContext {
    handlerRemovers: (() => void)[];
}

export class IframeMessageBridge {
    iframes: Map<string, IframeContext> = new Map();
    eventHandlers: Record<string, (e: any) => void>;
    
    constructor(editorEngine: EditorEngine) {
        const webviewEventHandler = new WebviewEventHandler(editorEngine);
        this.eventHandlers = {
            'message': this.handleMessage.bind(this, webviewEventHandler),
        };
    }
    
    handleMessage(eventHandler: WebviewEventHandler, e: MessageEvent) {
        // Only accept messages from our iframes
        const sourceWindow = e.source as Window;
        const frameElement = sourceWindow?.frameElement as HTMLIFrameElement;
        if (!frameElement || !this.iframes.has(frameElement.id || '')) {
            return;
        }
        
        const { channel, args } = e.data;
        if (!channel) return;
        
        // Create a compatible event object for the handler
        const compatEvent = {
            channel,
            args,
            target: frameElement,
        };
        
        eventHandler.handleIpcMessage(compatEvent as any);
    }
    
    register(iframe: HTMLIFrameElement, id: string) {
        const handlerRemovers: (() => void)[] = [];
        Object.entries(this.eventHandlers).forEach(([event, handler]) => {
            window.addEventListener(event, handler as any);
            handlerRemovers.push(() => {
                window.removeEventListener(event, handler as any);
            });
        });
        this.iframes.set(id, { handlerRemovers });
    }
    
    deregister(iframe: HTMLIFrameElement) {
        const context = this.iframes.get(iframe.id);
        if (!context) {
            return;
        }
        context.handlerRemovers.forEach((removeHandler) => removeHandler());
        this.iframes.delete(iframe.id);
    }
    
    dispose() {
        // Clean up all iframe event handlers
        Array.from(this.iframes.values()).forEach((context) => {
            context.handlerRemovers.forEach((removeHandler) => removeHandler());
        });
        this.iframes.clear();
        
        // Clear event handlers
        this.eventHandlers = {};
    }
}
