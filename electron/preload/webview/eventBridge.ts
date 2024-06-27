import { ipcRenderer } from 'electron';

export class EventBridge {
    constructor() { }

    init() {
        this.setForwardToHostEvents();
        this.setListenToHostEvents();
    }

    eventHandlerMap: { [key: string]: (e: any) => Object } = {
        'mouseover': (e: MouseEvent) => {
            return {
                el: e.target
            }
        },
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

    setForwardToHostEvents() {
        Object.entries(this.eventHandlerMap).forEach(([key, handler]) => {
            document.body.addEventListener(key, (e) => {
                const data = handler(e);
                ipcRenderer.sendToHost(key, data);
            });
        })
    }

    setListenToHostEvents() {

    }
}