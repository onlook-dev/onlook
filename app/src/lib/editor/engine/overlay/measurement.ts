// @ts-expect-error - No types for tokens
import { colors } from '/common/tokens';

import { RectDimensions } from './rect';
import { EditorAttributes } from '/common/constants';

interface Point {
    x: number;
    y: number;
}
interface Measurement {
    element: HTMLElement;
    svgNamespace: string;
    svgElement: Element;
    render: (fromElement: RectDimensions, toElement: RectDimensions) => void;
}
export class MeasurementImpl implements Measurement {
    element: HTMLElement;
    svgNamespace: string = 'http://www.w3.org/2000/svg';
    svgElement: Element;

    constructor() {
        this.svgElement = document.createElementNS(this.svgNamespace, 'svg');
        this.svgElement.setAttribute('overflow', 'visible');

        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'none';
        this.element.style.zIndex = '1000';
        this.element.setAttribute(EditorAttributes.DATA_ONLOOK_IGNORE, 'true');
        this.element.appendChild(this.svgElement);
    }

    render(fromElement: RectDimensions, toElement: RectDimensions) {
      
      const [distance, int1, int2] = this.calculateDistance(fromElement, toElement);
      
        this.createLine(int1.x, int1.y, int2.x, int2.y);
        this.createRect(fromElement);
        this.createRect(toElement);
        this.svgElement.setAttribute('width', '100');
        this.svgElement.setAttribute('height', '100');
        this.svgElement.setAttribute('viewBox', '0 0 100 100');
    }

    remove() {
        this.svgElement.replaceChildren();
    }

    private createLine(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        options?: { dash?: boolean },
    ) {
        const lineElement = document.createElementNS(this.svgNamespace, 'line');
        lineElement.setAttribute('stroke', colors.red.DEFAULT);
        lineElement.setAttribute('stroke-width', '1');
        lineElement.setAttribute('stroke-linecap', 'round');
        lineElement.setAttribute('stroke-linejoin', 'round');
        if (options?.dash) {
            lineElement.setAttribute('stroke-dasharray', '4 10');
        }

        lineElement.setAttribute('x1', x1.toString());
        lineElement.setAttribute('y1', y1.toString());
        lineElement.setAttribute('x2', x2.toString());
        lineElement.setAttribute('y2', y2.toString());

        this.svgElement.appendChild(lineElement);
    }

    private createRect({ width, height, top, left }: RectDimensions) {
        const rectElement = document.createElementNS(this.svgNamespace, 'rect');
        rectElement.setAttribute('fill', 'none');
        rectElement.setAttribute('stroke', colors.red.DEFAULT);
        rectElement.setAttribute('stroke-width', '1');
        rectElement.setAttribute('stroke-linecap', 'round');
        rectElement.setAttribute('stroke-linejoin', 'round');

        rectElement.setAttribute('width', width.toString());
        rectElement.setAttribute('height', height.toString());
        rectElement.setAttribute('x', left.toString());
        rectElement.setAttribute('y', top.toString());

        this.svgElement.appendChild(rectElement);
    }

    private calculateDistance(rect1: RectDimensions, rect2: RectDimensions): [number, Point, Point] {
        const center1: Point = {
            x: rect1.left + rect1.width / 2,
            y: rect1.top + rect1.height / 2,
        };
        const center2: Point = {
            x: rect2.left + rect2.width / 2,
            y: rect2.top + rect2.height / 2,
        };

        const dx = center2.x - center1.x;
        const dy = center2.y - center1.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const unitDx = dx / length;
        const unitDy = dy / length;

        const int1 = this.findIntersection(rect1, center1, unitDx, unitDy);
        const int2 = this.findIntersection(rect2, center2, -unitDx, -unitDy);

        const distance = Math.sqrt(Math.pow(int2.x - int1.x, 2) + Math.pow(int2.y - int1.y, 2));

        return [distance, int1, int2];
    }

    private findIntersection(rect: RectDimensions, center: Point, dx: number, dy: number): Point {
        let t: number;
        if (Math.abs(dx) > Math.abs(dy)) {
            t = dx > 0 ? (rect.left + rect.width - center.x) / dx : (rect.left - center.x) / dx;
        } else {
            t = dy > 0 ? (rect.top + rect.height - center.y) / dy : (rect.top - center.y) / dy;
        }
        return {
            x: center.x + t * dx,
            y: center.y + t * dy,
        };
    }
}
