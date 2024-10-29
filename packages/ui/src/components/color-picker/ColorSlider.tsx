import { clamp } from 'lodash';
import type React from 'react';
import styled from '@emotion/styled';
import { usePointerStroke } from '../../hooks/use-pointer-stroke';
import { checkPattern } from './checkPattern';

export const ColorHandle = styled.div`
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.2);
    display: grid;
    place-items: center;
    pointer-events: none;
    &::before {
        content: '';
        background-color: currentColor;
        width: 50%;
        height: 50%;
        border-radius: 50%;
    }
`;

const ColorSliderWrap = styled.div`
    display: grid;
    place-items: center;
    position: relative;
    z-index: 0; /* Create stacking context */
`;
const ColorSliderBar = styled.div`
    position: relative;
    overflow: hidden;
    cursor: pointer;
    &::before {
        content: '';

        z-index: -1;

        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;

        ${checkPattern('white', '#aaa', '8px')}
    }
`;
const ColorSliderGradient = styled.div`
    z-index: -1;
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
`;

export function createGradient(
    direction: 'right' | 'top',
    length: number,
    handleSize: number,
    colors: [string, number][],
): string {
    const offset = handleSize / 2 / length;
    const gradientLength = (length - handleSize) / length;

    const stops = colors.map(
        ([color, pos]) => `${color} ${(pos * gradientLength + offset) * 100}%`,
    );

    return `linear-gradient(${direction === 'right' ? 'to right' : 'to top'}, ${stops.join(',')})`;
}

export const ColorSlider: React.FC<{
    direction: 'right' | 'top';
    length: number;
    handleSize: number;
    railWidth: number;
    value: number;
    color: string;
    colorStops: string[];
    onChangeEnd?: (value: number) => void;
    onChange?: (value: number) => void;
    onMouseDown?: (value: number) => void;
}> = ({
    direction,
    length,
    handleSize,
    railWidth,
    color,
    colorStops,
    value,
    onChangeEnd,
    onChange,
    onMouseDown,
}) => {
    const gradient = createGradient(
        direction,
        length,
        handleSize,
        colorStops.map((stop, i) => [stop, i / (colorStops.length - 1)]),
    );
    const range = length - handleSize;

    const pointerProps = usePointerStroke<HTMLElement>({
        onBegin: (e) => {
            onMouseDown?.(valueAtEvent(e));
        },
        onMove: (e) => {
            onChange?.(valueAtEvent(e));
        },
        onEnd: (e) => {
            onChangeEnd?.(valueAtEvent(e));
        },
    });

    const valueAtEvent = (e: React.MouseEvent<HTMLElement>) => {
        // TODO: Fix value is wrong when CSS transform is applied
        const rect = e.currentTarget.getBoundingClientRect();
        let value;
        if (direction === 'right') {
            const offset = e.clientX - rect.left - handleSize / 2;
            value = clamp(offset / range, 0, 1);
        } else {
            const offset = e.clientY - rect.top - handleSize / 2;
            value = clamp(1 - offset / range, 0, 1);
        }

        return value;
    };

    return (
        <ColorSliderWrap
            tabIndex={0}
            style={
                direction === 'right'
                    ? { width: `${length}px`, height: `${handleSize}px` }
                    : { height: `${length}px`, width: `${handleSize}px` }
            }
            {...pointerProps}
        >
            <ColorSliderBar
                style={{
                    borderRadius: `${railWidth / 2}px`,
                    ...(direction === 'right'
                        ? {
                              width: length,
                              height: railWidth,
                          }
                        : {
                              height: length,
                              width: railWidth,
                          }),
                }}
            >
                <ColorSliderGradient
                    style={{
                        background: gradient,
                    }}
                />
            </ColorSliderBar>
            <ColorHandle
                style={{
                    position: 'absolute',
                    width: `${handleSize}px`,
                    height: `${handleSize}px`,
                    color: color,
                    ...(direction === 'right'
                        ? {
                              left: `${range * value}px`,
                              top: 0,
                          }
                        : {
                              left: 0,
                              top: `${range * (1 - value)}px`,
                          }),
                }}
            />
        </ColorSliderWrap>
    );
};
