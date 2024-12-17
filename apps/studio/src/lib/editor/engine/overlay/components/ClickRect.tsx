import React from 'react';
import { nanoid } from 'nanoid';
import { colors } from '@onlook/ui/tokens';
import { BaseRect } from './BaseRect';
import type { RectDimensions } from './BaseRect';

interface ClickRectProps extends RectDimensions {
    isComponent?: boolean;
    margin?: string;
    padding?: string;
}

const createStripePattern = (color: string) => {
    const patternId = `stripe-${nanoid()}`;
    return (
        <defs>
            <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill={color} fillOpacity="0.1" />
                <line
                    x1="0"
                    y1="20"
                    x2="20"
                    y2="0"
                    stroke={color}
                    strokeWidth="0.3"
                    strokeLinecap="square"
                />
            </pattern>
        </defs>
    );
};

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
    margin,
    padding,
}) => {
    const renderMargin = () => {
        if (!margin) {
            return null;
        }
        const {
            top: mTop,
            right: mRight,
            bottom: mBottom,
            left: mLeft,
        } = parseCssBoxValues(margin);
        const patternId = `margin-${nanoid()}`;

        return (
            <>
                {createStripePattern(colors.blue[500])}
                <mask id={`mask-${patternId}`}>
                    <rect x="0" y="0" width={width} height={height} fill="white" />
                    <rect
                        x={mLeft}
                        y={mTop}
                        width={width - mLeft - mRight}
                        height={height - mTop - mBottom}
                        fill="black"
                    />
                </mask>
                <rect
                    x="0"
                    y="0"
                    width={width}
                    height={height}
                    fill={`url(#stripe-${patternId})`}
                    fillOpacity="1"
                    mask={`url(#mask-${patternId})`}
                />
            </>
        );
    };

    const renderPadding = () => {
        if (!padding) {
            return null;
        }
        const {
            top: pTop,
            right: pRight,
            bottom: pBottom,
            left: pLeft,
        } = parseCssBoxValues(padding);
        const patternId = `padding-${nanoid()}`;

        return (
            <>
                {createStripePattern(colors.green[500])}
                <rect
                    x={pLeft}
                    y={pTop}
                    width={width - pLeft - pRight}
                    height={height - pTop - pBottom}
                    fill={`url(#stripe-${patternId})`}
                    fillOpacity="1"
                    mask={`url(#mask-${patternId})`}
                />
            </>
        );
    };

    const renderDimensions = () => {
        const rectColor = isComponent ? colors.purple[500] : colors.red[500];
        return (
            <g>
                <rect
                    x={width / 2 - 30}
                    y={height + 10}
                    width="60"
                    height="20"
                    fill={rectColor}
                    rx="4"
                />
                <text
                    x={width / 2}
                    y={height + 20}
                    fill="white"
                    fontSize="12"
                    textAnchor="middle"
                    dominantBaseline="middle"
                >
                    {`${Math.round(width)} × ${Math.round(height)}`}
                </text>
            </g>
        );
    };

    return (
        <BaseRect width={width} height={height} top={top} left={left} isComponent={isComponent}>
            {renderMargin()}
            {renderPadding()}
            {renderDimensions()}
        </BaseRect>
    );
};
