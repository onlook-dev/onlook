import { cn } from '../utils';
import { useEffect, useState } from 'react';

type TColorProp = string | string[];

interface ShineBorderProps {
    borderRadius?: number;
    borderWidth?: number;
    duration?: number;
    color?: TColorProp;
    className?: string;
    children: React.ReactNode;
    autoShine?: boolean;
}

/**
 * @name Shine Border
 * @description It is an animated background border effect component with easy to use and configurable props.
 * @param borderRadius defines the radius of the border.
 * @param borderWidth defines the width of the border.
 * @param duration defines the animation duration to be applied on the shining border
 * @param color a string or string array to define border color.
 * @param className defines the class name to be applied to the component
 * @param children contains react node elements.
 */
export function ShineBorder({
    borderRadius = 8,
    borderWidth = 1,
    duration = 14,
    color = '#000000',
    className,
    children,
    autoShine = false,
}: ShineBorderProps) {
    const [isShining, setIsShining] = useState(false);

    useEffect(() => {
        if (autoShine) {
            // Small delay before starting the shine effect
            const timer = setTimeout(() => {
                setIsShining(true);
            }, 100);
            return () => clearTimeout(timer);
        }
        setIsShining(false);
    }, [autoShine]);

    return (
        <div
            style={
                {
                    '--border-radius': `${borderRadius}px`,
                } as React.CSSProperties
            }
            className={cn(
                'min-h-[60px] w-fit min-w-[300px] place-items-center rounded-(--border-radius) bg-white p-3 text-black dark:bg-black dark:text-white',
                className,
            )}
        >
            <div
                style={
                    {
                        '--border-width': `${borderWidth}px`,
                        '--border-radius': `${borderRadius}px`,
                        '--duration': `${duration}s`,
                        '--mask-linear-gradient': `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
                        '--background-radial-gradient': `radial-gradient(transparent,transparent, ${color instanceof Array ? color.join(',') : color},transparent,transparent)`,
                    } as React.CSSProperties
                }
                className={cn(
                    `before:bg-shine-size before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-(--border-radius) before:p-(--border-width) before:will-change-[background-position] before:content-[""] before:[-webkit-mask-composite:xor]! before:[mask-composite:exclude]! before:[background-image:var(--background-radial-gradient)] before:[background-size:300%_300%] before:[mask:var(--mask-linear-gradient)] before:opacity-0 before:transition-opacity before:duration-1000 motion-safe:before:animate-shine`,
                    isShining && 'before:opacity-100',
                )}
            ></div>
            {children}
        </div>
    );
}
