import React, { useState } from 'react';
import { ColorSlider } from './ColorSlider';
import { SVPicker } from './SVPicker';
import tw from 'tailwind-styled-components';
import { twMerge } from 'tailwind-merge';
import { Color } from '/common/color';
import { mod } from '/common/helpers/math';
import { DraftableInput } from './input';
import styled from '@emotion/styled';
import { checkPattern } from './checkPattern';

const InputColumn: React.FC<JSX.IntrinsicElements['div']> = tw.div`
  flex flex-col items-center gap-1 min-w-0
`;

const Input = tw(DraftableInput)`
  outline-0 w-full h-6 bg-background-onlook/70 rounded focus:ring-1 ring-inset ring-foreground-active text-foreground-onlook placeholder:text-foreground-disabled text-center
`;

const InputLabel = tw.label`
  text-xs text-foreground
`;

type SliderMode = 'rgb' | 'hsv';

const InputsRow = ({
    color,
    onChangeEnd,
    onChange,
}: {
    color: Color;
    onChangeEnd?: (color: Color) => void;
    onChange?: (color: Color) => void;
}) => {
    const [mode, setMode] = useState<SliderMode>('hsv');

    const rgbColor = color.rgb;

    return (
        <div className="z-50 grid grid-cols-[64px_1fr_1fr_1fr_1fr] gap-1">
            <div className="flex flex-col items-center justify-center gap-1 min-w-0 ">
                <label
                    className="text-xs text-foreground cursor-pointer hover:text-teal-400"
                    onClick={() => (mode === 'hsv' ? setMode('rgb') : setMode('hsv'))}
                >
                    {mode.toUpperCase()}
                </label>
            </div>
            {mode === 'hsv' ? (
                <>
                    <InputColumn>
                        <Input
                            value={Math.round(color.h * 360).toString()}
                            onChangeValue={(hString) => {
                                const h = mod(Number.parseInt(hString) / 360, 1);
                                const newColor = new Color({ ...color, h });
                                onChangeEnd?.(newColor);
                                onChange?.(newColor);
                                return true;
                            }}
                        />
                        <InputLabel onClick={() => setMode('rgb')}>H</InputLabel>
                    </InputColumn>
                    {(['s', 'v'] as const).map((key) => {
                        return (
                            <InputColumn key={key}>
                                <Input
                                    value={Math.round(color[key] * 100).toString()}
                                    onChangeValue={(valueString) => {
                                        const value = mod(Number.parseInt(valueString) / 100, 1);
                                        const newColor = new Color({ ...color, [key]: value });
                                        onChangeEnd?.(newColor);
                                        onChange?.(newColor);
                                        return true;
                                    }}
                                />
                                <InputLabel onClick={() => setMode('rgb')}>
                                    {key.toUpperCase()}
                                </InputLabel>
                            </InputColumn>
                        );
                    })}
                </>
            ) : (
                <>
                    {(['r', 'g', 'b'] as const).map((key) => {
                        return (
                            <InputColumn key={key}>
                                <Input
                                    value={Math.round(rgbColor[key] * 255).toString()}
                                    onChangeValue={(valueString) => {
                                        const value = mod(Number.parseInt(valueString) / 255, 1);
                                        const newColor = Color.rgb({
                                            ...rgbColor,
                                            [key]: value,
                                        });
                                        onChangeEnd?.(newColor);
                                        onChange?.(newColor);
                                        return true;
                                    }}
                                />
                                <InputLabel onClick={() => setMode('hsv')}>
                                    {key.toUpperCase()}
                                </InputLabel>
                            </InputColumn>
                        );
                    })}
                </>
            )}

            <InputColumn>
                <Input
                    value={Math.round(color.a * 100).toString()}
                    onChangeValue={(aString) => {
                        const a = mod(Number.parseInt(aString) / 100, 1);
                        const newColor = new Color({ ...color, a });
                        onChangeEnd?.(newColor);
                        onChange?.(newColor);
                        return true;
                    }}
                />
                <InputLabel onClick={() => setMode(mode === 'rgb' ? 'hsv' : 'rgb')}>A</InputLabel>
            </InputColumn>
        </div>
    );
};

const ColorBox = styled.div`
    position: relative;
    overflow: hidden;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    box-shadow: 0 0 0 1px inset rgba(0, 0, 0, 0.15);
    background-color: currentColor;

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

export const ColorPicker: React.FC<{
    color: Color;
    onChangeEnd?: (color: Color) => void;
    onChange?: (color: Color) => void;
    onMouseDown?: (color: Color) => void;
    className?: string;
}> = ({ color, onChangeEnd, onChange, onMouseDown, className }) => {
    const opaqueColor = new Color({ ...color, a: 1 });

    return (
        <div className={twMerge('w-[232px] flex flex-col gap-3 p-3', className)}>
            <SVPicker
                width={208}
                height={160}
                handleSize={12}
                color={opaqueColor}
                onChangeEnd={(opaqueColor) => {
                    onChangeEnd?.(new Color({ ...opaqueColor, a: color.a }));
                }}
                onChange={(opaqueColor) => {
                    onChange?.(new Color({ ...opaqueColor, a: color.a }));
                }}
                onMouseDown={(opaqueColor) => {
                    onMouseDown?.(new Color({ ...opaqueColor, a: color.a }));
                }}
            />
            <div className="z-50 flex justify-between items-center">
                <div className="flex flex-col gap-1">
                    <ColorSlider
                        direction="right"
                        length={160}
                        handleSize={12}
                        railWidth={8}
                        color={new Color({ h: color.h, s: 1, v: 1 }).toHex()}
                        colorStops={[
                            '#FF0000',
                            '#FFFF00',
                            '#00FF00',
                            '#00FFFF',
                            '#0000FF',
                            '#FF00FF',
                            '#FF0000',
                        ]}
                        value={color.h}
                        onChangeEnd={(h) => {
                            onChangeEnd?.(new Color({ ...color, h }));
                        }}
                        onChange={(h) => {
                            onChange?.(new Color({ ...color, h }));
                        }}
                        onMouseDown={(h) => {
                            onMouseDown?.(new Color({ ...color, h }));
                        }}
                    />
                    <ColorSlider
                        direction="right"
                        length={160}
                        handleSize={12}
                        railWidth={8}
                        color={opaqueColor.toHex()}
                        colorStops={[
                            new Color({ ...color, a: 0 }).toHex(),
                            new Color({ ...color, a: 1 }).toHex(),
                        ]}
                        value={color.a}
                        onChangeEnd={(a) => {
                            onChangeEnd?.(new Color({ ...color, a }));
                        }}
                        onChange={(a) => {
                            onChange?.(new Color({ ...color, a }));
                        }}
                        onMouseDown={(a) => {
                            onMouseDown?.(new Color({ ...color, a }));
                        }}
                    />
                </div>
                <ColorBox style={{ color: color.toHex() }} />
            </div>
            <InputsRow color={color} onChange={onChange} onChangeEnd={onChangeEnd} />
        </div>
    );
};
