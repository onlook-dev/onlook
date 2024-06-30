import { ipcRenderer } from 'electron';
import { handleMouseEvent } from './elements';
import { IpcChannels } from '/common/constants';

export class EventBridge {
    constructor() { }

    init() {
        this.setForwardingToHost();
        this.setListenToHostEvents();
    }

    LOCAL_EVENT_HANDLERS: Record<string, (e: any) => Object> = {
        'mouseover': handleMouseEvent,
        'click': handleMouseEvent,
        'dblclick': handleMouseEvent,
        'wheel': (e: WheelEvent) => {
            return { x: window.scrollX, y: window.scrollY }
        },
        'scroll': (e: Event) => {
            return { x: window.scrollX, y: window.scrollY }
        },
        'dom-ready': () => {
            const { body } = document;
            const html = document.documentElement;

            const height = Math.max(
                body.scrollHeight,
                body.offsetHeight,
                html.clientHeight,
                html.scrollHeight,
                html.offsetHeight
            );

            return {
                coordinates: { x: 0, y: 0 },
                innerHeight: height,
                innerWidth: window.innerWidth,
            }
        }
    }

    setForwardingToHost() {
        Object.entries(this.LOCAL_EVENT_HANDLERS).forEach(([key, handler]) => {
            document.body.addEventListener(key, (e) => {
                const data = JSON.stringify(handler(e));
                ipcRenderer.sendToHost(key, data);
            });
        })
    }

    setListenToHostEvents() {
        // TODO: Use injected CSS to allow for hover
        ipcRenderer.on(IpcChannels.UPDATE_STYLE, (_, data) => {
            const { selector, style, value } = data;
            const element = document.querySelector(selector);
            if (!element) return;
            element.style[style as any] = value;
        });
    }
}