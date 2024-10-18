// @ts-expect-error - No types for tokens
import { colors } from '/common/tokens';

import { RectDimensions } from './rect';
import { EditorAttributes } from '/common/constants';

interface Point {
    x: number;
    y: number;
}

interface Distance {
    value: number;
    start: Point;
    end: Point;
    direction: 'horizontal' | 'vertical';
    supportLine?: {
        start: Point;
        end: Point;
    };
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
        this.remove();
        this.createRect(fromElement);
        this.createRect(toElement);
        const distances = this.calculateDistances(fromElement, toElement);
        distances.forEach((distance) => this.drawDistance(distance));
        this.svgElement.setAttribute('width', '100');
        this.svgElement.setAttribute('height', '100');
        this.svgElement.setAttribute('viewBox', '0 0 100 100');
    }

    remove() {
        this.svgElement.replaceChildren();
    }

    private drawDistance(distance: Distance): void {
        // Draw line
        this.createLine(distance.start.x, distance.start.y, distance.end.x, distance.end.y);
        if (distance.supportLine) {
            this.createLine(
                distance.supportLine.start.x,
                distance.supportLine.start.y,
                distance.supportLine.end.x,
                distance.supportLine.end.y,
                { dash: true },
            );
        }

        // Draw label
        const midX =
            (distance.start.x + distance.end.x) / 2 +
            (distance.direction === 'horizontal' ? 0 : 24);
        const midY =
            (distance.start.y + distance.end.y) / 2 +
            (distance.direction === 'horizontal' ? 16 : 0);

        const textElement = document.createElementNS(this.svgNamespace, 'text') as SVGTextElement;
        textElement.setAttribute('x', midX.toString());
        textElement.setAttribute('y', midY.toString());
        textElement.setAttribute('font-size', '12');
        textElement.setAttribute('fill', 'white');
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'middle');
        textElement.textContent = `${parseInt(distance.value.toString())}`;

        // Temporarily add the text to measure it
        this.svgElement.appendChild(textElement);
        const bbox = textElement.getBBox();
        this.svgElement.removeChild(textElement);

        const padding = { top: 2, bottom: 2, left: 4, right: 4 };
        const rectWidth = bbox.width + padding.left + padding.right;
        const rectHeight = bbox.height + padding.top + padding.bottom;
        const rectX = midX - rectWidth / 2;
        const rectY = midY - rectHeight / 2;

        const textRect = document.createElementNS(this.svgNamespace, 'rect');
        textRect.setAttribute('x', rectX.toString());
        textRect.setAttribute('y', rectY.toString());
        textRect.setAttribute('width', rectWidth.toString());
        textRect.setAttribute('height', rectHeight.toString());
        textRect.setAttribute('fill', colors.red[500]);
        textRect.setAttribute('rx', '2');

        this.svgElement.appendChild(textRect);
        this.svgElement.appendChild(textElement);
    }

    private createLine(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        options?: { dash?: boolean },
    ) {
        const lineElement = document.createElementNS(this.svgNamespace, 'line');
        lineElement.setAttribute('stroke', colors.red[500]);
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
        rectElement.setAttribute('stroke', colors.red[500]);
        rectElement.setAttribute('stroke-width', '1');
        rectElement.setAttribute('stroke-linecap', 'round');
        rectElement.setAttribute('stroke-linejoin', 'round');

        rectElement.setAttribute('width', width.toString());
        rectElement.setAttribute('height', height.toString());
        rectElement.setAttribute('x', left.toString());
        rectElement.setAttribute('y', top.toString());

        this.svgElement.appendChild(rectElement);
    }

    private calculateDistances(rect1: RectDimensions, rect2: RectDimensions): Distance[] {
        const distances: Distance[] = [];

        // Horizontal distances
        if (rect1.left + rect1.width <= rect2.left) {
            distances.push(this.calculateHorizontalDistance(rect1, rect2));
        } else if (rect2.left + rect2.width <= rect1.left) {
            distances.push(this.calculateHorizontalDistance(rect2, rect1));
        }

        // Vertical distances
        if (rect1.top + rect1.height <= rect2.top) {
            distances.push(this.calculateVerticalDistance(rect1, rect2));
        } else if (rect2.top + rect2.height <= rect1.top) {
            distances.push(this.calculateVerticalDistance(rect2, rect1));
        }

        return distances;
    }

    private calculateHorizontalDistance(
        leftRect: RectDimensions,
        rightRect: RectDimensions,
    ): Distance {
        const startX = leftRect.left + leftRect.width;
        const endX = rightRect.left;
        const y =
            Math.max(leftRect.top, rightRect.top) + Math.min(leftRect.height, rightRect.height) / 2;

        return {
            value: endX - startX,
            start: { x: startX, y },
            end: { x: endX, y },
            direction: 'horizontal',
        };
    }

    private calculateVerticalDistance(
        topRect: RectDimensions,
        bottomRect: RectDimensions,
    ): Distance {
        const startY = topRect.top + topRect.height;
        const endY = bottomRect.top;
        const x =
            Math.max(topRect.left, bottomRect.left) + Math.min(topRect.width, bottomRect.width) / 2;

        return {
            value: endY - startY,
            start: { x, y: startY },
            end: { x, y: endY },
            direction: 'vertical',
        };
    }
}
