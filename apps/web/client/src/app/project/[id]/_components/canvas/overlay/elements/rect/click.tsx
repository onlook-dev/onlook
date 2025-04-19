import { adaptValueToCanvas } from '@/components/store/editor/engine/overlay/utils';
import type { RectDimensions } from '@onlook/models/element';
import { colors } from '@onlook/ui/tokens';
import { nanoid } from 'nanoid';
import { BaseRect } from './base';
import { ResizeHandles } from './resize';

const parseCssBoxValues = (
    value: string,
): {
    adjusted: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
    original: {
        top: number;
        right: number;
        bottom: number;
        left: number;
    };
} => {
    const originalValues = value.split(' ').map((v) => parseInt(v));
    const adjustedValues = originalValues.map((v) => Math.round(adaptValueToCanvas(v)));

    let original = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    };
    let adjusted = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
    };

    switch (originalValues.length) {
        case 1:
            original = {
                top: originalValues[0] ?? 0,
                right: originalValues[0] ?? 0,
                bottom: originalValues[0] ?? 0,
                left: originalValues[0] ?? 0,
            };
            adjusted = {
                top: adjustedValues[0] ?? 0,
                right: adjustedValues[0] ?? 0,
                bottom: adjustedValues[0] ?? 0,
                left: adjustedValues[0] ?? 0,
            };
            break;
        case 2:
            original = {
                top: originalValues[0] ?? 0,
                right: originalValues[1] ?? 0,
                bottom: originalValues[0] ?? 0,
                left: originalValues[1] ?? 0,
            };
            adjusted = {
                top: adjustedValues[0] ?? 0,
                right: adjustedValues[1] ?? 0,
                bottom: adjustedValues[0] ?? 0,
                left: adjustedValues[1] ?? 0,
            };
            break;
        case 4:
            original = {
                top: originalValues[0] ?? 0,
                right: originalValues[1] ?? 0,
                bottom: originalValues[2] ?? 0,
                left: originalValues[3] ?? 0,
            };
            adjusted = {
                top: adjustedValues[0] ?? 0,
                right: adjustedValues[1] ?? 0,
                bottom: adjustedValues[2] ?? 0,
                left: adjustedValues[3] ?? 0,
            };
            break;
        default:
            original = { top: 0, right: 0, bottom: 0, left: 0 };
            adjusted = { top: 0, right: 0, bottom: 0, left: 0 };
            break;
    }
    return { adjusted, original };
};

interface ClickRectProps extends RectDimensions {
    isComponent?: boolean;
    styles: Record<string, string>;
    shouldShowResizeHandles: boolean;
}

export const ClickRect = ({
    width,
    height,
    top,
    left,
    isComponent,
    styles,
    shouldShowResizeHandles,
}: ClickRectProps) => {
    const renderMarginLabels = () => {
        if (!styles?.margin) {
            return null;
        }
        const { adjusted, original } = parseCssBoxValues(styles.margin);

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
                            x={-adjusted.left}
                            y={-adjusted.top}
                            width={width + adjusted.left + adjusted.right}
                            height={height + adjusted.top + adjusted.bottom}
                            fill="white"
                        />
                        <rect x="0" y="0" width={width} height={height} fill="black" />
                    </mask>
                </defs>
                <rect
                    x={-adjusted.left}
                    y={-adjusted.top}
                    width={width + adjusted.left + adjusted.right}
                    height={height + adjusted.top + adjusted.bottom}
                    fill={`url(#${patternId})`}
                    mask={`url(#${maskId})`}
                />

                {/* Keep existing margin labels */}
                {original.top > 0 && (
                    <text
                        x={width / 2}
                        y={-adjusted.top / 2}
                        fill={colors.blue[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {original.top}
                    </text>
                )}
                {original.bottom > 0 && (
                    <text
                        x={width / 2}
                        y={height + adjusted.bottom / 2}
                        fill={colors.blue[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {original.bottom}
                    </text>
                )}
                {original.left > 0 && (
                    <text
                        x={-adjusted.left / 2}
                        y={height / 2}
                        fill={colors.blue[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {original.left}
                    </text>
                )}
                {original.right > 0 && (
                    <text
                        x={width + adjusted.right / 2}
                        y={height / 2}
                        fill={colors.blue[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {original.right}
                    </text>
                )}
            </>
        );
    };

    const renderPaddingLabels = () => {
        if (!styles?.padding) {
            return null;
        }
        const { adjusted, original } = parseCssBoxValues(styles.padding);

        const patternId = `padding-pattern-${nanoid()}`;
        const maskId = `padding-mask-${nanoid()}`;
        const pWidth = width - adjusted.left - adjusted.right;
        const pHeight = height - adjusted.top - adjusted.bottom;

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
                        <rect
                            x={adjusted.left}
                            y={adjusted.top}
                            width={pWidth}
                            height={pHeight}
                            fill="black"
                        />
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
                {original.top > 0 && (
                    <text
                        x={width / 2}
                        y={adjusted.top / 2}
                        fill={colors.green[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {original.top}
                    </text>
                )}
                {original.bottom > 0 && (
                    <text
                        x={width / 2}
                        y={height - adjusted.bottom / 2}
                        fill={colors.green[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {original.bottom}
                    </text>
                )}
                {original.left > 0 && (
                    <text
                        x={adjusted.left / 2}
                        y={height / 2}
                        fill={colors.green[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {original.left}
                    </text>
                )}
                {original.right > 0 && (
                    <text
                        x={width - adjusted.right / 2}
                        y={height / 2}
                        fill={colors.green[700]}
                        fontSize="10"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {original.right}
                    </text>
                )}
            </>
        );
    };

    const renderDimensionLabels = () => {
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
            {renderMarginLabels()}
            {renderPaddingLabels()}
            {shouldShowResizeHandles && (
                <ResizeHandles
                    width={width}
                    height={height}
                    left={left}
                    top={top}
                    borderRadius={parseInt(styles?.['borderRadius'] || '0')}
                    isComponent={isComponent}
                    styles={styles}
                />
            )}
        </BaseRect>
    );
};
