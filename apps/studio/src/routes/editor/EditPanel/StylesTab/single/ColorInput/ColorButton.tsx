import styled from '@emotion/styled';
import { checkPattern } from '@onlook/ui/color-picker';
import { Color, isColorEmpty } from '@onlook/utility';
import { twMerge } from 'tailwind-merge';

const ColorButtonBackground = styled.div`
    ${checkPattern('white', '#aaa', '8px')}
`;

const ColorButton: React.FC<
    {
        value?: Color;
        backgroundImage?: string;
    } & React.PropsWithoutRef<JSX.IntrinsicElements['div']>
> = ({ className, value, backgroundImage, ...props }) => {
    const imageStyle = {
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
    };
    return (
        <div
            {...props}
            className={twMerge(
                'rounded-sm w-5 h-5 border border-white/20 cursor-pointer shadow bg-background',
                className,
            )}
        >
            {isColorEmpty(value?.toHex() ?? 'transparent') ? (
                <div
                    className="w-full h-full rounded-sm overflow-hidden bg-background-secondary"
                    style={imageStyle}
                ></div>
            ) : (
                <ColorButtonBackground className="w-full h-full rounded-sm overflow-hidden">
                    <div
                        className="w-full h-full rounded-[1.5px]"
                        style={{
                            backgroundColor: value?.toHex() ?? 'transparent',
                            ...imageStyle,
                        }}
                    />
                </ColorButtonBackground>
            )}
        </div>
    );
};

export default ColorButton;
