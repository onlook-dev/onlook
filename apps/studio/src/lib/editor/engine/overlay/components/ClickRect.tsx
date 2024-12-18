import { colors } from '@onlook/ui/tokens';
import { nanoid } from 'nanoid';
import React from 'react';
import type { RectDimensions } from './BaseRect';
import { BaseRect } from './BaseRect';

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
        const marginFill = colors.blue[500];
        const marginFillOpacity = 0.1;
        const marginText = colors.blue[700];

        return (
            <>
                {/* Margin areas with semi-transparent fills */}
                <rect
                    x={-mLeft}
                    y={-mTop}
                    width={mLeft}
                    height={height + mTop + mBottom}
                    fill={marginFill}
                    fillOpacity={marginFillOpacity}
                />
                <rect
                    x={width}
                    y={-mTop}
                    width={mRight}
                    height={height + mTop + mBottom}
                    fill={marginFill}
                    fillOpacity={marginFillOpacity}
                />
                <rect
                    x={0}
                    y={-mTop}
                    width={width}
                    height={mTop}
                    fill={marginFill}
                    fillOpacity={marginFillOpacity}
                />
                <rect
                    x={0}
                    y={height}
                    width={width}
                    height={mBottom}
                    fill={marginFill}
                    fillOpacity={marginFillOpacity}
                />

                {/* Margin labels */}
                {mTop > 0 && (
                    <text
                        x={width / 2}
                        y={-mTop / 2}
                        fill={marginText}
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
                        fill={marginText}
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
                        fill={marginText}
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
                        fill={marginText}
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
        if (!padding) {
            return null;
        }
        const {
            top: pTop,
            right: pRight,
            bottom: pBottom,
            left: pLeft,
        } = parseCssBoxValues(padding);

        const paddingFill = colors.green[500];
        const paddingText = colors.green[700];
        const paddingFillOpacity = 0.1;
        return (
            <>
                {/* Padding areas with semi-transparent fills */}
                <rect
                    x={0}
                    y={0}
                    width={pLeft}
                    height={height}
                    fill={paddingFill}
                    fillOpacity={paddingFillOpacity}
                />
                <rect
                    x={width - pRight}
                    y={0}
                    width={pRight}
                    height={height}
                    fill={paddingFill}
                    fillOpacity={paddingFillOpacity}
                />
                <rect
                    x={pLeft}
                    y={0}
                    width={width - pLeft - pRight}
                    height={pTop}
                    fill={paddingFill}
                    fillOpacity={paddingFillOpacity}
                />
                <rect
                    x={pLeft}
                    y={height - pBottom}
                    width={width - pLeft - pRight}
                    height={pBottom}
                    fill={paddingFill}
                    fillOpacity={paddingFillOpacity}
                />

                {pTop > 0 && (
                    <text
                        x={width / 2}
                        y={pTop / 2}
                        fill={paddingText}
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
                        fill={paddingText}
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
                        fill={paddingText}
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
                        fill={paddingText}
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
        return (
            <g>
                <rect
                    x={width / 2 - 30}
                    y={height}
                    width="60"
                    height="20"
                    fill={rectColor}
                    rx="4"
                />
                <text
                    x={width / 2}
                    y={height + 10}
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
