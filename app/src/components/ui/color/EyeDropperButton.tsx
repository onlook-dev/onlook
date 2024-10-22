'use client';

import { useCallback, useMemo } from 'react';
import useEyeDropper from 'use-eye-dropper';
import { Button } from '../button';
import { DrawingPinIcon } from '@radix-ui/react-icons';
import { Color } from '/common/color';

type EyeDropperButtonProps = React.ComponentProps<'button'> & {
    onColorSelect?: (color: Color) => void;
};

export const useIsEyeDropperSupported = () => {
    const { isSupported } = useEyeDropper();
    const isSupportedFlag = useMemo(() => isSupported(), [isSupported]);
    return isSupportedFlag;
};

export const EyeDropperButton = ({ onColorSelect, disabled }: EyeDropperButtonProps) => {
    const { open, isSupported } = useEyeDropper();

    const pickColor = useCallback(() => {
        const openPicker = async () => {
            try {
                const result = await open();
                const color = Color.from(result.sRGBHex);
                onColorSelect?.(color);
            } catch (e: any) {
                console.error('Error while opening color picker: ', e);
            }
        };
        openPicker();
    }, [open, onColorSelect]);

    return (
        <Button
            variant="ghost"
            size="icon"
            disabled={!isSupported() || disabled}
            onClick={pickColor}
        >
            <DrawingPinIcon className="w-4 h-4" />
        </Button>
    );
};

export default EyeDropperButton;
