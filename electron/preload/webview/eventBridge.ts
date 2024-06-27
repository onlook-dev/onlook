import { ipcRenderer } from 'electron';
import { handleMouseEvent } from './elements';

export class EventBridge {
    constructor() { }

    init() {
        ipcRenderer.sendToHost("key", {});

        this.setForwardingToHost();
        this.setListenToHostEvents();
    }

    eventHandlerMap: { [key: string]: (e: any) => Object } = {
        'mouseover': handleMouseEvent,
        'wheel': (e: WheelEvent) => {
            return {
                coordinates: { x: e.deltaX, y: e.deltaY },
                innerHeight: document.body.scrollHeight,
                innerWidth: window.innerWidth,
            }
        },
        'scroll': (e: Event) => {
            return {
                coordinates: { x: window.scrollX, y: window.scrollY },
                innerHeight: document.body.scrollHeight,
                innerWidth: window.innerWidth,
            }
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
        ipcRenderer.sendToHost("key", {});
        Object.entries(this.eventHandlerMap).forEach(([key, handler]) => {
            document.body.addEventListener(key, (e) => {
                const data = JSON.stringify(handler(e));
                ipcRenderer.sendToHost(key, data);
            });
        })
    }

    setListenToHostEvents() {

    }
}