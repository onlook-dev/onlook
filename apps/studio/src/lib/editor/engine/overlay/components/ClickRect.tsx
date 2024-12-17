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
            <pattern
                id={patternId}
                width="8"
                height="8"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
            >
                <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="8"
                    stroke={color}
                    strokeWidth="2"
                    strokeOpacity="0.2"
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
                />
            </>
        );
    };

    const renderDimensions = () => {
        return (
            <g>
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
