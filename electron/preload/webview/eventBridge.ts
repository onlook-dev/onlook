import { ipcRenderer } from 'electron';
import { handleMouseEvent } from './elements';

export class EventBridge {
    constructor() { }

    init() {
        this.setForwardingToHost();
        this.setListenToHostEvents();
    }

    eventHandlerMap: Record<string, (e: any) => Object> = {
        'mouseover': handleMouseEvent,
        'click': handleMouseEvent,
        'dblclick': handleMouseEvent,
        'wheel': (e: WheelEvent) => {
            return {}
        },
        'scroll': (e: Event) => {
            return {}
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