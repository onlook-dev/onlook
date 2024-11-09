import { colors } from '@onlook/ui/tokens';

import { EditorAttributes } from '@onlook/models/constants';
import { nanoid } from 'nanoid';

export interface RectDimensions {
    width: number;
    height: number;
    top: number;
    left: number;
}

interface Rect {
    element: HTMLElement;
    svgNamespace: string;
    svgElement: Element;
    rectElement: Element;
    render: (rectDimensions: RectDimensions) => void;
}

export class RectImpl implements Rect {
    element: HTMLElement;
    svgNamespace = 'http://www.w3.org/2000/svg';
    svgElement: Element;
    rectElement: Element;

    constructor() {
        this.rectElement = document.createElementNS(this.svgNamespace, 'rect');
        this.rectElement.setAttribute('fill', 'none');
        this.rectElement.setAttribute('stroke', colors.red.DEFAULT);
        this.rectElement.setAttribute('stroke-width', '2');
        this.rectElement.setAttribute('stroke-linecap', 'round');
        this.rectElement.setAttribute('stroke-linejoin', 'round');

        this.svgElement = document.createElementNS(this.svgNamespace, 'svg');
        this.svgElement.setAttribute('overflow', 'visible');
        this.svgElement.appendChild(this.rectElement);

        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'none'; // Ensure it doesn't interfere with other interactions
        this.element.style.zIndex = '999';
        this.element.setAttribute(EditorAttributes.DATA_ONLOOK_IGNORE, 'true');
        this.element.setAttribute('id', EditorAttributes.ONLOOK_RECT_ID);
        this.element.appendChild(this.svgElement);
    }

    render({ width, height, top, left }: RectDimensions, isComponent = false) {
        this.svgElement.setAttribute('width', width.toString());
        this.svgElement.setAttribute('height', height.toString());
        this.svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.rectElement.setAttribute('width', width.toString());
        this.rectElement.setAttribute('height', height.toString());
        this.rectElement.setAttribute('stroke', isComponent ? colors.purple[500] : colors.red[500]);
        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;
    }
}

export class HoverRect extends RectImpl {
    constructor() {
        super();
        this.rectElement.setAttribute('stroke-width', '1');
    }

    render(rectDimensions: RectDimensions, isComponent?: boolean) {
        super.render(rectDimensions, isComponent);
    }
}

export class InsertRect extends RectImpl {
    constructor() {
        super();
        this.rectElement.setAttribute('stroke-width', '1');
    }

    render(rectDimensions: RectDimensions) {
        super.render(rectDimensions);
    }
}

export class ClickRect extends RectImpl {
    constructor() {
        super();
        this.rectElement.setAttribute('stroke-width', '2');
    }

    parseCssBoxValues(boxValue: string) {
        const values = boxValue.split(' ').map(Number.parseFloat);
        if (values.length === 1) {
            return {
                top: values[0],
                right: values[0],
                bottom: values[0],
                left: values[0],
            };
        } else if (values.length === 2) {
            return {
                top: values[0],
                right: values[1],
                bottom: values[0],
                left: values[1],
            };
        } else if (values.length === 3) {
            return {
                top: values[0],
                right: values[1],
                bottom: values[2],
                left: values[1],
            };
        } else {
            return {
                top: values[0],
                right: values[1],
                bottom: values[2],
                left: values[3],
            };
        }
    }

    createStripePattern(color = '#FF0E48') {
        // Define a larger pattern for spaced-out stripes
        const pattern = document.createElementNS(this.svgNamespace, 'pattern');
        const patternId = 'pattern-' + nanoid();
        pattern.setAttribute('id', patternId);
        pattern.setAttribute('patternUnits', 'userSpaceOnUse');
        pattern.setAttribute('width', '20'); // Increased pattern width for spacing
        pattern.setAttribute('height', '20'); // Increased pattern height for spacing

        // Create a background rectangle for the pattern
        const background = document.createElementNS(this.svgNamespace, 'rect');
        background.setAttribute('width', '20'); // Match pattern width
        background.setAttribute('height', '20'); // Match pattern height
        background.setAttribute('fill', color); // Background color
        background.setAttribute('fill-opacity', '0.1'); // Low opacity

        // Create multiple diagonal lines for the pattern to ensure connectivity
        // Adjust the number of lines and their positions if you modify the pattern size
        const createLine = (x1: string, y1: string, x2: string, y2: string) => {
            const line = document.createElementNS(this.svgNamespace, 'line');
            line.setAttribute('x1', x1);
            line.setAttribute('y1', y1);
            line.setAttribute('x2', x2);
            line.setAttribute('y2', y2);
            line.setAttribute('stroke', color); // Stripe color
            line.setAttribute('stroke-width', '0.3'); // Adjusted for visibility in larger pattern
            line.setAttribute('stroke-linecap', 'square');
            return line;
        };

        // Add the background rectangle to the pattern first
        pattern.appendChild(background);

        // Add lines to the pattern for a seamless connection across repeats
        // The lines are drawn from corner to corner
        pattern.appendChild(createLine('0', '20', '20', '0')); // Main diagonal line

        // Add the pattern to the SVG
        this.svgElement.appendChild(pattern);

        return patternId;
    }

    updateMargin(margin: string, { width, height }: { width: number; height: number }) {
        const {
            top: mTop,
            right: mRight,
            bottom: mBottom,
            left: mLeft,
        } = this.parseCssBoxValues(margin);
        // Adjust position and size based on margins
        const mWidth = width + mLeft + mRight;
        const mHeight = height + mTop + mBottom;
        const mX = -mLeft;
        const mY = -mTop;

        const patternId = this.createStripePattern('#FF00FF');

        // Create and style the margin rectangle
        const marginRect = document.createElementNS(this.svgNamespace, 'rect');
        marginRect.setAttribute('x', mX.toString());
        marginRect.setAttribute('y', mY.toString());
        marginRect.setAttribute('width', mWidth.toString());
        marginRect.setAttribute('height', mHeight.toString());
        marginRect.setAttribute('fill', `url(#${patternId})`); // Use the pattern
        marginRect.setAttribute('stroke', 'none');

        // Create a mask element
        const mask = document.createElementNS(this.svgNamespace, 'mask');
        const maskId = 'mask-' + nanoid(); // Unique ID for the mask
        mask.setAttribute('id', maskId);

        // Create a white rectangle for the mask that matches the element size
        // This rectangle allows the content beneath to show through where it overlaps with the marginRect
        const maskRect = document.createElementNS(this.svgNamespace, 'rect');
        maskRect.setAttribute('x', mX.toString());
        maskRect.setAttribute('y', mY.toString());
        maskRect.setAttribute('width', mWidth.toString());
        maskRect.setAttribute('height', mHeight.toString());
        maskRect.setAttribute('fill', 'white'); // White areas of a mask are fully visible

        // Create the cutoutRect for the mask, which will block out the center
        const cutoutRect = document.createElementNS(this.svgNamespace, 'rect');
        cutoutRect.setAttribute('x', '0');
        cutoutRect.setAttribute('y', '0');
        cutoutRect.setAttribute('width', width.toString());
        cutoutRect.setAttribute('height', height.toString());
        cutoutRect.setAttribute('fill', 'black'); // Black areas of a mask are fully transparent

        // Append the maskRect and cutoutRect to the mask
        mask.appendChild(maskRect);
        mask.appendChild(cutoutRect);

        // Add the mask to the SVG
        this.svgElement.appendChild(mask);

        // Apply the mask to the marginRect
        marginRect.setAttribute('mask', `url(#${maskId})`);

        // Add the marginRect to the SVG, which is now masked
        this.svgElement.appendChild(marginRect);
    }

    updatePadding(padding: string, { width, height }: { width: number; height: number }) {
        const {
            top: pTop,
            right: pRight,
            bottom: pBottom,
            left: pLeft,
        } = this.parseCssBoxValues(padding);
        // Adjust position and size based on paddings
        const pWidth = width - pLeft - pRight;
        const pHeight = height - pTop - pBottom;
        const pX = pLeft;
        const pY = pTop;

        const patternId = this.createStripePattern('green');

        // Create and style the padding rectangle
        const fullRect = document.createElementNS(this.svgNamespace, 'rect');
        fullRect.setAttribute('x', '0');
        fullRect.setAttribute('y', '0');
        fullRect.setAttribute('width', width.toString());
        fullRect.setAttribute('height', height.toString());
        fullRect.setAttribute('fill', `url(#${patternId})`); // Use the pattern
        fullRect.setAttribute('stroke', 'none');

        // // Create a mask element
        const mask = document.createElementNS(this.svgNamespace, 'mask');
        const maskId = 'mask-' + nanoid(); // Unique ID for the mask
        mask.setAttribute('id', maskId);

        // // Create a white rectangle for the mask that matches the element size
        // // This rectangle allows the content beneath to show through where it overlaps with the marginRect
        const maskRect = document.createElementNS(this.svgNamespace, 'rect');
        maskRect.setAttribute('x', '0');
        maskRect.setAttribute('y', '0');
        maskRect.setAttribute('width', width.toString());
        maskRect.setAttribute('height', height.toString());
        maskRect.setAttribute('fill', 'white');

        // // Create the cutoutRect for the mask, which will block out the center
        const cutoutRect = document.createElementNS(this.svgNamespace, 'rect');
        cutoutRect.setAttribute('x', pX.toString());
        cutoutRect.setAttribute('y', pY.toString());
        cutoutRect.setAttribute('width', pWidth.toString());
        cutoutRect.setAttribute('height', pHeight.toString());
        cutoutRect.setAttribute('fill', 'black'); // Black areas of a mask are fully transparent

        // // Append the maskRect and cutoutRect to the mask
        mask.appendChild(maskRect);
        mask.appendChild(cutoutRect);

        // // Add the mask to the SVG
        this.svgElement.appendChild(mask);

        // // Apply the mask to the marginRect
        fullRect.setAttribute('mask', `url(#${maskId})`);

        // Add the marginRect to the SVG, which is now masked
        this.svgElement.appendChild(fullRect);
    }

    showDimensions(width: number, height: number, isComponent = false) {
        const text = document.createElementNS(this.svgNamespace, 'text') as SVGTextElement;
        text.setAttribute('x', '0');
        text.setAttribute('y', '0');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '12');
        text.textContent = `${Number.parseInt(width.toString())} × ${Number.parseInt(height.toString())}`;

        // Temporarily add the text to measure it
        this.svgElement.appendChild(text);
        const bbox = text.getBBox();
        this.svgElement.removeChild(text);

        const padding = { top: 2, bottom: 2, left: 4, right: 4 };
        const rectWidth = bbox.width + padding.left + padding.right;
        const rectHeight = bbox.height + padding.top + padding.bottom;
        const rectX = (width - rectWidth) / 2;
        const rectY = height;

        const textRect = document.createElementNS(this.svgNamespace, 'path');
        const radius = 2;
        const bottomLeftQuadCurve = `q0,${radius} ${radius},${radius}`;
        const bottomRightQuadCurve = `q${radius},0 ${radius},-${radius}`;

        if (rectWidth > width) {
            const topLeftQuadCurve = `q-${radius},0 -${radius},${radius}`;
            const topRightQuadCurve = `q0,${-radius} -${radius},-${radius}`;

            textRect.setAttribute(
                'd',
                // M = Move, h<length> = horizontal, v<length> = vertical, q = quadratic bezier curve via control point, z = close the path
                `M${rectX + radius},${rectY} ${topLeftQuadCurve} v${rectHeight - 2 * radius} ${bottomLeftQuadCurve} h${rectWidth - 2 * radius} ${bottomRightQuadCurve} v-${rectHeight - 2 * radius} ${topRightQuadCurve} z`,
            );
        } else {
            textRect.setAttribute(
                'd',
                // M = Move, h<length> = horizontal, v<length> = vertical, q = quadratic bezier curve via control point, z = close the path
                `M${rectX},${rectY} v${rectHeight - radius} ${bottomLeftQuadCurve} h${rectWidth - 2 * radius} ${bottomRightQuadCurve} v-${rectHeight - radius} z`,
            );
        }

        textRect.setAttribute('fill', isComponent ? colors.purple[500] : colors.red[500]);

        // Adjust text position
        text.setAttribute('x', `${width / 2}`);
        text.setAttribute('y', `${rectY + rectHeight / 2}`);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');

        this.svgElement.appendChild(textRect);
        this.svgElement.appendChild(text);
    }

    render(
        {
            width,
            height,
            top,
            left,
            margin,
            padding,
        }: {
            width: number;
            height: number;
            top: number;
            left: number;
            margin: string;
            padding: string;
        },
        isComponent?: boolean,
    ) {
        // Sometimes a selected element can be removed. We handle this gracefully.
        try {
            this.updateMargin(margin, { width, height });
            this.updatePadding(padding, { width, height });
            this.showDimensions(width, height, isComponent);

            // Render the base rect (the element itself) on top
            super.render({ width, height, top, left }, isComponent);
        } catch (error) {
            console.warn(error);
        }
    }
}
