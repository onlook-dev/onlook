import { colors } from '@onlook/ui/tokens';
import { nanoid } from 'nanoid';
import React from 'react';
import type { RectDimensions } from './BaseRect';
import { BaseRect } from './BaseRect';

interface ClickRectProps extends RectDimensions {
    isComponent?: boolean;
    margin?: string;
    padding?: string;
    styles?: Record<string, string>;
}

const parseCssBoxValues = (value: string) => {
    const values = value.split(' ').map((v) => parseInt(v));
    switch (values.length) {
        case 1:
            return { top: values[0], right: values[0], bottom: values[0], left: values[0] };
        case 2:
            return { top: values[0], right: values[1], bottom: values[0], left: values[1] };
        case 4:
            return { top: values[0], right: values[1], bottom: values[2], left: values[3] };
        default:
            return { top: 0, right: 0, bottom: 0, left: 0 };
    }
};

export const ClickRect: React.FC<ClickRectProps> = ({
    width,
    height,
    top,
    left,
    isComponent,
    styles,
}) => {
    const renderMargin = () => {
        if (!styles?.margin) {
            return null;
        }
        const {
            top: mTop,
            right: mRight,
            bottom: mBottom,
            left: mLeft,
        } = parseCssBoxValues(styles.margin);

        const patternId = `margin-pattern-${nanoid()}`;
        const maskId = `margin-mask-${nanoid()}`;

        return (
            <>
                <defs>
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="20" height="20">
                        <rect width="20" height="20" fill={colors.blue[500]} fillOpacity="0.1" />
                        <line
                            x1="0"
                            y1="20"
                            x2="20"
                            y2="0"
                            stroke={colors.blue[500]}
                            strokeWidth="0.3"
                            strokeLinecap="square"
                        />
                    </pattern>
                    <mask id={maskId}>
                        <rect
                            x={-mLeft}
                            y={-mTop}
                            width={width + mLeft + mRight}
                            height={height + mTop + mBottom}
                            fill="white"
                        />
                        <rect x="0" y="0" width={width} height={height} fill="black" />
                    </mask>
                </defs>
                <rect
                    x={-mLeft}
                    y={-mTop}
                    width={width + mLeft + mRight}
                    height={height + mTop + mBottom}
                    fill={`url(#${patternId})`}
                    mask={`url(#${maskId})`}
                />

                {/* Keep existing margin labels */}
                {mTop > 0 && (
                    <text
                        x={width / 2}
                        y={-mTop / 2}
                        fill={colors.blue[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {mTop}
                    </text>
                )}
                {mBottom > 0 && (
                    <text
                        x={width / 2}
                        y={height + mBottom / 2}
                        fill={colors.blue[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {mBottom}
                    </text>
                )}
                {mLeft > 0 && (
                    <text
                        x={-mLeft / 2}
                        y={height / 2}
                        fill={colors.blue[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {mLeft}
                    </text>
                )}
                {mRight > 0 && (
                    <text
                        x={width + mRight / 2}
                        y={height / 2}
                        fill={colors.blue[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {mRight}
                    </text>
                )}
            </>
        );
    };

    const renderPadding = () => {
        if (!styles?.padding) {
            return null;
        }
        const {
            top: pTop,
            right: pRight,
            bottom: pBottom,
            left: pLeft,
        } = parseCssBoxValues(styles.padding);

        const patternId = `padding-pattern-${nanoid()}`;
        const maskId = `padding-mask-${nanoid()}`;
        const pWidth = width - pLeft - pRight;
        const pHeight = height - pTop - pBottom;

        return (
            <>
                <defs>
                    <pattern id={patternId} patternUnits="userSpaceOnUse" width="20" height="20">
                        <rect width="20" height="20" fill={colors.green[500]} fillOpacity="0.1" />
                        <line
                            x1="0"
                            y1="20"
                            x2="20"
                            y2="0"
                            stroke={colors.green[500]}
                            strokeWidth="0.3"
                            strokeLinecap="square"
                        />
                    </pattern>
                    <mask id={maskId}>
                        <rect x="0" y="0" width={width} height={height} fill="white" />
                        <rect x={pLeft} y={pTop} width={pWidth} height={pHeight} fill="black" />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    fill={`url(#${patternId})`}
                    mask={`url(#${maskId})`}
                />

                {/* Keep existing padding labels */}
                {pTop > 0 && (
                    <text
                        x={width / 2}
                        y={pTop / 2}
                        fill={colors.green[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {pTop}
                    </text>
                )}
                {pBottom > 0 && (
                    <text
                        x={width / 2}
                        y={height - pBottom / 2}
                        fill={colors.green[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {pBottom}
                    </text>
                )}
                {pLeft > 0 && (
                    <text
                        x={pLeft / 2}
                        y={height / 2}
                        fill={colors.green[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {pLeft}
                    </text>
                )}
                {pRight > 0 && (
                    <text
                        x={width - pRight / 2}
                        y={height / 2}
                        fill={colors.green[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {pRight}
                    </text>
                )}
            </>
        );
    };

    const renderDimensions = () => {
        const rectColor = isComponent ? colors.purple[500] : colors.red[500];
        const displayWidth = parseFloat(styles?.width || '0').toFixed(0);
        const displayHeight = parseFloat(styles?.height || '0').toFixed(0);
        const text = `${displayWidth} × ${displayHeight}`;

        // Constants from showDimensions
        const padding = { top: 2, bottom: 2, left: 4, right: 4 };
        const radius = 2;

        // Assuming text width is roughly 80px and height is 16px (you may want to measure this dynamically)
        const rectWidth = 80 + padding.left + padding.right;
        const rectHeight = 16 + padding.top + padding.bottom;
        const rectX = (width - rectWidth) / 2;
        const rectY = height;

        // Path for rounded rectangle
        const path =
            rectWidth > width
                ? `M${rectX + radius},${rectY} q-${radius},0 -${radius},${radius} v${rectHeight - 2 * radius} q0,${radius} ${radius},${radius} h${rectWidth - 2 * radius} q${radius},0 ${radius},-${radius} v-${rectHeight - 2 * radius} q0,-${radius} -${radius},-${radius} z`
                : `M${rectX},${rectY} v${rectHeight - radius} q0,${radius} ${radius},${radius} h${rectWidth - 2 * radius} q${radius},0 ${radius},-${radius} v-${rectHeight - radius} z`;

        return (
            <g>
                <path d={path} fill={rectColor} />
                <text
                    x={width / 2}
                    y={rectY + rectHeight / 2}
                    fill="white"
                    fontSize="12"
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {text}
                </text>
            </g>
        );
    };

    return (
        <BaseRect
            width={width}
            height={height}
            top={top}
            left={left}
            isComponent={isComponent}
            strokeWidth={2}
        >
            {renderMargin()}
            {renderPadding()}
            {renderDimensions()}
            {/* <ResizeHandles width={width} height={height} isComponent={isComponent} /> */}
        </BaseRect>
    );
};
