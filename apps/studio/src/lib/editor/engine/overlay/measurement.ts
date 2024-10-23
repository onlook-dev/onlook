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
    supportLine?: {
        start: Point;
        end: Point;
    };
}

interface RectPoint extends RectDimensions {
    right: number;
    bottom: number;
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
    svgElement: SVGElement;
    private distances: Distance[] = [];

    constructor() {
        this.svgElement = document.createElementNS(this.svgNamespace, 'svg') as SVGElement;
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
        const fromRect = this.toRectPoint(fromElement);
        const toRect = this.toRectPoint(toElement);
        this.calculateHorizontalEdge(fromRect, toRect);
        this.calculateVerticalEdge(fromRect, toRect);
        this.distances.forEach((distance) => this.drawDistance(distance));

        this.svgElement.setAttribute('width', '100');
        this.svgElement.setAttribute('height', '100');
        this.svgElement.setAttribute('viewBox', '0 0 100 100');
    }

    remove() {
        this.svgElement.replaceChildren();
        this.distances = [];
    }

    private calculateHorizontalEdge(fromRect: RectPoint, toRect: RectPoint) {
        let y = fromRect.top + fromRect.height / 2;
        if (this.isIntersect(fromRect, toRect)) {
            const insideRect = this.getInsideRect(toRect, fromRect);
            if (insideRect) {
                y = insideRect.top + insideRect.height / 2;
            } else if (fromRect.bottom > toRect.bottom) {
                y = fromRect.top + (toRect.bottom - fromRect.top) / 2;
            } else {
                y = fromRect.bottom - (fromRect.bottom - toRect.top) / 2;
            }
            this.createDistance({ x: fromRect.left, y }, { x: toRect.left, y }, toRect);
            this.createDistance({ x: fromRect.right, y }, { x: toRect.right, y }, toRect);
            return;
        }

        if (fromRect.left > toRect.right) {
            this.createDistance({ x: fromRect.left, y }, { x: toRect.right, y }, toRect);
        } else if (fromRect.right < toRect.left) {
            this.createDistance({ x: fromRect.right, y }, { x: toRect.left, y }, toRect);
        } else if (
            this.isBetween(fromRect.left, toRect.left, toRect.right) &&
            fromRect.right >= toRect.left
        ) {
            this.createDistance({ x: fromRect.left, y }, { x: toRect.left, y }, toRect);
        } else if (
            this.isBetween(fromRect.right, toRect.left, toRect.right) &&
            fromRect.left <= toRect.left
        ) {
            this.createDistance({ x: fromRect.right, y }, { x: toRect.right, y }, toRect);
        } else {
            this.createDistance({ x: fromRect.left, y }, { x: toRect.left, y }, toRect);
            this.createDistance({ x: fromRect.right, y }, { x: toRect.right, y }, toRect);
        }
    }

    private calculateVerticalEdge(fromRect: RectPoint, toRect: RectPoint) {
        let x = fromRect.left + fromRect.width / 2;
        if (this.isIntersect(fromRect, toRect)) {
            const insideRect = this.getInsideRect(toRect, fromRect);
            if (insideRect) {
                x = insideRect.left + insideRect.width / 2;
            } else if (fromRect.right > toRect.right) {
                x = fromRect.left + (toRect.right - fromRect.left) / 2;
            } else {
                x = fromRect.right - (fromRect.right - toRect.left) / 2;
            }
            this.createDistance({ x, y: fromRect.top }, { x, y: toRect.top }, toRect);
            this.createDistance({ x, y: fromRect.bottom }, { x, y: toRect.bottom }, toRect);
            return;
        }

        if (fromRect.top > toRect.bottom) {
            this.createDistance({ x, y: fromRect.top }, { x, y: toRect.bottom }, toRect);
        } else if (fromRect.bottom < toRect.top) {
            this.createDistance({ x, y: fromRect.bottom }, { x, y: toRect.top }, toRect);
        } else if (this.isBetween(fromRect.top, toRect.top, toRect.bottom)) {
            this.createDistance({ x, y: fromRect.top }, { x, y: toRect.top }, toRect);
        } else if (this.isBetween(fromRect.bottom, toRect.top, toRect.bottom)) {
            this.createDistance({ x, y: fromRect.bottom }, { x, y: toRect.bottom }, toRect);
        } else {
            this.createDistance({ x, y: fromRect.top }, { x, y: toRect.top }, toRect);
            this.createDistance({ x, y: fromRect.bottom }, { x, y: toRect.bottom }, toRect);
        }
    }

    private createDistance(start: Point, end: Point, toRect: RectPoint) {
        const isHorizontal = start.y === end.y;
        const newDistance: Distance = {
            value: Math.abs(isHorizontal ? end.x - start.x : end.y - start.y),
            start,
            end,
        };

        if (isHorizontal && !this.isBetween(start.y, toRect.top, toRect.bottom)) {
            newDistance.supportLine = {
                start: { x: end.x, y: toRect.top },
                end: { x: end.x, y: end.y },
            };
        } else if (!isHorizontal && !this.isBetween(start.x, toRect.left, toRect.right)) {
            newDistance.supportLine = {
                start: { x: toRect.left, y: end.y },
                end: { x: end.x, y: end.y },
            };
        }

        this.distances.push(newDistance);
    }

    private drawDistance(distance: Distance): void {
        if (distance.value <= 0) {
            return;
        }
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

        const isHorizontal = distance.start.x === distance.end.x;
        const midX = (distance.start.x + distance.end.x) / 2 + (isHorizontal ? 24 : 0);
        const midY = (distance.start.y + distance.end.y) / 2 + (isHorizontal ? 0 : 16);

        const textElement = document.createElementNS(this.svgNamespace, 'text') as SVGTextElement;
        textElement.setAttribute('x', midX.toString());
        textElement.setAttribute('y', midY.toString());
        textElement.setAttribute('font-size', '12');
        textElement.setAttribute('fill', 'white');
        textElement.setAttribute('text-anchor', 'middle');
        textElement.setAttribute('dominant-baseline', 'middle');
        textElement.textContent = `${parseInt(distance.value.toString())}`;

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
            lineElement.setAttribute('stroke-dasharray', '10 6');
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

    private isBetween(x: number, start: number, end: number) {
        return (start <= x && x <= end) || (end <= x && x <= start);
    }

    private toRectPoint(rect: RectDimensions): RectPoint {
        return { ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height };
    }

    private isIntersect(rectA: RectPoint, rectB: RectPoint) {
        if (rectA.left > rectB.right || rectB.left > rectA.right) {
            return false;
        }

        if (rectA.top > rectB.bottom || rectB.top > rectA.bottom) {
            return false;
        }

        return true;
    }

    private getInsideRect(rectA: RectPoint, rectB: RectPoint) {
        if (
            rectA.left >= rectB.left &&
            rectA.right <= rectB.right &&
            rectA.top >= rectB.top &&
            rectA.bottom <= rectB.bottom
        ) {
            return rectA;
        } else if (
            rectB.left >= rectA.left &&
            rectB.right <= rectA.right &&
            rectB.top >= rectA.top &&
            rectB.bottom <= rectA.bottom
        ) {
            return rectB;
        }
        return null;
    }
}
